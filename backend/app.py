from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
import jwt
from datetime import datetime, timezone, timedelta
import os
from functools import wraps, lru_cache
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import json
from PIL import Image
from io import BytesIO
from decimal import Decimal
from flask.json import JSONEncoder
import requests
import uuid

# Load environment variables
load_dotenv()

app = Flask(__name__)

# CORS configuration based on environment
if os.getenv('FLASK_ENV') == 'production':
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"]
        }
    })
else:
    CORS(app)  # Allow all origins in development

# Configuration
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'fallback-secret-key')
app.config['BASE_URL'] = os.getenv('BASE_URL', 'http://167.99.157.245')
DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DATABASE')
}

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Helper function to get full URL for a path
def get_full_url(path):
    if not path:
        return None
    if path.startswith('http'):
        return path
    base_url = os.getenv('BASE_URL', 'http://localhost:3000')
    return f"{base_url}/api/{path}"

# Database connection helper with error handling
def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"Database connection failed: {err}")
        raise

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT * FROM users WHERE id = %s', (data['user_id'],))
            current_user = cursor.fetchone()
            cursor.close()
            conn.close()
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

app.json_encoder = CustomJSONEncoder

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    print("Received registration data:", data)  # Debug print
    
    if not all(k in data for k in ['email', 'password', 'name']):
        missing_fields = [k for k in ['email', 'password', 'name'] if k not in data]
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400
    
    # Validate that none of the fields are empty
    if not all(data.get(k) for k in ['email', 'password', 'name']):
        empty_fields = [k for k in ['email', 'password', 'name'] if not data.get(k)]
        return jsonify({
            'message': 'Required fields cannot be empty',
            'empty_fields': empty_fields
        }), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute('SELECT * FROM users WHERE email = %s', (data['email'],))
        if cursor.fetchone():
            return jsonify({'message': 'User already exists'}), 409
        
        # Create new user
        hashed_password = generate_password_hash(data['password'], method='sha256')
        insert_query = '''
            INSERT INTO users (email, password, name, created_at) 
            VALUES (%s, %s, %s, %s)
        '''
        values = (data['email'], hashed_password, data['name'], datetime.now(timezone.utc))
        
        print("Executing query:", insert_query)  # Debug print
        print("With values:", values)  # Debug print
        
        cursor.execute(insert_query, values)
        conn.commit()
        
        # Get the created user
        cursor.execute(
            'SELECT id, email, name, created_at FROM users WHERE email = %s', 
            (data['email'],)
        )
        user = cursor.fetchone()
        
        if not user:
            raise Exception("User was not created successfully")
        
        # Convert datetime to string for JSON serialization
        user['created_at'] = user['created_at'].isoformat()
        
        # Generate token
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.now(timezone.utc) + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'user': user,
            'token': token
        }), 201
        
    except mysql.connector.Error as err:
        print("MySQL Error:", err)  # Debug print
        return jsonify({
            'message': 'Database error occurred',
            'error': str(err)
        }), 500
        
    except Exception as e:
        print("Error during registration:", str(e))  # Debug print
        return jsonify({
            'message': 'Registration failed',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'message': 'Missing required fields'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('SELECT id, email, name, password, is_host FROM users WHERE email = %s', (data['email'],))
        user = cursor.fetchone()
        
        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Remove password from user dict
        user.pop('password', None)
        
        # Convert is_host to boolean
        user['is_host'] = bool(user['is_host'])
        
        # Generate token
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.now(timezone.utc) + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'user': user,
            'token': token
        })
        
    except Exception as e:
        print("Error during login:", str(e))
        return jsonify({
            'message': 'Login failed',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user data including is_host
        cursor.execute('SELECT id, name, email, is_host FROM users WHERE id = %s', (current_user['id'],))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Convert is_host to boolean
        user['is_host'] = bool(user['is_host'])
        
        # Check if user has any food experiences or stays
        cursor.execute('''
            SELECT 
                (SELECT COUNT(*) FROM food_experiences WHERE host_id = %s) as food_count,
                (SELECT COUNT(*) FROM stays WHERE host_id = %s) as stay_count
        ''', (user['id'], user['id']))
        counts = cursor.fetchone()
        
        # If user has any listings but is not marked as host, update their status
        if (counts['food_count'] > 0 or counts['stay_count'] > 0) and not user['is_host']:
            cursor.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (user['id'],))
            conn.commit()
            user['is_host'] = True
        
        return jsonify(user)
        
    except Exception as e:
        print("Error fetching user:", str(e))
        return jsonify({
            'message': 'Failed to fetch user data',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/test-db', methods=['GET'])
def test_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SHOW TABLES')
        tables = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({
            'message': 'Database connection successful',
            'tables': tables
        })
    except Exception as e:
        return jsonify({
            'message': 'Database connection failed',
            'error': str(e)
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(current_user):
    # In a more complex implementation, you might want to:
    # 1. Add the token to a blacklist
    # 2. Clear any server-side sessions
    # 3. Handle multiple devices/tokens
    
    return jsonify({
        'message': 'Successfully logged out'
    })

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Food Experience endpoints
@app.route('/api/host/food-experiences', methods=['POST'])
@token_required
def create_food_experience(current_user):
    try:
        # Debug logs
        print("Received form data:", request.form)
        print("Files:", request.files)
        
        # Extract and validate required fields
        required_fields = [
            'title', 'description', 'location_name', 'price_per_person',
            'cuisine_type', 'menu_description', 'address', 'zipcode',
            'city', 'state', 'latitude', 'longitude'
        ]
        
        data = {}
        for field in required_fields:
            value = request.form.get(field)
            if not value:
                return jsonify({
                    'message': f'Missing required field: {field}',
                    'field': field
                }), 400
            data[field] = value

        # First, ensure the user is marked as a host
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (current_user['id'],))
        conn.commit()

        # Create the experience
        insert_query = '''
            INSERT INTO food_experiences (
                host_id, title, description, location_name,
                price_per_person, cuisine_type, menu_description,
                status, address, zipcode, city, state,
                latitude, longitude, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, NOW(), NOW()
            )
        '''
        
        values = (
            current_user['id'],
            data['title'],
            data['description'],
            data['location_name'],
            float(data['price_per_person']),
            data['cuisine_type'],
            data['menu_description'],
            request.form.get('status', 'draft'),
            data['address'],
            data['zipcode'],
            data['city'],
            data['state'],
            float(data['latitude']),
            float(data['longitude'])
        )

        cursor.execute(insert_query, values)
        experience_id = cursor.lastrowid

        # Handle image uploads
        image_urls = request.form.get('images', '').split(',') if request.form.get('images') else []
        print("Processing images:", image_urls)
        
        for index, image_url in enumerate(image_urls):
            if image_url and image_url.strip():
                filename = image_url.strip().split('/')[-1]
                print(f"Adding image to DB: {filename}")
                
                cursor.execute('''
                    INSERT INTO food_experience_images 
                    (experience_id, image_path, created_at, display_order) 
                    VALUES (%s, %s, %s, %s)
                ''', (experience_id, filename, datetime.now(timezone.utc), index))
        
        conn.commit()
        
        return jsonify({
            'message': 'Food experience created successfully',
            'id': experience_id
        }), 201
        
    except Exception as e:
        print("Error creating food experience:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({
            'message': 'Failed to create food experience',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/food-experiences/<int:id>', methods=['PUT'])
@token_required
def update_host_food_experience(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verify ownership
        cursor.execute('SELECT host_id FROM food_experiences WHERE id = %s', (id,))
        experience = cursor.fetchone()
        if not experience or experience['host_id'] != current_user['id']:
            return jsonify({'message': 'Experience not found or unauthorized'}), 404

        data = request.form.to_dict()
        print("Received form data:", data)  # Debug print
        
        # Update food experience
        update_query = """
            UPDATE food_experiences SET
                title = %s,
                description = %s,
                location_name = %s,
                price_per_person = %s,
                cuisine_type = %s,
                menu_description = %s,
                status = %s,
                address = %s,
                zipcode = %s,
                city = %s,
                state = %s,
                latitude = %s,
                longitude = %s,
                updated_at = NOW()
            WHERE id = %s AND host_id = %s
        """
        
        values = (
            data['title'],
            data['description'],
            data['location_name'],
            float(data['price_per_person']),
            data['cuisine_type'],
            data['menu_description'],
            data['status'],
            data['address'],
            data['zipcode'],
            data['city'],
            data['state'],
            float(data['latitude']),
            float(data['longitude']),
            id,
            current_user['id']
        )
        
        cursor.execute(update_query, values)
        
        # Handle images
        if 'images[]' in request.form:
            try:
                # Get all image URLs from form data
                image_urls = request.form.getlist('images[]')
                print("Processing images:", image_urls)  # Debug print
                
                # Delete old images
                cursor.execute('DELETE FROM food_experience_images WHERE experience_id = %s', (id,))
                
                # Insert new images
                for i, image_url in enumerate(image_urls):
                    if image_url:  # Only process non-empty URLs
                        filename = image_url.split('/')[-1]  # Extract filename from URL
                        print(f"Adding image {i}: {filename}")  # Debug print
                        cursor.execute("""
                            INSERT INTO food_experience_images 
                            (experience_id, image_path, display_order) 
                            VALUES (%s, %s, %s)
                        """, (id, filename, i))
            except Exception as e:
                print("Error processing images:", str(e))
                # Continue with the update even if image processing fails

        conn.commit()

        # Fetch and return the updated experience
        cursor.execute("""
            SELECT 
                fe.*,
                GROUP_CONCAT(DISTINCT fei.image_path ORDER BY fei.display_order) as image_paths
            FROM food_experiences fe
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.id = %s AND fe.host_id = %s
            GROUP BY fe.id
        """, (id, current_user['id']))
        
        updated_exp = cursor.fetchone()
        
        if updated_exp:
            # Format images
            images = []
            if updated_exp['image_paths']:
                for img_path in updated_exp['image_paths'].split(','):
                    if img_path:
                        images.append({'url': get_full_url(f"/uploads/{img_path}")})
            
            response = {
                'id': updated_exp['id'],
                'title': updated_exp['title'],
                'description': updated_exp['description'],
                'menu_description': updated_exp['menu_description'],
                'location_name': updated_exp['location_name'],
                'price_per_person': float(updated_exp['price_per_person']),
                'cuisine_type': updated_exp['cuisine_type'],
                'status': updated_exp['status'],
                'address': updated_exp['address'],
                'zipcode': updated_exp['zipcode'],
                'city': updated_exp['city'],
                'state': updated_exp['state'],
                'latitude': float(updated_exp['latitude']),
                'longitude': float(updated_exp['longitude']),
                'images': images
            }
            
            return jsonify(response)
            
        return jsonify({'message': 'Failed to fetch updated experience'}), 500
        
    except Exception as e:
        print("Error updating food experience:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'message': 'Failed to update experience', 'error': str(e)}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

@app.route('/api/host/food-experiences', methods=['GET'])
@token_required
def get_host_food_experiences(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                fe.*,
                GROUP_CONCAT(DISTINCT fei.image_path) as image_paths
            FROM food_experiences fe
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.host_id = %s
            GROUP BY fe.id
            ORDER BY fe.created_at DESC
        """
        
        cursor.execute(query, (current_user['id'],))
        experiences = cursor.fetchall()
        
        # Process the results
        for exp in experiences:
            # Handle images
            image_paths = exp.pop('image_paths', '')
            
            if image_paths and image_paths.strip():
                # Only include images that exist in the uploads folder
                valid_images = []
                for path in image_paths.split(','):
                    # Clean the path by removing any order numbers after ':'
                    clean_path = path.split(':')[0].strip()
                    if clean_path:
                        full_path = os.path.join(UPLOAD_FOLDER, clean_path)
                        if os.path.exists(full_path):
                            valid_images.append({
                                'url': get_full_url(f"/uploads/{clean_path}")
                            })
                exp['images'] = valid_images
            else:
                exp['images'] = []
            
            # Convert decimal values to float for JSON serialization
            if 'price_per_person' in exp:
                exp['price_per_person'] = float(exp['price_per_person'])
            if 'latitude' in exp:
                exp['latitude'] = float(exp['latitude']) if exp['latitude'] else 0
            if 'longitude' in exp:
                exp['longitude'] = float(exp['longitude']) if exp['longitude'] else 0
            
            # Convert datetime objects to strings
            if 'created_at' in exp:
                exp['created_at'] = exp['created_at'].isoformat()
            if 'updated_at' in exp:
                exp['updated_at'] = exp['updated_at'].isoformat()
        
        return jsonify(experiences)
        
    except Exception as e:
        print("Error fetching experiences:", str(e))
        return jsonify({
            'message': 'Failed to fetch experiences',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/food-experiences/<int:id>/images', methods=['DELETE'])
@token_required
def delete_food_experience_image(current_user, id):
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        if not image_url:
            return jsonify({'message': 'Image URL is required'}), 400

        # Extract filename from URL
        filename = image_url.split('/')[-1]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verify ownership
        cursor.execute('''
            SELECT fe.host_id 
            FROM food_experiences fe 
            JOIN food_experience_images fei ON fe.id = fei.experience_id 
            WHERE fe.id = %s AND fei.image_path = %s
        ''', (id, filename))
        
        result = cursor.fetchone()
        if not result or result['host_id'] != current_user['id']:
            return jsonify({'message': 'Image not found or unauthorized'}), 404

        # Delete image record
        cursor.execute('''
            DELETE FROM food_experience_images 
            WHERE experience_id = %s AND image_path = %s
        ''', (id, filename))

        # Reorder remaining images
        cursor.execute('''
            SET @order := -1;
            UPDATE food_experience_images 
            SET display_order = (@order := @order + 1)
            WHERE experience_id = %s 
            ORDER BY created_at;
        ''', (id,))

        conn.commit()

        # Delete actual file
        try:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file: {e}")

        return jsonify({'message': 'Image deleted successfully'})

    except Exception as e:
        print("Error deleting image:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({
            'message': 'Failed to delete image',
            'error': str(e)
        }), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/food-experiences/<int:id>/images/reorder', methods=['POST'])
@token_required
def reorder_food_experience_images(current_user, id):
    try:
        data = request.get_json()
        image_order = data.get('imageOrder', [])

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Verify ownership
        cursor.execute('SELECT host_id FROM food_experiences WHERE id = %s', (id,))
        experience = cursor.fetchone()
        if not experience or experience['host_id'] != current_user['id']:
            return jsonify({'message': 'Experience not found or unauthorized'}), 404

        # Update order for each image
        for index, image_url in enumerate(image_order):
            filename = image_url.split('/')[-1]
            cursor.execute('''
                UPDATE food_experience_images 
                SET display_order = %s 
                WHERE experience_id = %s AND image_path = %s
            ''', (index, id, filename))

        conn.commit()
        return jsonify({'message': 'Image order updated successfully'})

    except Exception as e:
        print("Error reordering images:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({
            'message': 'Failed to reorder images',
            'error': str(e)
        }), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Stay endpoints
@app.route('/api/host/stays', methods=['POST'])
@token_required
def create_stay(current_user):
    try:
        # Get form data
        title = request.form.get('title')
        description = request.form.get('description')
        location_name = request.form.get('location_name')
        price_per_night = request.form.get('price_per_night')
        max_guests = request.form.get('max_guests')
        bedrooms = request.form.get('bedrooms')
        bathrooms = request.form.get('bathrooms')
        property_type = request.form.get('property_type', 'house')
        beds = request.form.get('beds')
        status = request.form.get('status', 'draft')
        
        # Validate required fields
        if not all([title, description, location_name, price_per_night, max_guests, bedrooms]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get additional location data
        address = request.form.get('address')
        zipcode = request.form.get('zipcode')
        city = request.form.get('city')
        state = request.form.get('state')
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # If user is not a host, make them a host
        if not current_user['is_host']:
            cursor.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (current_user['id'],))
            current_user['is_host'] = True
        
        # Insert stay
        query = '''
            INSERT INTO stays (
                host_id, title, description, location_name, address, zipcode, city, state, 
                latitude, longitude, price_per_night, max_guests, bedrooms, bathrooms,
                property_type, beds, created_at, updated_at, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s)
        '''
        
        # Default beds to bedroom count if not provided
        if not beds:
            beds = bedrooms
            
        values = (
            current_user['id'], title, description, location_name, address, zipcode, city, state,
            latitude, longitude, price_per_night, max_guests, bedrooms, bathrooms, 
            property_type, beds, status
        )
        
        cursor.execute(query, values)
        stay_id = cursor.lastrowid

        # Handle amenities
        if 'amenities' in request.form:
            try:
                amenities = json.loads(request.form.get('amenities'))
                for amenity_id in amenities:
                    cursor.execute(
                        'INSERT INTO stay_amenities (stay_id, amenity_id) VALUES (%s, %s)',
                        (stay_id, amenity_id)
                    )
                print(f"Added {len(amenities)} amenities for stay {stay_id}")
            except Exception as e:
                print("Error processing amenities:", str(e))

        # Handle images
        if 'images' in request.files:
            images = request.files.getlist('images')
            for i, image in enumerate(images):
                if image and allowed_file(image.filename):
                    filename = secure_filename(f"{stay_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}.jpg")
                    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    image.save(image_path)
                    cursor.execute('''
                        INSERT INTO stay_images 
                        (stay_id, image_path, display_order, created_at) 
                        VALUES (%s, %s, %s, NOW())
                    ''', (stay_id, filename, i))
                    print(f"Added image {filename} for stay {stay_id}")
        
        # Handle existing images sent as JSON
        if 'existing_images' in request.form:
            try:
                existing_images = json.loads(request.form.get('existing_images'))
                for i, image_url in enumerate(existing_images):
                    # Extract the filename from the URL
                    filename = image_url.split('/')[-1]
                    if filename:
                        cursor.execute('''
                            INSERT INTO stay_images 
                            (stay_id, image_path, display_order, created_at) 
                            VALUES (%s, %s, %s, NOW())
                        ''', (stay_id, filename, i + len(request.files.getlist('images'))))
            except Exception as e:
                print("Error processing existing images:", str(e))

        conn.commit()
        return jsonify({
            'message': 'Stay created successfully',
            'id': stay_id
        }), 201

    except Exception as e:
        print("Error creating stay:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({
            'message': 'Failed to create stay',
            'error': str(e)
        }), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/stays', methods=['GET'])
@token_required
def get_host_stays(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT 
                s.*,
                GROUP_CONCAT(
                    DISTINCT CONCAT(si.image_path, ':', COALESCE(si.display_order, 0))
                    ORDER BY si.display_order ASC
                ) as image_data,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities
            FROM stays s
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            WHERE s.host_id = %s
            GROUP BY s.id
            ORDER BY s.created_at DESC
        ''', (current_user['id'],))
        
        stays = cursor.fetchall()
        
        # Process the results
        for stay in stays:
            stay['created_at'] = stay['created_at'].isoformat()
            stay['updated_at'] = stay['updated_at'].isoformat()
            stay['price_per_night'] = float(stay['price_per_night'])
            
            # Format image URL
            if stay['image_data']:
                try:
                    image_list = []
                    for img_data in stay['image_data'].split(','):
                        if ':' in img_data:
                            path, order = img_data.split(':')
                            image_list.append({
                                'url': get_full_url(f"/uploads/{path.strip()}"),
                                'order': int(order)
                            })
                    stay['images'] = sorted(image_list, key=lambda x: x['order'])
                    print(f"Processed {len(image_list)} images for stay {stay['id']}")
                except Exception as e:
                    print(f"Error processing images for stay {stay['id']}: {str(e)}")
                    stay['images'] = []
            else:
                stay['images'] = []
                
            # Process amenities
            if stay['amenities']:
                try:
                    amenity_ids = stay['amenities'].split(',')
                    cursor.execute('''
                        SELECT id, name, category FROM amenities 
                        WHERE id IN ({})
                    '''.format(','.join(['%s'] * len(amenity_ids))), amenity_ids)
                    
                    amenities_data = cursor.fetchall()
                    stay['amenities'] = [{
                        'id': amenity['id'],
                        'name': amenity['name'],
                        'category': amenity['category']
                    } for amenity in amenities_data]
                    
                    print(f"Found {len(amenities_data)} amenities for stay {stay['id']}")
                except Exception as e:
                    print(f"Error processing amenities for stay {stay['id']}: {str(e)}")
                    stay['amenities'] = []
            else:
                stay['amenities'] = []
        
        return jsonify(stays)
        
    except Exception as e:
        print("Error fetching stays:", str(e))
        return jsonify({
            'message': 'Failed to fetch stays',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/stays/<int:id>', methods=['PUT'])
@token_required
def update_stay(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verify ownership
        cursor.execute('SELECT host_id FROM stays WHERE id = %s', (id,))
        stay = cursor.fetchone()
        if not stay or stay['host_id'] != current_user['id']:
            return jsonify({'message': 'Stay not found or unauthorized'}), 404

        data = request.form.to_dict()
        
        # Update stay
        update_query = '''
            UPDATE stays SET
                title = %s,
                description = %s,
                location_name = %s,
                price_per_night = %s,
                max_guests = %s,
                bedrooms = %s,
                bathrooms = %s,
                property_type = %s,
                beds = %s,
                status = %s,
                address = %s,
                zipcode = %s,
                city = %s,
                state = %s,
                latitude = %s,
                longitude = %s,
                updated_at = NOW()
            WHERE id = %s
        '''
        
        # Default beds to bedroom count if not provided
        beds = data.get('beds')
        if not beds:
            beds = data['bedrooms']
            
        values = (
            data['title'],
            data['description'],
            data['location_name'],
            float(data['price_per_night']),
            int(data['max_guests']),
            int(data['bedrooms']),
            int(data.get('bathrooms', data['bedrooms'])),  # Default to bedrooms count
            data.get('property_type', 'house'),
            int(beds),
            data['status'],
            data['address'],
            data['zipcode'],
            data['city'],
            data['state'],
            float(data['latitude']),
            float(data['longitude']),
            id
        )
        cursor.execute(update_query, values)

        # Update amenities
        if 'amenities' in data:
            try:
                amenities = json.loads(data['amenities'])
                cursor.execute('DELETE FROM stay_amenities WHERE stay_id = %s', (id,))
                for amenity_id in amenities:
                    cursor.execute(
                        'INSERT INTO stay_amenities (stay_id, amenity_id) VALUES (%s, %s)',
                        (id, amenity_id)
                    )
            except Exception as e:
                print("Error processing amenities:", str(e))

        # Update availability
        if 'availability' in data:
            availability = json.loads(data['availability'])
            cursor.execute('DELETE FROM stay_availability WHERE stay_id = %s', (id,))
            for avail in availability:
                cursor.execute('''
                    INSERT INTO stay_availability 
                    (stay_id, date, is_available, price_override, created_at, updated_at) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                ''', (
                    id, 
                    avail['date'],
                    avail['is_available'],
                    avail.get('price_override'),
                    datetime.now(timezone.utc),
                    datetime.now(timezone.utc)
                ))

        # Update images if provided in files
        if 'images' in request.files:
            images = request.files.getlist('images')
            if images and images[0].filename: # Only proceed if there's an actual file
                # Get current images to keep track of display order
                cursor.execute('SELECT MAX(display_order) as max_order FROM stay_images WHERE stay_id = %s', (id,))
                result = cursor.fetchone()
                next_order = (result['max_order'] or 0) + 1 if result else 0
                
                for i, image in enumerate(images):
                    if image and allowed_file(image.filename):
                        filename = secure_filename(f"{id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}.jpg")
                        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        image.save(image_path)
                        cursor.execute('''
                            INSERT INTO stay_images 
                            (stay_id, image_path, display_order, created_at) 
                            VALUES (%s, %s, %s, NOW())
                        ''', (id, filename, next_order + i))
        
        # Handle existing images sent as JSON - for keeping track of which images to keep/delete
        if 'existing_images' in request.form:
            try:
                existing_images = json.loads(request.form.get('existing_images'))
                
                # Get all current image paths
                cursor.execute('SELECT id, image_path FROM stay_images WHERE stay_id = %s', (id,))
                current_images = cursor.fetchall()
                
                # Create a map of current image paths to IDs
                image_map = {}
                for img in current_images:
                    # Handle both full URLs and relative paths
                    image_path = img['image_path']
                    if image_path.startswith('/uploads/'):
                        image_map[image_path] = img['id']
                    else:
                        image_map[f"/uploads/{image_path}"] = img['id']
                
                # Delete images that are no longer in the existing_images list
                for path, img_id in image_map.items():
                    if path not in existing_images:
                        cursor.execute('DELETE FROM stay_images WHERE id = %s', (img_id,))
                        print(f"Deleted image {path} with ID {img_id}")
                
            except Exception as e:
                print("Error processing existing images:", str(e))

        conn.commit()

        # Fetch and return the updated stay
        cursor.execute('''
            SELECT 
                s.*,
                u.name as host_name,
                GROUP_CONCAT(
                    DISTINCT CONCAT(si.image_path, ':', COALESCE(si.display_order, 0))
                    ORDER BY si.display_order ASC
                ) as image_data,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities,
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        sav.date, ' ',
                        COALESCE(sav.price_override, s.price_per_night), ' ',
                        sav.is_available
                    )
                ) as availability_data
            FROM stays s
            JOIN users u ON s.host_id = u.id
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            LEFT JOIN stay_availability sav ON s.id = sav.stay_id
            WHERE s.id = %s
            GROUP BY s.id
        ''', (id,))
        
        updated_stay = cursor.fetchone()
        
        # Process the updated stay data
        if updated_stay:
            updated_stay['price_per_night'] = float(updated_stay['price_per_night'])
            updated_stay['created_at'] = updated_stay['created_at'].isoformat()
            updated_stay['updated_at'] = updated_stay['updated_at'].isoformat()
            
            # Process images
            images = []
            if updated_stay['image_data']:
                for img_data in updated_stay['image_data'].split(','):
                    path, order = img_data.split(':')
                    images.append({
                        'url': get_full_url(f"/uploads/{path}"),
                        'order': int(order)
                    })
            updated_stay['images'] = images
            
            # Process amenities
            updated_stay['amenities'] = updated_stay['amenities'].split(',') if updated_stay['amenities'] else []
            
            # Process availability
            availability = []
            if updated_stay['availability_data']:
                for avail_data in updated_stay['availability_data'].split(','):
                    date, price, is_available = avail_data.split(' ')
                    availability.append({
                        'date': date,
                        'price': float(price),
                        'is_available': bool(int(is_available))
                    })
            updated_stay['availability'] = availability
            
            # Clean up response
            del updated_stay['image_data']
            del updated_stay['availability_data']
            del updated_stay['amenities']
            
        return jsonify({
            'message': 'Stay updated successfully',
            'stay': updated_stay
        }), 200

    except Exception as e:
        print("Error updating stay:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'message': 'Failed to update stay', 'error': str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Amenities endpoints
@app.route('/api/amenities', methods=['GET'])
def get_amenities():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get amenities by type (stay, food, or both)
        amenity_type = request.args.get('type', 'both')
        
        if amenity_type in ['stay', 'food']:
            cursor.execute('''
                SELECT * FROM amenities 
                WHERE type = %s OR type = 'both'
                ORDER BY category, name
            ''', (amenity_type,))
        else:
            cursor.execute('SELECT * FROM amenities ORDER BY category, name')
            
        amenities = cursor.fetchall()
        
        # Group amenities by category
        grouped_amenities = {}
        for amenity in amenities:
            category = amenity['category'] or 'Other'
            if category not in grouped_amenities:
                grouped_amenities[category] = []
            grouped_amenities[category].append({
                'id': str(amenity['id']),
                'name': amenity['name']
            })
            
        return jsonify(grouped_amenities)
        
    except Exception as e:
        print("Error fetching amenities:", str(e))
        return jsonify({
            'message': 'Failed to fetch amenities',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/stays/<int:id>/availability', methods=['POST'])
@token_required
def update_stay_availability(current_user, id):
    try:
        data = request.get_json()
        dates = data.get('dates', [])
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verify ownership
        cursor.execute('SELECT host_id FROM stays WHERE id = %s', (id,))
        stay = cursor.fetchone()
        if not stay or stay['host_id'] != current_user['id']:
            return jsonify({'message': 'Stay not found or unauthorized'}), 404
            
        # Update availability
        for date_info in dates:
            cursor.execute('''
                INSERT INTO stay_availability 
                (stay_id, date, is_available, price_override, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                is_available = VALUES(is_available),
                price_override = VALUES(price_override),
                updated_at = VALUES(updated_at)
            ''', (
                id, 
                date_info['date'],
                date_info['is_available'],
                date_info.get('price_override'),
                datetime.now(timezone.utc),
                datetime.now(timezone.utc)
            ))
            
        conn.commit()
        return jsonify({'message': 'Availability updated successfully'})
        
    except Exception as e:
        print("Error updating availability:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({
            'message': 'Failed to update availability',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def optimize_image(image_file):
    try:
        img = Image.open(image_file)
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Calculate new dimensions while maintaining aspect ratio
        max_size = 1920
        ratio = min(max_size/float(img.size[0]), max_size/float(img.size[1]))
        if ratio < 1:
            new_size = tuple([int(x*ratio) for x in img.size])
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Save optimized image
        output = BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        output.seek(0)
        return output
        
    except Exception as e:
        print(f"Error optimizing image: {e}")
        return image_file

@app.route('/api/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    if 'image' not in request.files:
        print("No image in request files")
        return jsonify({'error': 'No image part'}), 400
        
    file = request.files['image']
    title = request.form.get('title', '')
    
    print(f"Processing upload for title: {title}")
    
    if file.filename == '':
        print("Empty filename")
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        try:
            # Create uploads directory if it doesn't exist
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            
            # Optimize image
            optimized = optimize_image(file)
            
            # Generate filename using title and original extension
            safe_title = secure_filename(title) if title else 'untitled'
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            original_ext = os.path.splitext(file.filename)[1]
            filename = f"{safe_title}_{timestamp}{original_ext}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            print(f"Saving file as: {filename}")
            
            # Save optimized image
            with open(filepath, 'wb') as f:
                f.write(optimized.getvalue() if isinstance(optimized, BytesIO) else optimized.read())
            
            # Return URL path that will work with the frontend
            url = f"/uploads/{filename}"
            
            return jsonify({
                'url': url,
                'message': 'File uploaded successfully'
            })
            
        except Exception as e:
            print(f"Error during upload: {str(e)}")
            return jsonify({
                'error': 'Error uploading file',
                'message': str(e)
            }), 500
    else:
        print(f"Invalid file type: {file.filename}")
        return jsonify({'error': f'File type not allowed. Allowed types are: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

# Add this to serve uploaded files
@app.route('/api/uploads/<path:filename>')
def uploaded_file(filename):
    try:
        # First try to serve from the uploads directory
        if os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], filename)):
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
        
        # If not found, try to serve default images from a static directory
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
        if filename in ['default-avatar.png', 'default-food.jpg', 'jollof.jpg', 'mountain.jpg']:
            if os.path.exists(os.path.join(static_dir, filename)):
                return send_from_directory(static_dir, filename)
        
        # If neither found, return 404
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        return jsonify({'error': 'Error serving file'}), 500

@app.route('/api/food-experiences', methods=['GET'])
def get_food_experiences():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Base query
        query = """
            SELECT 
                fe.*,
                u.name as host_name,
                COALESCE(AVG(r.rating), 0) as rating,
                COUNT(DISTINCT r.id) as reviews_count,
                GROUP_CONCAT(DISTINCT fei.image_path) as image_paths
            FROM food_experiences fe
            LEFT JOIN users u ON fe.host_id = u.id
            LEFT JOIN reviews r ON fe.id = r.experience_id
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id 
            WHERE fe.status = 'published'
        """
        params = []

        # Add zipcode filter if provided
        zipcode = request.args.get('zipcode')
        if zipcode:
            query += " AND fe.zipcode = %s"
            params.append(zipcode)
            
        # Add title search if provided
        title = request.args.get('title')
        if title:
            query += " AND fe.title LIKE %s"
            params.append(f"%{title}%")
            
        # Add cuisine type filter if provided
        cuisine_types = request.args.get('cuisine_types')
        if cuisine_types:
            cuisine_list = cuisine_types.split(',')
            print(f"Filtering by cuisine types: {cuisine_list}")
            
            # Use OR with LIKE for each cuisine type for more flexible matching
            cuisine_conditions = []
            for cuisine in cuisine_list:
                cuisine_conditions.append("fe.cuisine_type LIKE %s")
                params.append(f"%{cuisine}%")
                
            if cuisine_conditions:
                query += " AND (" + " OR ".join(cuisine_conditions) + ")"
            
        # Add price range filters if provided
        min_price = request.args.get('min_price')
        if min_price and min_price.isdigit():
            query += " AND fe.price_per_person >= %s"
            params.append(int(min_price))
            
        max_price = request.args.get('max_price')
        if max_price and max_price.isdigit():
            query += " AND fe.price_per_person <= %s"
            params.append(int(max_price))

        # Group by and sort
        query += " GROUP BY fe.id"
        
        sort = request.args.get('sort', 'rating_desc')
        if sort == 'rating_desc':
            query += " ORDER BY rating DESC"
        elif sort == 'price_asc':
            query += " ORDER BY fe.price_per_person ASC"
        elif sort == 'price_desc':
            query += " ORDER BY fe.price_per_person DESC"

        print(f"Executing query: {query}")
        print(f"With params: {params}")
        
        cursor.execute(query, params)
        experiences = cursor.fetchall()
        
        print(f"Found {len(experiences)} experiences")
        
        # Process the results
        for exp in experiences:
            # Handle images
            image_paths = exp.pop('image_paths', '')
            
            if image_paths and image_paths.strip():
                # Only include images that exist in the uploads folder
                valid_images = []
                for path in image_paths.split(','):
                    # Clean the path by removing any order numbers after ':'
                    clean_path = path.split(':')[0].strip()
                    if clean_path:
                        full_path = os.path.join(UPLOAD_FOLDER, clean_path)
                        if os.path.exists(full_path):
                            valid_images.append({
                                'url': get_full_url(f"/uploads/{clean_path}")
                            })
                exp['images'] = valid_images
            else:
                exp['images'] = []  # Empty array if no images
            
            # Format host info
            exp['host'] = {
                'name': exp.pop('host_name'),
                'rating': float(exp.pop('rating', 0)),
                'reviews': int(exp.pop('reviews_count', 0))
            }
            
            # Convert decimal values to float/int
            exp['price_per_person'] = float(exp['price_per_person'])
            if 'latitude' in exp:
                exp['latitude'] = float(exp['latitude']) if exp['latitude'] else 0
            if 'longitude' in exp:
                exp['longitude'] = float(exp['longitude']) if exp['longitude'] else 0
            
            # Ensure all required fields have default values
            exp['location_name'] = exp['location_name'] or 'Location not specified'
            exp['cuisine_type'] = exp['cuisine_type'] or 'Various'
            exp['description'] = exp['description'] or 'No description available'
            
            # Add details field required by FoodCard component
            exp['details'] = {
                'duration': exp.get('duration', ''),
                'groupSize': f"1-{exp.get('max_guests', 4)}",
                'includes': exp.get('includes', '').split(',') if exp.get('includes') else [],
                'language': exp.get('language', 'English'),
                'location': exp['location_name']
            }
        
        return jsonify(experiences)
        
    except Exception as e:
        print("Error fetching food experiences:", str(e))
        return jsonify({'error': 'Failed to fetch food experiences'}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/food-experiences/<int:id>', methods=['GET'])
def get_food_experience(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get food experience details
        cursor.execute("""
            SELECT 
                fe.*,
                u.name as host_name,
                u.image as host_image,
                COALESCE(AVG(r.rating), 0) as rating,
                COUNT(DISTINCT r.id) as reviews_count,
                GROUP_CONCAT(DISTINCT fei.image_path) as image_paths
            FROM food_experiences fe
            LEFT JOIN users u ON fe.host_id = u.id
            LEFT JOIN reviews r ON fe.id = r.experience_id
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.id = %s AND fe.status = 'published'
            GROUP BY fe.id
        """, (id,))
        
        experience = cursor.fetchone()
        
        if not experience:
            return jsonify({'message': 'Experience not found'}), 404
            
        # Handle image paths
        image_paths = experience['image_paths'].split(',') if experience['image_paths'] else []
        images = [{'url': get_full_url(f"/uploads/{img}")} for img in image_paths if img]
        
        # Format the response
        response = {
            'id': experience['id'],
            'title': experience['title'],
            'description': experience['description'],
            'menu_description': experience['menu_description'],
            'price_per_person': float(experience['price_per_person']),
            'cuisine_type': experience['cuisine_type'],
            'images': images,
            'host': {
                'name': experience['host_name'],
                'image': get_full_url(f"/uploads/{experience['host_image']}") if experience['host_image'] else get_full_url('/images/mountain.jpg'),
                'rating': float(experience['rating']),
                'reviews': experience['reviews_count']
            },
            'details': {
                'duration': experience.get('duration', '2 hours'),
                'groupSize': f"Up to {experience.get('max_guests', 8)} guests",
                'includes': ['All ingredients', 'Cooking equipment', 'Recipes to take home'],
                'language': experience.get('language', 'English'),
                'location': f"{experience['city']}, {experience['state']}"
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        print("Error fetching food experience:", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/host/food-experiences/<int:id>', methods=['GET'])
@token_required
def get_host_food_experience_by_id(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                fe.*,
                GROUP_CONCAT(DISTINCT fei.image_path) as image_paths
            FROM food_experiences fe
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.id = %s AND fe.host_id = %s
            GROUP BY fe.id
        """, (id, current_user['id']))
        
        experience = cursor.fetchone()
        
        if not experience:
            return jsonify({'message': 'Experience not found'}), 404
            
        # Format the response
        response = {
            'id': experience['id'],
            'title': experience['title'],
            'description': experience['description'],
            'menu_description': experience['menu_description'],
            'price_per_person': float(experience['price_per_person']),
            'cuisine_type': experience['cuisine_type'],
            'location_name': experience['location_name'],
            'address': experience['address'],
            'zipcode': experience['zipcode'],
            'city': experience['city'],
            'state': experience['state'],
            'latitude': float(experience['latitude']),
            'longitude': float(experience['longitude']),
            'status': experience['status'],
            'images': [{'url': get_full_url(f"/uploads/{img}")} for img in (experience['image_paths'].split(',') if experience['image_paths'] else [])],
            'duration': experience.get('duration', '2 hours'),
            'max_guests': experience.get('max_guests', 8),
            'language': experience.get('language', 'English')
        }
        
        return jsonify(response)
        
    except Exception as e:
        print("Error fetching host food experience:", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/stays', methods=['GET'])
def get_published_stays():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get sort parameter
        sort = request.args.get('sort', 'created_at_desc')
        
        # Build the ORDER BY clause based on sort parameter
        order_by = "s.created_at DESC"  # default sorting
        if sort == 'price_asc':
            order_by = "s.price_per_night ASC"
        elif sort == 'price_desc':
            order_by = "s.price_per_night DESC"
        elif sort == 'rating_desc':
            order_by = "s.created_at DESC"  # fallback to created_at since we don't have ratings yet
        
        # Build the base query
        query = '''
            SELECT 
                s.*,
                u.name as host_name,
                MIN(si.image_path) as image_path,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities
            FROM stays s
            JOIN users u ON s.host_id = u.id
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            WHERE s.status = 'published'
        '''
        params = []

        # Add zipcode filter if provided
        zipcode = request.args.get('zipcode')
        if zipcode:
            query += " AND s.zipcode = %s"
            params.append(zipcode)

        # Add group by and order by
        query += f" GROUP BY s.id ORDER BY {order_by}"
        
        # Execute the query with parameters
        cursor.execute(query, params)
        
        stays = cursor.fetchall()
        
        # Process the results
        for stay in stays:
            stay['price_per_night'] = float(stay['price_per_night'])
            stay['created_at'] = stay['created_at'].isoformat()
            stay['updated_at'] = stay['updated_at'].isoformat()
            
            # Format image URL
            if stay['image_path']:
                stay['image'] = get_full_url(f"/uploads/{stay['image_path']}")
            else:
                stay['image'] = None
                
            # Add host details with mock rating data
            # In the future, this should come from a proper ratings table
            stay['host'] = {
                'name': stay['host_name'],
                'image': '/images/mountain.jpg',
                'rating': 4.5,  # Mock rating
                'reviews': 10   # Mock review count
            }
            
            # Add details
            stay['details'] = {
                'bedrooms': stay['bedrooms'],
                'bathrooms': stay['bedrooms'],  # Assuming 1 bathroom per bedroom
                'maxGuests': stay['max_guests'],
                'amenities': stay['amenities'].split(',') if stay['amenities'] else [],
                'location': stay['location_name'],
                'propertyType': stay['property_type']  # Add property_type to details
            }
            
            # Clean up response
            del stay['host_name']
            del stay['image_path']
            del stay['amenities']
            
            # Process amenities
            if stay['details']['amenities']:
                try:
                    amenity_ids = stay['details']['amenities']
                    cursor.execute('''
                        SELECT name FROM amenities 
                        WHERE id IN ({})
                    '''.format(','.join(['%s'] * len(amenity_ids))), amenity_ids)
                    amenity_names = [row['name'] for row in cursor.fetchall()]
                    stay['details']['amenities'] = amenity_names
                    print(f"Found {len(amenity_names)} amenities for stay {stay['id']}")
                except Exception as e:
                    print(f"Error processing amenities for stay {stay['id']}: {str(e)}")
                    stay['details']['amenities'] = []
            else:
                stay['details']['amenities'] = []
        
        return jsonify(stays)
        
    except Exception as e:
        print("Error fetching stays:", str(e))
        return jsonify({
            'message': 'Failed to fetch stays',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/featured-food', methods=['GET'])
def get_featured_food():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                fe.*,
                u.name as host_name,
                u.image as host_image,
                COALESCE(AVG(r.rating), 0) as rating,
                COUNT(DISTINCT r.id) as reviews_count,
                MIN(fei.image_path) as first_image
            FROM food_experiences fe
            LEFT JOIN users u ON fe.host_id = u.id
            LEFT JOIN reviews r ON fe.id = r.experience_id
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.status = 'published' AND fe.is_featured = TRUE
            GROUP BY fe.id
            ORDER BY rating DESC, reviews_count DESC
            LIMIT 6
        """)
        
        experiences = cursor.fetchall()
        
        # Format the response
        response = []
        for exp in experiences:
            # Get the first image for the card
            image_url = get_full_url(f"/uploads/{exp['first_image']}") if exp['first_image'] else get_full_url('/images/placeholder-food.jpg')
            
            response.append({
                'id': exp['id'],
                'title': exp['title'],
                'description': exp['description'],
                'price_per_person': float(exp['price_per_person']),
                'cuisine_type': exp['cuisine_type'],
                'image': image_url,  # Single image for the card
                'host': {
                    'name': exp['host_name'],
                    'image': get_full_url(f"/uploads/{exp['host_image']}") if exp['host_image'] else get_full_url('/images/mountain.jpg'),
                    'rating': float(exp['rating']),
                    'reviews': exp['reviews_count']
                },
                'location': f"{exp['city']}, {exp['state']}"
            })
        
        return jsonify(response)
        
    except Exception as e:
        print("Error fetching featured food:", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/featured-stays', methods=['GET'])
def get_featured_stays():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get featured stays (limit to 4)
        cursor.execute('''
            SELECT 
                s.*,
                u.name as host_name,
                MIN(si.image_path) as image_path,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities
            FROM stays s
            JOIN users u ON s.host_id = u.id
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            WHERE s.status = 'published' AND s.is_featured = TRUE
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT 4
        ''')
        
        stays = cursor.fetchall()
        
        # Process the results (similar to get_published_stays)
        for stay in stays:
            stay['price_per_night'] = float(stay['price_per_night'])
            stay['created_at'] = stay['created_at'].isoformat()
            stay['updated_at'] = stay['updated_at'].isoformat()
            
            if stay['image_path']:
                stay['image'] = get_full_url(f"/uploads/{stay['image_path']}")
            else:
                stay['image'] = None
                
            stay['host'] = {
                'name': stay['host_name'],
                'image': '/images/mountain.jpg',
                'rating': 4.5,
                'reviews': 10
            }
            
            # Clean up response
            del stay['host_name']
            del stay['image_path']
            del stay['amenities']
            
        return jsonify(stays)
        
    except Exception as e:
        print("Error fetching featured stays:", str(e))
        return jsonify({
            'message': 'Failed to fetch featured stays',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/food-categories', methods=['GET'])
def get_food_categories():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Query to get cuisine types and their counts from published food experiences
        query = """
            SELECT 
                cuisine_type,
                COUNT(*) as count
            FROM food_experiences
            WHERE status = 'published'
            GROUP BY cuisine_type
            ORDER BY count DESC
        """
        
        cursor.execute(query)
        categories = cursor.fetchall()
        
        # Filter out any null or empty cuisine types
        categories = [cat for cat in categories if cat['cuisine_type']]
        
        return jsonify(categories)
        
    except Exception as e:
        print("Error fetching food categories:", str(e))
        return jsonify({'error': 'Failed to fetch food categories'}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/host/stays/<int:id>', methods=['GET'])
@token_required
def get_host_stay(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if the stay exists and belongs to the host
        cursor.execute('''
            SELECT 
                s.*,
                GROUP_CONCAT(
                    DISTINCT CONCAT(si.image_path, ':', COALESCE(si.display_order, 0))
                    ORDER BY si.display_order ASC
                ) as image_data,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities
            FROM stays s
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            WHERE s.id = %s AND s.host_id = %s
            GROUP BY s.id
        ''', (id, current_user['id']))
        
        stay = cursor.fetchone()
        
        if not stay:
            return jsonify({'message': 'Stay not found or unauthorized'}), 404
            
        # Process the results
        stay['price_per_night'] = float(stay['price_per_night'])
        stay['created_at'] = stay['created_at'].isoformat()
        stay['updated_at'] = stay['updated_at'].isoformat()
        
        # Process images
        images = []
        if stay['image_data']:
            for img_data in stay['image_data'].split(','):
                path, order = img_data.split(':')
                images.append({
                    'url': get_full_url(f"/uploads/{path}"),
                    'order': int(order)
                })
        stay['images'] = images
        
        # Process availability
        availability = []
        if stay['availability_data']:
            for avail_data in stay['availability_data'].split(','):
                date, price, is_available = avail_data.split(' ')
                availability.append({
                    'date': date,
                    'price': float(price),
                    'is_available': bool(int(is_available))
                })
        stay['availability'] = availability
        
        # Process amenities
        amenities = []
        if stay['amenities']:
            try:
                amenity_ids = stay['amenities'].split(',')
                cursor.execute('''
                    SELECT name, category
                    FROM amenities a
                    WHERE a.id IN ({})
                '''.format(','.join(['%s'] * len(amenity_ids))), amenity_ids)
                amenities = cursor.fetchall()
                print(f"Found {len(amenities)} amenities for stay {id}")
            except Exception as e:
                print(f"Error fetching amenities for stay {id}: {str(e)}")
                amenities = []
        
        # Add host details
        stay['host'] = {
            'name': stay['host_name'],
            'image': '/default-avatar.png',
            'rating': 4.5,
            'reviews': 10
        }
        
        # Add details
        stay['details'] = {
            'bedrooms': stay['bedrooms'],
            'bathrooms': stay.get('bathrooms', stay['bedrooms']),  # Fallback to bedrooms if bathrooms not set
            'maxGuests': stay['max_guests'],
            'amenities': [amenity['name'] for amenity in amenities],
            'location': stay['location_name']
        }
        
        # Clean up response
        del stay['host_name']
        del stay['image_data']
        del stay['availability_data']
        del stay['amenities']
        
        return jsonify(stay)
        
    except Exception as e:
        print("Error fetching host stay:", str(e))
        return jsonify({
            'message': 'Failed to fetch stay',
            'error': str(e)
        }), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/listings/nearby', methods=['GET'])
def get_nearby_listings():
    try:
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        radius = float(request.args.get('radius', 10))

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Query food experiences
        cursor.execute("""
            SELECT 
                id, 
                title,
                'food' as type,
                latitude,
                longitude,
                (6371 * acos(
                    cos(radians(%s)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(%s)) +
                    sin(radians(%s)) * sin(radians(latitude))
                )) as distance
            FROM food_experiences
            WHERE status = 'published'
            HAVING distance <= %s
            ORDER BY distance
        """, (lat, lng, lat, radius))
        
        food_listings = cursor.fetchall()

        # Query stays with same parameters
        cursor.execute("""
            SELECT 
                id, 
                title,
                'stay' as type,
                latitude,
                longitude,
                (6371 * acos(
                    cos(radians(%s)) * cos(radians(latitude)) *
                    cos(radians(longitude) - radians(%s)) +
                    sin(radians(%s)) * sin(radians(latitude))
                )) as distance
            FROM stays
            WHERE status = 'published'
            HAVING distance <= %s
            ORDER BY distance
        """, (lat, lng, lat, radius))
        
        stay_listings = cursor.fetchall()

        return jsonify(food_listings + stay_listings)
    except Exception as e:
        print("Error fetching nearby listings:", str(e))
        return jsonify({'error': 'Failed to fetch nearby listings'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Make sure to create the directory structure:
# backend/
#   static/
#     images/
#       placeholder-food.jpg

@app.route('/api/host/food-experiences/<int:experience_id>/images', methods=['POST'])
@token_required
def upload_food_experience_images(current_user, experience_id):
    try:
        if 'images' not in request.files:
            return jsonify({'message': 'No images provided'}), 400
            
        files = request.files.getlist('images')
        uploaded_images = []
        
        for file in files:
            if file and allowed_file(file.filename):
                # Generate a secure filename without order numbers
                filename = secure_filename(file.filename)
                base, ext = os.path.splitext(filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                new_filename = f"{base}_{timestamp}{ext}"
                
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)
                file.save(file_path)
                
                # Save image info to database without order number
                conn = get_db_connection()
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO food_experience_images 
                    (experience_id, image_path) 
                    VALUES (%s, %s)
                ''', (experience_id, new_filename))
                
                conn.commit()
                uploaded_images.append(new_filename)
                
        return jsonify({
            'message': 'Images uploaded successfully',
            'images': uploaded_images
        })
        
    except Exception as e:
        print("Error uploading images:", str(e))
        return jsonify({
            'message': 'Failed to upload images',
            'error': str(e)
        }), 500
    

@app.route('/api/stays/<int:id>', methods=['GET'])
def get_stay_details(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get stay with all images, amenities and availability
        cursor.execute('''
            SELECT 
                s.*,
                u.name as host_name,
                GROUP_CONCAT(
                    DISTINCT CONCAT(si.image_path, ':', COALESCE(si.display_order, 0))
                    ORDER BY si.display_order ASC
                ) as image_data,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities,
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        sav.date, ' ',
                        COALESCE(sav.price_override, s.price_per_night), ' ',
                        sav.is_available
                    )
                ) as availability_data
            FROM stays s
            JOIN users u ON s.host_id = u.id
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            LEFT JOIN stay_availability sav ON s.id = sav.stay_id
            WHERE s.id = %s AND s.status = 'published'
            GROUP BY s.id
        ''', (id,))
        
        stay = cursor.fetchone()
        
        if not stay:
            return jsonify({'message': 'Stay not found'}), 404
            
        # Process the results
        stay['price_per_night'] = float(stay['price_per_night'])
        stay['created_at'] = stay['created_at'].isoformat()
        stay['updated_at'] = stay['updated_at'].isoformat()
        
        # Process images
        images = []
        if stay['image_data']:
            for img_data in stay['image_data'].split(','):
                path, order = img_data.split(':')
                images.append({
                    'url': get_full_url(f"/uploads/{path}"),
                    'order': int(order)
                })
        stay['images'] = images
        
        # Process availability
        availability = []
        if stay['availability_data']:
            for avail_data in stay['availability_data'].split(','):
                date, price, is_available = avail_data.split(' ')
                availability.append({
                    'date': date,
                    'price': float(price),
                    'is_available': bool(int(is_available))
                })
        stay['availability'] = availability
        
        # Process amenities
        amenities = []
        if stay['amenities']:
            try:
                amenity_ids = stay['amenities'].split(',')
                cursor.execute('''
                    SELECT name, category
                    FROM amenities a
                    WHERE a.id IN ({})
                '''.format(','.join(['%s'] * len(amenity_ids))), amenity_ids)
                amenities = cursor.fetchall()
                print(f"Found {len(amenities)} amenities for stay {id}")
            except Exception as e:
                print(f"Error fetching amenities for stay {id}: {str(e)}")
                amenities = []
        
        # Add host details
        stay['host'] = {
            'name': stay['host_name'],
            'image': '/default-avatar.png',
            'rating': 4.5,
            'reviews': 10
        }
        
        # Add details
        stay['details'] = {
            'bedrooms': stay['bedrooms'],
            'bathrooms': stay.get('bathrooms', stay['bedrooms']),  # Fallback to bedrooms if bathrooms not set
            'maxGuests': stay['max_guests'],
            'amenities': [amenity['name'] for amenity in amenities],
            'location': stay['location_name']
        }
        
        # Clean up response
        del stay['host_name']
        del stay['image_data']
        del stay['availability_data']
        del stay['amenities']
        
        return jsonify(stay)
        
    except Exception as e:
        print("Error fetching stay:", str(e))
        return jsonify({
            'message': 'Failed to fetch stay',
            'error': str(e)
        }), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/admin/food-experiences/<int:id>/toggle-featured', methods=['POST'])
@token_required
def toggle_food_featured(current_user, id):
    if not current_user.get('is_admin'):
        return jsonify({'message': 'Unauthorized'}), 403
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Toggle the featured status
        cursor.execute("""
            UPDATE food_experiences 
            SET is_featured = NOT is_featured 
            WHERE id = %s
            RETURNING is_featured
        """, (id,))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result is None:
            return jsonify({'message': 'Food experience not found'}), 404
            
        return jsonify({
            'is_featured': result['is_featured']
        })
        
    except Exception as e:
        print("Error toggling food featured status:", str(e))
        return jsonify({'message': 'Internal server error'}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/admin/stays/<int:id>/toggle-featured', methods=['POST'])
@token_required
def toggle_stay_featured(current_user, id):
    if not current_user.get('is_admin'):
        return jsonify({'message': 'Unauthorized'}), 403
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Toggle the featured status
        cursor.execute("""
            UPDATE stays 
            SET is_featured = NOT is_featured 
            WHERE id = %s
            RETURNING is_featured
        """, (id,))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result is None:
            return jsonify({'message': 'Stay not found'}), 404
            
        return jsonify({
            'is_featured': result['is_featured']
        })
        
    except Exception as e:
        print("Error toggling stay featured status:", str(e))
        return jsonify({'message': 'Internal server error'}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/auth/google/verify', methods=['POST'])
def verify_google_token():
    from datetime import datetime, timedelta
    data = request.get_json()
    access_token = data.get('access_token')
    
    if not access_token:
        return jsonify({'message': 'No token provided'}), 400

    try:
        # Verify the token with Google
        userinfo_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )
        
        if not userinfo_response.ok:
            return jsonify({'message': 'Failed to verify Google token'}), 401

        google_data = userinfo_response.json()

        # Check if user exists in our database
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)  # Use dictionary cursor for easier data handling
        
        cur.execute(
            "SELECT id, name, email, is_host FROM users WHERE email = %s",
            (google_data['email'],)
        )
        user = cur.fetchone()

        if user is None:
            # Create new user with a special password for Google users
            placeholder_password = str(uuid.uuid4())
            current_time = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            
            cur.execute(
                """
                INSERT INTO users (name, email, is_host, password, created_at)
                VALUES (%s, %s, false, %s, %s)
                """,
                (google_data['name'], google_data['email'], placeholder_password, current_time)
            )
            conn.commit()
            
            # Get the newly created user
            cur.execute(
                "SELECT id, name, email, is_host FROM users WHERE email = %s",
                (google_data['email'],)
            )
            user = cur.fetchone()
        else:
            # Update existing user to be a host if they're trying to create a listing
            cur.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (user['id'],))
            conn.commit()
            user['is_host'] = True
        
        # Create JWT token
        token = jwt.encode(
            {
                'user_id': user['id'],
                'email': user['email'],
                'exp': datetime.utcnow() + timedelta(days=1)
            },
            app.config['SECRET_KEY']
        )

        return jsonify({
            'token': token,
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email'],
                'is_host': bool(user['is_host']),
                'picture': google_data.get('picture')
            }
        })

    except Exception as e:
        print('Error in Google verification:', str(e))
        return jsonify({'message': 'Failed to verify token'}), 401
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)