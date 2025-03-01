# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'fallback-secret-key')
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')
    DEBUG = os.getenv('FLASK_ENV') != 'production'
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    DB_CONFIG = {
        'host': os.getenv('MYSQL_HOST', 'localhost'),
        'user': os.getenv('MYSQL_USER'),
        'password': os.getenv('MYSQL_PASSWORD'),
        'database': os.getenv('MYSQL_DATABASE')
    }

    CORS_ORIGINS_DEVELOPMENT = "*"
    CORS_ORIGINS_PRODUCTION = ["http://localhost:3000"] # Replace with your frontend production URL

config = Config()