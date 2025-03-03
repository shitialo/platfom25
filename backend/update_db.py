#!/usr/bin/env python3
# backend/update_db.py
import os
import sys
from update_schema import update_schema
from init_user_settings import initialize_user_settings

def main():
    print("Starting database update process...")
    
    # Step 1: Update the database schema
    print("\n=== STEP 1: Updating Database Schema ===")
    update_schema()
    
    # Step 2: Initialize user settings for existing users
    print("\n=== STEP 2: Initializing User Settings ===")
    initialize_user_settings()
    
    print("\nDatabase update process completed successfully!")
    print("You can now restart your backend server to apply the changes.")

if __name__ == "__main__":
    main() 