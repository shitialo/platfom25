-- Database Creation
-- Note: We don't need to create the database as it's created by Docker Compose
USE platform2025;

-- Core User Management
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    is_host BOOLEAN DEFAULT FALSE,
    image VARCHAR(255) DEFAULT NULL,
    INDEX email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Amenities Master Table
CREATE TABLE IF NOT EXISTS amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    type ENUM('stay', 'food', 'both') NOT NULL DEFAULT 'both'
);

-- Food Experience Related Tables
CREATE TABLE IF NOT EXISTS food_experiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    host_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    price_per_person DECIMAL(10, 2) NOT NULL,
    cuisine_type VARCHAR(100) NOT NULL,
    menu_description TEXT NOT NULL,
    duration VARCHAR(50) DEFAULT '2 hours',
    max_guests INT DEFAULT 8,
    language VARCHAR(50) DEFAULT 'English',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    address VARCHAR(255) NOT NULL DEFAULT '',
    zipcode VARCHAR(10) NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT '',
    state VARCHAR(50) NOT NULL DEFAULT '',
    latitude DECIMAL(10,8) NOT NULL DEFAULT 0,
    longitude DECIMAL(11,8) NOT NULL DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (host_id) REFERENCES users(id),
    INDEX host_idx (host_id),
    INDEX status_idx (status),
    INDEX location_idx (latitude, longitude),
    INDEX zipcode_idx (zipcode),
    INDEX featured_idx (is_featured)
);

CREATE TABLE IF NOT EXISTS food_experience_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    experience_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (experience_id) REFERENCES food_experiences(id)
);

CREATE TABLE IF NOT EXISTS food_experience_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    experience_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available_slots INT NOT NULL,
    FOREIGN KEY (experience_id) REFERENCES food_experiences(id),
    INDEX experience_date_idx (experience_id, date)
);

-- Stay Related Tables
CREATE TABLE IF NOT EXISTS stays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    host_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_guests INT NOT NULL,
    bedrooms INT NOT NULL,
    bathrooms INT DEFAULT 1,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    address VARCHAR(255) NOT NULL DEFAULT '',
    zipcode VARCHAR(10) NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL DEFAULT '',
    state VARCHAR(50) NOT NULL DEFAULT '',
    latitude DECIMAL(10,8) NOT NULL DEFAULT 0,
    longitude DECIMAL(11,8) NOT NULL DEFAULT 0,
    FOREIGN KEY (host_id) REFERENCES users(id),
    INDEX host_idx (host_id),
    INDEX status_idx (status),
    INDEX location_idx (latitude, longitude),
    INDEX zipcode_idx (zipcode),
    INDEX featured_idx (is_featured)
);

CREATE TABLE IF NOT EXISTS stay_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stay_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (stay_id) REFERENCES stays(id)
);

CREATE TABLE IF NOT EXISTS stay_amenities (
    stay_id INT NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (stay_id, amenity_id),
    FOREIGN KEY (stay_id) REFERENCES stays(id),
    FOREIGN KEY (amenity_id) REFERENCES amenities(id)
);

CREATE TABLE IF NOT EXISTS stay_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stay_id INT NOT NULL,
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT true,
    price_override DECIMAL(10, 2) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (stay_id) REFERENCES stays(id),
    UNIQUE KEY stay_date_idx (stay_id, date)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    experience_id INT,
    stay_id INT,
    rating DECIMAL(2,1) NOT NULL,
    comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type ENUM('food', 'stay') NOT NULL DEFAULT 'food',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (experience_id) REFERENCES food_experiences(id),
    FOREIGN KEY (stay_id) REFERENCES stays(id),
    CHECK (rating BETWEEN 1 AND 5),
    CHECK ((experience_id IS NOT NULL AND stay_id IS NULL) OR 
           (experience_id IS NULL AND stay_id IS NOT NULL)),
    INDEX idx_experience_reviews (experience_id),
    INDEX idx_stay_reviews (stay_id)
);

-- Default Amenities Data
INSERT INTO amenities (name, category, type) VALUES
-- Stay amenities
('WiFi', 'Basic', 'stay'),
('Air Conditioning', 'Basic', 'stay'),
('Kitchen', 'Basic', 'stay'),
('Free Parking', 'Basic', 'stay'),
('Pool', 'Outdoor', 'stay'),
('Hot Tub', 'Outdoor', 'stay'),
('BBQ Grill', 'Outdoor', 'stay'),
('Gym', 'Facilities', 'stay'),
('Washer/Dryer', 'Basic', 'stay'),
('TV', 'Entertainment', 'stay'),
-- Food Experience amenities
('Vegetarian Options', 'Dietary', 'food'),
('Vegan Options', 'Dietary', 'food'),
('Gluten-Free', 'Dietary', 'food'),
('Halal', 'Dietary', 'food'),
('Kosher', 'Dietary', 'food'),
('Wine Pairing', 'Beverages', 'food'),
('Cocktail Making', 'Activities', 'food'),
('Cooking Class', 'Activities', 'food'),
('Private Chef', 'Service', 'food'),
('Outdoor Dining', 'Setting', 'food'),
-- Shared amenities
('Wheelchair Accessible', 'Accessibility', 'both'),
('Pet Friendly', 'Basic', 'both'),
('Family Friendly', 'Basic', 'both');
