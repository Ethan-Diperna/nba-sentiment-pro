# NBA Sentiment Pro — Architecture

## Overview

Three-layer architecture: Data Collection → ML Inference → Web Presentation

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│          (Vite + TypeScript, Recharts, Tailwind)             │
└────────────────────────┬────────────────────────────────────┘
                         │ REST JSON  GET /player/{name}
┌────────────────────────▼────────────────────────────────────┐
│                    FastAPI Backend                            │
│   Routes → SentimentService → SentimentEngine → Database     │
└──────┬────────────────────────────────────┬─────────────────┘
       │ PRAW (Reddit API)                  │ SQLAlchemy
┌──────▼──────────┐                ┌────────▼────────┐
│  Reddit Collector│                │  SQLite Database │
│  (r/nba, r/NBA) │                │  (sentiment.db)  │
└─────────────────┘                └─────────────────┘
```

## Component Map

### Backend (FastAPI)

- `backend/collectors/` — Reddit data collection via PRAW; falls back to cached JSON when the API is unavailable or rate-limited
- `backend/utils/text_utils.py` — NBA slang dictionary, sarcasm detection heuristics, URL stripping, and text normalization
- `backend/ml/sentiment_engine.py` — DistilBERT inference pipeline with VADER as a fallback when PyTorch is not installed
- `backend/services/sentiment_service.py` — Orchestrates collection → cleaning → inference → upvote weighting → persistence
- `backend/database/` — SQLAlchemy ORM models and session management; SQLite by default, swappable to Postgres
- `backend/api/routes.py` — REST endpoints: `/health`, `/model-info`, `/player/{name}`, `/player/{name}/history`

### Frontend (React + TypeScript)

- `src/pages/HomePage.tsx` — Main application shell; manages search state and routing
- `src/components/player/` — Player search input and sentiment dashboard container
- `src/components/charts/` — Recharts-based sentiment history line chart
- `src/components/ui/` — Score gauge (0–100 arc), sentiment percentage bar, top comment cards
- `src/lib/api.ts` — Typed API client wrapping `fetch` with error handling and response types

### Training Pipeline

- `training/scripts/dataset_loader.py` — Loads and preprocesses the TweetEval sentiment dataset for NBA fine-tuning
- `training/scripts/train.py` — Fine-tunes `distilbert-base-uncased` on the combined TweetEval + manual NBA labels dataset
- `training/evaluation/evaluate.py` — Evaluates the fine-tuned checkpoint against the VADER baseline on a held-out test set; outputs accuracy, F1, and confusion matrix
- `training/datasets/nba_manual_labels.csv` — 50 manually labeled NBA Reddit comments used to augment training data with domain-specific examples

## Data Flow

1. User types a player name in the React frontend search box
2. Frontend calls `GET /player/{name}` to the FastAPI backend
3. FastAPI calls `SentimentService.get_player_sentiment(name)`
4. `RedditCollector` fetches the top 100 comments from r/nba mentioning the player via PRAW
5. Comments are filtered by `comment_mentions_player()` and cleaned by `clean_text()`
6. `SentimentEngine` runs each comment through the DistilBERT inference pipeline (or VADER fallback)
7. `adjust_for_slang()` applies NBA-specific term corrections (e.g. "goat" → +0.3, "washed" → −0.3)
8. Upvote-weighted average across all comments produces a raw compound score in [−1, 1]
9. Score is mapped to [0, 100] and stored in SQLite with a timestamp via SQLAlchemy
10. Result JSON is returned to the frontend and rendered in the dashboard

## Sentiment Scoring Formula

```
weight_i      = 1 + log(1 + max(0, upvotes_i))
weighted_avg  = Σ(compound_i × weight_i) / Σ(weight_i)
final_score   = (weighted_avg + 1) × 50        # maps [−1, 1] → [0, 100]
```

Upvote weighting gives community-validated comments more influence than low-engagement or controversial ones. Log scaling prevents viral comments from dominating entirely.

## Model Hierarchy

The engine selects the best available model at startup:

1. **Fine-tuned checkpoint** (`training/checkpoints/distilbert-nba-sentiment/`) — highest accuracy, requires completing the training pipeline
2. **`distilbert-base-uncased-finetuned-sst-2-english`** — HuggingFace pretrained SST-2 model; good general sentiment, no local training needed
3. **VADER** (`vaderSentiment`) — rule-based fallback; always available, no GPU or model download required

## Deployment

- **Development**: `uvicorn backend.main:app --reload` (API) + `npm run dev` (frontend, port 5173)
- **Production (Docker)**: single container serving FastAPI on port 8000 with React static files mounted at `/static`
- **Production (nginx)**: nginx reverse proxy handles static asset caching and proxies `/api/` to the FastAPI container

## Database Schema

```
table: sentiment_results
  id            INTEGER PRIMARY KEY
  player_name   TEXT NOT NULL
  score         REAL NOT NULL          -- 0 to 100
  positive_pct  REAL
  neutral_pct   REAL
  negative_pct  REAL
  comment_count INTEGER
  label         TEXT                   -- "positive" | "neutral" | "negative"
  created_at    DATETIME DEFAULT NOW()
```
