# backend/listing.py
from flask import Blueprint, request, jsonify, send_from_directory
from utils import get_full_url, allowed_file, optimize_image, token_required # Added optimize_image and token_required
from db import get_db_connection
import os
from config import config
from PIL import Image
from io import BytesIO
from werkzeug.utils import secure_filename
from datetime import datetime, timezone


listing_bp = Blueprint('listing', __name__, url_prefix='/api')

@listing_bp.route('/test-db', methods=['GET'])
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

@listing_bp.route('/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    if 'image' not in request.files:
        return jsonify({'error': 'No image part'}), 400

    file = request.files['image']
    title = request.form.get('title', '')

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        try:
            os.makedirs(config.UPLOAD_FOLDER, exist_ok=True) # Access config through import

            optimized = optimize_image(file)

            safe_title = secure_filename(title) if title else 'untitled'
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            original_ext = os.path.splitext(file.filename)[1]
            filename = f"{safe_title}_{timestamp}{original_ext}"
            filepath = os.path.join(config.UPLOAD_FOLDER, filename) # Access config through import

            with open(filepath, 'wb') as f:
                f.write(optimized.getvalue() if isinstance(optimized, BytesIO) else optimized.read())

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
        return jsonify({'error': f'File type not allowed. Allowed types are: {", ".join(config.ALLOWED_EXTENSIONS)}'}), 400 # Access config through import

@listing_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    try:
        if os.path.exists(os.path.join(config.UPLOAD_FOLDER, filename)): # Access config through import
            return send_from_directory(config.UPLOAD_FOLDER, filename) # Access config through import

        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
        if filename in ['default-avatar.png', 'default-food.jpg', 'jollof.jpg', 'mountain.jpg']:
            if os.path.exists(os.path.join(static_dir, filename)):
                return send_from_directory(static_dir, filename)

        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        print(f"Error serving file {filename}: {str(e)}")
        return jsonify({'error': 'Error serving file'}), 500

@listing_bp.route('/food-experiences', methods=['GET'])
def get_food_experiences():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

        zipcode = request.args.get('zipcode')
        if zipcode:
            query += " AND fe.zipcode = %s"
            params.append(zipcode)

        title = request.args.get('title')
        if title:
            query += " AND fe.title LIKE %s"
            params.append(f"%{title}%")

        cuisine_types = request.args.get('cuisine_types')
        if cuisine_types:
            cuisine_list = cuisine_types.split(',')
            cuisine_conditions = []
            for cuisine in cuisine_list:
                cuisine_conditions.append("fe.cuisine_type LIKE %s")
                params.append(f"%{cuisine}%")

            if cuisine_conditions:
                query += " AND (" + " OR ".join(cuisine_conditions) + ")"

        min_price = request.args.get('min_price')
        if min_price and min_price.isdigit():
            query += " AND fe.price_per_person >= %s"
            params.append(int(min_price))

        max_price = request.args.get('max_price')
        if max_price and max_price.isdigit():
            query += " AND fe.price_per_person <= %s"
            params.append(int(max_price))

        query += " GROUP BY fe.id"

        sort = request.args.get('sort', 'rating_desc')
        if sort == 'rating_desc':
            query += " ORDER BY rating DESC"
        elif sort == 'price_asc':
            query += " ORDER BY fe.price_per_person ASC"
        elif sort == 'price_desc':
            query += " ORDER BY fe.price_per_person DESC"

        cursor.execute(query, params)
        experiences = cursor.fetchall()

        for exp in experiences:
            image_paths = exp.pop('image_paths', '')

            if image_paths and image_paths.strip():
                valid_images = []
                for path in image_paths.split(','):
                    clean_path = path.split(':')[0].strip()
                    if clean_path:
                        full_path = os.path.join(config.UPLOAD_FOLDER, clean_path) # Access config through import
                        if os.path.exists(full_path):
                            valid_images.append({
                                'url': get_full_url(f"/uploads/{clean_path}")
                            })
                exp['images'] = valid_images
            else:
                exp['images'] = []

            exp['host'] = {
                'name': exp.pop('host_name'),
                'rating': float(exp.pop('rating', 0)),
                'reviews': int(exp.pop('reviews_count', 0))
            }

            exp['price_per_person'] = float(exp['price_per_person'])
            if 'latitude' in exp:
                exp['latitude'] = float(exp['latitude']) if exp['latitude'] else 0
            if 'longitude' in exp:
                exp['longitude'] = float(exp['longitude']) if exp['longitude'] else 0

            exp['location_name'] = exp['location_name'] or 'Location not specified'
            exp['cuisine_type'] = exp['cuisine_type'] or 'Various'
            exp['description'] = exp['description'] or 'No description available'

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

@listing_bp.route('/food-experiences/<int:id>', methods=['GET'])
def get_food_experience(id):
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

        image_paths = experience['image_paths'].split(',') if experience['image_paths'] else []
        images = [{'url': get_full_url(f"/uploads/{img}")} for img in image_paths if img]

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
                'image': get_full_url(f"/uploads/{experience['host_image']}") if experience['host_image'] else get_full_url('/api/uploads/mountain.jpg'),
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

@listing_bp.route('/stays', methods=['GET'])
def get_published_stays():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sort = request.args.get('sort', 'created_at_desc')

        order_by = "s.created_at DESC"
        if sort == 'price_asc':
            order_by = "s.price_per_night ASC"
        elif sort == 'price_desc':
            order_by = "s.price_per_night DESC"
        elif sort == 'rating_desc':
            order_by = "s.created_at DESC"

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

        zipcode = request.args.get('zipcode')
        if zipcode:
            query += " AND s.zipcode = %s"
            params.append(zipcode)

        query += f" GROUP BY s.id ORDER BY {order_by}"

        cursor.execute(query, params)

        stays = cursor.fetchall()

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
                'image': '/api/uploads/mountain.jpg',
                'rating': 4.5,
                'reviews': 10
            }

            stay['details'] = {
                'bedrooms': stay['bedrooms'],
                'bathrooms': stay['bedrooms'],
                'maxGuests': stay['max_guests'],
                'amenities': stay['amenities'].split(',') if stay['amenities'] else [],
                'location': stay['location_name'],
                'propertyType': stay['property_type']
            }

            del stay['host_name']
            del stay['image_path']
            del stay['amenities']

            if stay['details']['amenities']:
                try:
                    amenity_ids = stay['details']['amenities']
                    cursor.execute('''
                        SELECT name FROM amenities
                        WHERE id IN ({})
                    '''.format(','.join(['%s'] * len(amenity_ids))), amenity_ids)
                    amenity_names = [row['name'] for row in cursor.fetchall()]
                    stay['details']['amenities'] = amenity_names
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

