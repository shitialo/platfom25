# backend/db.py
import mysql.connector
from config import config

def get_db_connection():
    try:
        return mysql.connector.connect(**config.DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"Database connection failed: {err}")
        raise