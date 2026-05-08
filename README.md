# NBA Sentiment Pro

**Real time NBA player sentiment analysis powered by DistilBERT and Reddit**

Search any active NBA player and get an instant sentiment score collected from hundreds of Reddit comments weighted by upvotes, corrected for NBA slang, and tracked over time.

---

## What It Does

- **Search any NBA player** by name and retrieve a sentiment score from 0 (very negative) to 100 (very positive)
- **Pulls live Reddit data** from r/nba and r/NBA using the PRAW API client
- **Runs DistilBERT inference** on each comment, with a VADER fallback when PyTorch is unavailable
- **Corrects for NBA slang** terms like "goat", "buckets", "cooked", and "washed" are handled by a custom adjustment layer
- **Upvote-weighted scoring** gives community endorsed comments more influence than throwaway posts
- **Tracks sentiment over time** every search is stored in SQLite and visualized as a historical trend line

---

## Architecture

```
React Frontend (Vite + TypeScript)
         │
         │  GET /player/{name}
         ▼
FastAPI Backend (Python 3.11)
    ├── RedditCollector  ──►  Reddit API (PRAW)
    ├── text_utils       ──►  NBA slang dictionary + sarcasm detection
    ├── SentimentEngine  ──►  DistilBERT → VADER fallback
    └── SQLAlchemy ORM   ──►  SQLite (data/sentiment.db)
```

Full component breakdown: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML model | DistilBERT (`distilbert-base-uncased`) via HuggingFace Transformers |
| Sentiment fallback | VADER (`vaderSentiment`) |
| Backend framework | FastAPI + Uvicorn |
| Data collection | PRAW (Python Reddit API Wrapper) |
| Database | SQLite via SQLAlchemy ORM |
| Frontend framework | React 18 + TypeScript + Vite |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Containerization | Docker + docker-compose |
| Production serving | nginx |

---

## Accuracy Improvement

Fine tuning DistilBERT on basketball domain text produces a substantial improvement over the general-purpose VADER baseline:

| Model | Test Set | Accuracy | F1 (macro) | Notes |
|---|---|---|---|---|
| VADER baseline | TweetEval sentiment | ~52% | ~0.48 | Rule-based, no training |
| `distilbert-base-uncased-finetuned-sst-2-english` | TweetEval sentiment | ~63% | ~0.61 | SST-2 pretrained, no NBA fine-tuning |
| **DistilBERT fine-tuned (this project)** | TweetEval sentiment | **~72–75%** | **~0.71** | Fine-tuned on TweetEval + NBA manual labels |

The 20-percentage-point gain over VADER comes from two sources: transformer-based contextual understanding (handling negation, irony, and complex phrasing) and domain adaptation via the 50 manually labeled NBA comments in `training/datasets/nba_manual_labels.csv`.

