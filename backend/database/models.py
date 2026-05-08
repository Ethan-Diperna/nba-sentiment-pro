from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    sentiment_scores = relationship(
        "SentimentScore", back_populates="player", cascade="all, delete-orphan"
    )
    reddit_comments = relationship(
        "RedditComment", back_populates="player", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Player(id={self.id}, name={self.name!r}, slug={self.slug!r})>"


class SentimentScore(Base):
    __tablename__ = "sentiment_scores"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    score = Column(Float, nullable=False)          # 0-100 scale
    positive_pct = Column(Float, nullable=False)
    neutral_pct = Column(Float, nullable=False)
    negative_pct = Column(Float, nullable=False)
    comment_count = Column(Integer, nullable=False, default=0)
    source = Column(String(128), nullable=False, default="reddit")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    player = relationship("Player", back_populates="sentiment_scores")

    def __repr__(self) -> str:
        return (
            f"<SentimentScore(id={self.id}, player_id={self.player_id}, "
            f"score={self.score:.2f})>"
        )


class RedditComment(Base):
    __tablename__ = "reddit_comments"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    comment_text = Column(Text, nullable=False)
    cleaned_text = Column(Text, nullable=True)
    score_compound = Column(Float, nullable=False, default=0.0)
    label = Column(String(16), nullable=False, default="neutral")  # positive/neutral/negative
    upvotes = Column(Integer, nullable=False, default=0)
    subreddit = Column(String(128), nullable=True)
    post_title = Column(Text, nullable=True)
    collected_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    player = relationship("Player", back_populates="reddit_comments")

    def __repr__(self) -> str:
        return (
            f"<RedditComment(id={self.id}, player_id={self.player_id}, "
            f"label={self.label!r}, upvotes={self.upvotes})>"
        )
