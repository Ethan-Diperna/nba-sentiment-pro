from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "nba-sentiment-pro/1.0"
    database_url: str = "sqlite:///./data/nba_sentiment.db"
    model_name: str = "distilbert-base-uncased"
    model_checkpoint_dir: str = "./training/checkpoints"
    use_fine_tuned: bool = False
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