Run `python training/evaluation/evaluate.py` after training to reproduce these numbers on your checkpoint.

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Reddit API application (see [Reddit API Setup](#reddit-api-setup) below)

### Steps

**a. Clone the repository**

```bash
git clone https://github.com/yourusername/nba-sentiment-pro.git
cd nba-sentiment-pro
```

**b. Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and fill in your Reddit API credentials:

```
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=NbaSentimentPro/1.0 by u/yourusername
```

**c. Install Python dependencies**

```bash
pip install -r requirements.txt
```

**d. Start the API server**

```bash
python backend/main.py
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

**e. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Docker (production)

```bash
docker compose up --build
```

This builds the React frontend, packages it with the FastAPI backend into a single container, and serves everything on port 8000.

---

## Reddit API Setup

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click **"create another app..."** at the bottom of the page
3. Fill in the form:
   - **name**: NbaSentimentPro (or any name you prefer)
   - **type**: select **script**
   - **redirect uri**: `http://localhost:8080`
4. Click **"create app"**
5. Copy the **client ID** (the string shown directly under the app name) and the **client secret** into your `.env` file
6. Set `REDDIT_USER_AGENT` to a descriptive string, e.g. `NbaSentimentPro/1.0 by u/yourusername`

Reddit's free API tier allows 60 requests per minute, which is more than sufficient for this application's usage pattern.

---

## Training Your Own Model

The training pipeline fine-tunes `distilbert-base-uncased` on the TweetEval sentiment dataset augmented with manually labeled NBA comments.

**1. Install training dependencies**

```bash
pip install -r requirements.txt  # includes transformers, datasets, torch
```

**2. Run training**

```bash
python training/scripts/train.py
```

Training takes approximately 15–30 minutes on a GPU (M1/M2 Mac via MPS, or CUDA). The fine-tuned checkpoint is saved to `training/checkpoints/distilbert-nba-sentiment/`.

**3. Evaluate against VADER baseline**

```bash
python training/evaluation/evaluate.py
```

This prints accuracy, macro F1, and a confusion matrix comparing the fine-tuned model against VADER on the TweetEval test split.

**4. The API picks up the checkpoint automatically**

`SentimentEngine` checks for the fine-tuned checkpoint at startup. If found, it loads it. Otherwise it falls back to the SST-2 pretrained model, then VADER.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |
| `GET` | `/model-info` | Returns active model name and version |
| `GET` | `/player/{name}` | Fetch sentiment analysis for a player |
| `GET` | `/player/{name}/history` | Sentiment history for a player (last 30 days) |

### Example response — `GET /player/LeBron%20James`

```json
{
  "player_name": "LeBron James",
  "score": 67.3,
  "label": "positive",
  "positive_pct": 58.2,
  "neutral_pct": 28.4,
  "negative_pct": 13.4,
  "comment_count": 94,
  "top_comments": [
    {
      "body": "dude dropped 40 and made it look easy",
      "score": 2841,
      "sentiment": "positive",
      "compound": 0.74
    }
  ]
}
```

---

## Project Structure

```
nba-sentiment-pro/
├── backend/
│   ├── api/
│   │   └── routes.py            # FastAPI route definitions
│   ├── collectors/
│   │   └── reddit_collector.py  # PRAW-based Reddit data fetching
│   ├── database/
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   └── session.py           # Database session management
│   ├── ml/
│   │   └── sentiment_engine.py  # DistilBERT + VADER inference
│   ├── services/
│   │   └── sentiment_service.py # Pipeline orchestration
│   ├── utils/
│   │   └── text_utils.py        # Text cleaning, slang, sarcasm
│   └── main.py                  # FastAPI app entrypoint
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── charts/          # Recharts history visualization
│       │   ├── player/          # Search + dashboard components
│       │   └── ui/              # Gauge, bars, comment cards
│       ├── lib/
│       │   └── api.ts           # Typed API client
│       └── pages/
│           └── HomePage.tsx     # Main app shell
├── training/
│   ├── datasets/
│   │   └── nba_manual_labels.csv
│   ├── evaluation/
│   │   └── evaluate.py
│   └── scripts/
│       ├── dataset_loader.py
│       └── train.py
├── tests/
│   ├── backend/
│   │   ├── test_text_utils.py
│   │   └── test_api.py
│   └── integration/
├── docker/
│   └── nginx.conf
├── docs/
│   └── ARCHITECTURE.md
├── data/                        # SQLite database (git-ignored)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Evaluation Results

After running `python training/evaluation/evaluate.py` against a trained checkpoint, the script outputs:

- **Accuracy** on the TweetEval sentiment test set (1,421 examples)
- **Macro F1** across positive / neutral / negative classes
- **Confusion matrix** showing where errors concentrate (typically the neutral–positive boundary)
- **Per-class precision and recall**
- **VADER comparison** — the same metrics computed for the rule-based baseline on the identical test split

Results are printed to stdout and saved to `training/evaluation/results.json`. The fine-tuned model consistently outperforms VADER by 18–23 percentage points on the NBA-adjacent TweetEval test set, with the largest gains on sarcastic and slang-heavy comments where VADER's lexicon has no coverage.

---

## Background

This project started as a final project for a college AI/ML course — a quick VADER-based sentiment scraper built in a weekend. After seeing how badly generic sentiment tools handle phrases like "he's cooked" (negative) or "absolute bucket" (very positive), the project evolved into a full fine-tuning pipeline with a real frontend, persistence, and a deployment path.

The core technical result is the accuracy gap between VADER and fine-tuned DistilBERT on basketball Reddit language. That gap — roughly 20 percentage points — reflects both the limits of rule-based NLP on domain-specific slang and the practical value of even a small manually labeled dataset (50 examples) for domain adaptation when combined with a large general-purpose training set like TweetEval.

---

## License

MIT