@listing_bp.route('/featured-food', methods=['GET'])
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

        response = []
        for exp in experiences:
            image_url = get_full_url(f"/uploads/{exp['first_image']}") if exp['first_image'] else get_full_url('/api/uploads/placeholder-food.jpg')

            response.append({
                'id': exp['id'],
                'title': exp['title'],
                'description': exp['description'],
                'price_per_person': float(exp['price_per_person']),
                'cuisine_type': exp['cuisine_type'],
                'image': image_url,
                'host': {
                    'name': exp['host_name'],
                    'image': get_full_url(f"/uploads/{exp['host_image']}") if exp['host_image'] else get_full_url('/api/uploads/mountain.jpg'),
                    'rating': float(exp['rating']),
                    'reviews': exp['reviews_count']
                },
                'location': f"{exp['city']}, {exp['state']}"
            })

        return jsonify(response)

    except Exception as e:
        print("Error fetching featured food:", str(e))
        return jsonify({'message': 'Internal server error'}), 500

@listing_bp.route('/featured-stays', methods=['GET'])
def get_featured_stays():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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
                'image': '/api/uploads/mountain.jpg',
                'rating': 4.5,
                'reviews': 10
            }

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

@listing_bp.route('/food-categories', methods=['GET'])
def get_food_categories():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

@listing_bp.route('/stays/<int:id>', methods=['GET'])
def get_stay_details(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

        stay['price_per_night'] = float(stay['price_per_night'])
        stay['created_at'] = stay['created_at'].isoformat()
        stay['updated_at'] = stay['updated_at'].isoformat()

        images = []
        if stay['image_data']:
            for img_data in stay['image_data'].split(','):
                path, order = img_data.split(':')
                images.append({
                    'url': get_full_url(f"/uploads/{path}"),
                    'order': int(order)
                })
        stay['images'] = images

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

        stay['host'] = {
            'name': stay['host_name'],
            'image': '/api/uploads/default-avatar.png',
            'rating': 4.5,
            'reviews': 10
        }

        stay['details'] = {
            'bedrooms': stay['bedrooms'],
            'bathrooms': stay.get('bathrooms', stay['bedrooms']),
            'maxGuests': stay['max_guests'],
            'amenities': [amenity['name'] for amenity in amenities],
            'location': stay['location_name']
        }

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

@listing_bp.route('/listings/nearby', methods=['GET'])
def get_nearby_listings():
    try:
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        radius = float(request.args.get('radius', 10))

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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