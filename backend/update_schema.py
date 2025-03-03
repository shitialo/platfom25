#!/usr/bin/env python3
# backend/update_schema.py
import mysql.connector
from config import config
import sys

def get_db_connection():
    return mysql.connector.connect(
        host=config.DB_HOST,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        database=config.DB_NAME
    )

def execute_query(cursor, query, params=None):
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return True
    except mysql.connector.Error as err:
        print(f"Error executing query: {err}")
        return False

def check_column_exists(cursor, table, column):
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = '{config.DB_NAME}' 
        AND TABLE_NAME = '{table}' 
        AND COLUMN_NAME = '{column}'
    """)
    return cursor.fetchone()[0] > 0

def check_table_exists(cursor, table):
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '{config.DB_NAME}' 
        AND TABLE_NAME = '{table}'
    """)
    return cursor.fetchone()[0] > 0

def update_schema():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Updating database schema...")
    
    # Add new columns to users table
    if not check_column_exists(cursor, 'users', 'phone'):
        print("Adding 'phone' column to users table...")
        execute_query(cursor, """
            ALTER TABLE users 
            ADD COLUMN phone VARCHAR(20) DEFAULT NULL
        """)
    
    if not check_column_exists(cursor, 'users', 'language'):
        print("Adding 'language' column to users table...")
        execute_query(cursor, """
            ALTER TABLE users 
            ADD COLUMN language VARCHAR(50) DEFAULT 'English'
        """)
    
    if not check_column_exists(cursor, 'users', 'currency'):
        print("Adding 'currency' column to users table...")
        execute_query(cursor, """
            ALTER TABLE users 
            ADD COLUMN currency VARCHAR(10) DEFAULT 'USD'
        """)
    
    if not check_column_exists(cursor, 'users', 'timezone'):
        print("Adding 'timezone' column to users table...")
        execute_query(cursor, """
            ALTER TABLE users 
            ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC-5'
        """)
    
    if not check_column_exists(cursor, 'users', 'bio'):
        print("Adding 'bio' column to users table...")
        execute_query(cursor, """
            ALTER TABLE users 
            ADD COLUMN bio TEXT DEFAULT NULL
        """)
    
    # Create listings table if it doesn't exist
    if not check_table_exists(cursor, 'listings'):
        print("Creating 'listings' table...")
        execute_query(cursor, """
            CREATE TABLE listings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('food', 'stay') NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                location VARCHAR(255) NOT NULL,
                main_image VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX type_idx (type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
    
    # Create user_settings table if it doesn't exist
    if not check_table_exists(cursor, 'user_settings'):
        print("Creating 'user_settings' table...")
        execute_query(cursor, """
            CREATE TABLE user_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                email_notifications BOOLEAN DEFAULT FALSE,
                marketing_communications BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY user_settings_idx (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
    
    # Create connected_accounts table if it doesn't exist
    if not check_table_exists(cursor, 'connected_accounts'):
        print("Creating 'connected_accounts' table...")
        execute_query(cursor, """
            CREATE TABLE connected_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                provider ENUM('google', 'facebook') NOT NULL,
                provider_user_id VARCHAR(255) DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY user_provider_idx (user_id, provider)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
    
    # Create favorites table if it doesn't exist
    if not check_table_exists(cursor, 'favorites'):
        print("Creating 'favorites' table...")
        execute_query(cursor, """
            CREATE TABLE favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                listing_id INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
                UNIQUE KEY user_listing_idx (user_id, listing_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
    
    # Create bookings table if it doesn't exist
    if not check_table_exists(cursor, 'bookings'):
        print("Creating 'bookings' table...")
        execute_query(cursor, """
            CREATE TABLE bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                listing_id INT NOT NULL,
                booking_date DATE NOT NULL,
                guests INT NOT NULL DEFAULT 1,
                total_price DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
                INDEX user_idx (user_id),
                INDEX listing_idx (listing_id),
                INDEX status_idx (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
    
    # Add some sample listings if the listings table is empty
    cursor.execute("SELECT COUNT(*) FROM listings")
    listings_count = cursor.fetchone()[0]
    
    if listings_count == 0:
        print("Adding sample listings...")
        sample_listings = [
            ('food', 'Italian Cooking Class', 'Learn to make authentic Italian pasta from scratch', 75.00, 'Rome, Italy', 'uploads/listings/italian_cooking.jpg'),
            ('food', 'Spanish Tapas Tour', 'Explore the best tapas bars in Barcelona', 65.00, 'Barcelona, Spain', 'uploads/listings/tapas_tour.jpg'),
            ('stay', 'Beachfront Villa', 'Luxurious villa with direct access to the beach', 250.00, 'Bali, Indonesia', 'uploads/listings/beach_villa.jpg'),
            ('stay', 'Mountain Cabin', 'Cozy cabin with stunning mountain views', 120.00, 'Aspen, Colorado', 'uploads/listings/mountain_cabin.jpg')
        ]
        
        for listing in sample_listings:
            execute_query(cursor, """
                INSERT INTO listings (type, title, description, price, location, main_image)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, listing)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("Database schema update completed!")

if __name__ == "__main__":
    update_schema() 