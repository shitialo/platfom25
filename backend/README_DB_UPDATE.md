# Database Update Instructions

This document provides instructions on how to update your database schema to support the new user profile functionality.

## Issue Description

The following errors are occurring because the database schema needs to be updated:

1. Missing columns in the `users` table:
   - `Unknown column 'phone' in 'field list'`
   - Missing columns: `phone`, `language`, `currency`, `timezone`, `bio`

2. Missing tables:
   - `Table 'platform2025.bookings' doesn't exist`
   - `Table 'platform2025.favorites' doesn't exist`
   - `Table 'platform2025.user_settings' doesn't exist`
   - `Table 'platform2025.connected_accounts' doesn't exist`
   - `Table 'platform2025.listings' doesn't exist`

## Solution

We've created scripts to automatically update your database schema and initialize user settings for existing users.

### Option 1: Run the Automated Update Script

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Run the update script:
   ```
   python update_db.py
   ```

   This script will:
   - Add missing columns to the `users` table
   - Create missing tables (`listings`, `user_settings`, `connected_accounts`, `favorites`, `bookings`)
   - Initialize user settings for existing users
   - Add sample listings data for testing

3. Restart your backend server to apply the changes.

### Option 2: Manual Update

If you prefer to update the database manually, you can run the following SQL commands:

```sql
-- Add new columns to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN language VARCHAR(50) DEFAULT 'English';
ALTER TABLE users ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC-5';
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL;

-- Create listings table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add sample listings
INSERT INTO listings (type, title, description, price, location, main_image) VALUES
('food', 'Italian Cooking Class', 'Learn to make authentic Italian pasta from scratch', 75.00, 'Rome, Italy', 'uploads/listings/italian_cooking.jpg'),
('food', 'Spanish Tapas Tour', 'Explore the best tapas bars in Barcelona', 65.00, 'Barcelona, Spain', 'uploads/listings/tapas_tour.jpg'),
('stay', 'Beachfront Villa', 'Luxurious villa with direct access to the beach', 250.00, 'Bali, Indonesia', 'uploads/listings/beach_villa.jpg'),
('stay', 'Mountain Cabin', 'Cozy cabin with stunning mountain views', 120.00, 'Aspen, Colorado', 'uploads/listings/mountain_cabin.jpg');

-- Create user_settings table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create connected_accounts table
CREATE TABLE connected_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider ENUM('google', 'facebook') NOT NULL,
    provider_user_id VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY user_provider_idx (user_id, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create favorites table
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    listing_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    UNIQUE KEY user_listing_idx (user_id, listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create bookings table
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize user settings for existing users
INSERT INTO user_settings (user_id, email_notifications, marketing_communications, two_factor_enabled)
SELECT id, FALSE, FALSE, FALSE FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings);
```

## Verification

After updating the database, you should be able to:

1. View and edit your profile information
2. Upload a profile image
3. Change your password
4. Manage your security settings
5. View your bookings and favorites (these will be empty until you create some)

## Troubleshooting

If you continue to experience issues after updating the database:

1. Check the backend logs for specific error messages
2. Verify that all tables and columns were created correctly
3. Restart both the frontend and backend servers
4. Clear your browser cache and reload the page

If problems persist, please contact the development team for assistance. 