#!/usr/bin/env python3
# backend/init_user_settings.py
import mysql.connector
from config import config

def get_db_connection():
    return mysql.connector.connect(
        host=config.DB_HOST,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME
    )

def initialize_user_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Initializing user settings for existing users...")
    
    # Get all users that don't have settings yet
    cursor.execute("""
        SELECT u.id 
        FROM users u 
        LEFT JOIN user_settings us ON u.id = us.user_id 
        WHERE us.id IS NULL
    """)
    
    users_without_settings = cursor.fetchall()
    
    if not users_without_settings:
        print("All users already have settings initialized.")
        cursor.close()
        conn.close()
        return
    
    print(f"Found {len(users_without_settings)} users without settings.")
    
    # Initialize settings for each user
    for (user_id,) in users_without_settings:
        print(f"Initializing settings for user ID: {user_id}")
        try:
            cursor.execute("""
                INSERT INTO user_settings 
                (user_id, email_notifications, marketing_communications, two_factor_enabled) 
                VALUES (%s, TRUE, TRUE, FALSE)
            """, (user_id,))
        except mysql.connector.Error as err:
            print(f"Error initializing settings for user {user_id}: {err}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("User settings initialization completed!")

if __name__ == "__main__":
    initialize_user_settings() 