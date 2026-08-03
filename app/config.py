from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL:str
    RABBITMQ_URL:str
    UPLOAD_DIR:str

    class Config:
        env_file=".env"

settings=Settings()