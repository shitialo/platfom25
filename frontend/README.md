# Platform 2025 - Local Food & Stay Experience Platform

A full-stack web application connecting travelers with authentic local food experiences and unique stays. Hosts can share their culinary expertise and spaces while travelers can discover and book memorable experiences.

## System Architecture

### Frontend
- React + TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- React Router for navigation
- Context API for state management

### Backend 
- Python Flask REST API
- MySQL database
- JWT authentication
- File upload handling

## Core Features

### For Travelers
- Browse and search food experiences and stays
- Filter by location, price range, cuisine type etc.
- View detailed listings with images, descriptions, pricing
- Book experiences and stays
- Manage bookings and favorites
- User profiles and reviews

### For Hosts
- List food experiences and stays
- Manage listings and availability
- Upload photos and details
- Track bookings and earnings
- Host dashboard
- Profile management

## Project Structure
platform2025/
├── frontend/
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── pages/ # Page components
│ │ ├── contexts/ # Context providers
│ │ ├── hooks/ # Custom hooks
│ │ └── lib/ # Utilities and helpers
│ └── public/ # Static assets
└── backend/
├── app.py # Main Flask application
├── schema.sql # Database schema
└── migrations/ # Database migrations

## Local Development Setup

### Prerequisites
- Node.js v16+
- Python 3.8+
- MySQL 8.0+
- Git

### 1. Clone Repository
bash
git clone <repository-url>
cd platform2025

### 2. Frontend Setup   
bash
cd frontend
npm install
npm run dev 
Create .env file
cp .env.example .env
Add environment variables
VITE_API_URL=http://localhost:5000

### 3. Backend Setup
bash
cd backend
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate
pip install -r requirements.txt

### 4. Database Setup
bash
cd backend
python -m flask db init
python -m flask db migrate

Login to MySQL
mysql -u root -p
Create database
CREATE DATABASE platform2025;
Run migrations
cd backend
python migrate.py
python migrate_reviews.py
python migrate_bathrooms.py

### 5. Run Application
bash
cd frontend
npm run dev
cd backend
python app.py

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Key Components

### Authentication
- JWT-based authentication
- Protected routes for authenticated users
- Role-based access control (hosts vs regular users)

### Image Handling
- Image upload with compression
- Gallery view with navigation
- Secure file storage

### Search & Filters
- Location-based search
- Price range filters
- Category/amenity filters
- Sort options

### Maps Integration
- Location picker for hosts
- Map view of listings
- Distance-based search

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Food Experiences
- GET /api/food-experiences
- GET /api/food-experiences/:id
- POST /api/host/food-experiences
- PUT /api/host/food-experiences/:id

### Stays
- GET /api/stays
- GET /api/stays/:id
- POST /api/host/stays
- PUT /api/host/stays/:id

## Common Issues & Solutions

### Image Upload Issues
- Ensure images are less than 10MB
- Check file type (JPEG, PNG)
- Check file size limits

### Database Connection Issues
