# backend/host.py
from flask import Blueprint, request, jsonify
from utils import token_required, allowed_file, get_full_url
from db import get_db_connection
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
import os
import json
from config import config # Make sure to import config

host_bp = Blueprint('host', __name__, url_prefix='/api/host')

# Food Experience endpoints
@host_bp.route('/food-experiences', methods=['POST'])
@token_required
def create_food_experience(current_user):
    try:
        data = request.form

        required_fields = [
            'title', 'description', 'location_name', 'price_per_person',
            'cuisine_type', 'menu_description', 'address', 'zipcode',
            'city', 'state', 'latitude', 'longitude'
        ]

        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'message': f'Missing required field: {field}',
                    'field': field
                }), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (current_user['id'],))
        conn.commit()

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
            data.get('status', 'draft'),
            data['address'],
            data['zipcode'],
            data['city'],
            data['state'],
            float(data['latitude']),
            float(data['longitude'])
        )

        cursor.execute(insert_query, values)
        experience_id = cursor.lastrowid

        image_urls = data.get('images', '').split(',') if data.get('images') else []
        for index, image_url in enumerate(image_urls):
            if image_url and image_url.strip():
                filename = image_url.strip().split('/')[-1]
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

@host_bp.route('/food-experiences/<int:id>', methods=['PUT'])
@token_required
def update_host_food_experience(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT host_id FROM food_experiences WHERE id = %s', (id,))
        experience = cursor.fetchone()
        if not experience or experience['host_id'] != current_user['id']:
            return jsonify({'message': 'Experience not found or unauthorized'}), 404

        data = request.form

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

        if 'images[]' in data:
            try:
                image_urls = data.getlist('images[]')
                cursor.execute('DELETE FROM food_experience_images WHERE experience_id = %s', (id,))
                for i, image_url in enumerate(image_urls):
                    if image_url:
                        filename = image_url.split('/')[-1]
                        cursor.execute("""
                            INSERT INTO food_experience_images
                            (experience_id, image_path, display_order)
                            VALUES (%s, %s, %s)
                        """, (id, filename, i))
            except Exception as e:
                print("Error processing images:", str(e))

        conn.commit()

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

@host_bp.route('/food-experiences', methods=['GET'])
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

            if 'price_per_person' in exp:
                exp['price_per_person'] = float(exp['price_per_person'])
            if 'latitude' in exp:
                exp['latitude'] = float(exp['latitude']) if exp['latitude'] else 0
            if 'longitude' in exp:
                exp['longitude'] = float(exp['longitude']) if exp['longitude'] else 0

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

@host_bp.route('/food-experiences/<int:id>/images', methods=['DELETE'])
@token_required
def delete_food_experience_image(current_user, id):
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        if not image_url:
            return jsonify({'message': 'Image URL is required'}), 400

        filename = image_url.split('/')[-1]

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('''
            SELECT fe.host_id
            FROM food_experiences fe
            JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.id = %s AND fei.image_path = %s
        ''', (id, filename))

        result = cursor.fetchone()
        if not result or result['host_id'] != current_user['id']:
            return jsonify({'message': 'Image not found or unauthorized'}), 404

        cursor.execute('''
            DELETE FROM food_experience_images
            WHERE experience_id = %s AND image_path = %s
        ''', (id, filename))

        cursor.execute('''
            SET @order := -1;
            UPDATE food_experience_images
            SET display_order = (@order := @order + 1)
            WHERE experience_id = %s
            ORDER BY created_at;
        ''', (id,))

        conn.commit()

        try:
            file_path = os.path.join(config.UPLOAD_FOLDER, filename) # Access config through import
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

@host_bp.route('/food-experiences/<int:id>/images/reorder', methods=['POST'])
@token_required
def reorder_food_experience_images(current_user, id):
    try:
        data = request.get_json()
        image_order = data.get('imageOrder', [])

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT host_id FROM food_experiences WHERE id = %s', (id,))
        experience = cursor.fetchone()
        if not experience or experience['host_id'] != current_user['id']:
            return jsonify({'message': 'Experience not found or unauthorized'}), 404

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

@host_bp.route('/food-experiences/<int:id>', methods=['GET'])
@token_required
def get_host_food_experience(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if the food experience exists and belongs to the current user
        query = """
            SELECT
                fe.*,
                GROUP_CONCAT(DISTINCT fei.image_path) as image_paths
            FROM food_experiences fe
            LEFT JOIN food_experience_images fei ON fe.id = fei.experience_id
            WHERE fe.id = %s AND fe.host_id = %s
            GROUP BY fe.id
        """
        
        cursor.execute(query, (id, current_user['id']))
        experience = cursor.fetchone()
        
        if not experience:
            return jsonify({'message': 'Food experience not found or unauthorized'}), 404
            
        # Format the response
        images = []
        if experience['image_paths']:
            for img_path in experience['image_paths'].split(','):
                if img_path:
                    images.append({'url': get_full_url(f"/uploads/{img_path}")})
        
        response = {
            'id': experience['id'],
            'title': experience['title'],
            'description': experience['description'],
            'menu_description': experience['menu_description'],
            'location_name': experience['location_name'],
            'price_per_person': float(experience['price_per_person']),
            'cuisine_type': experience['cuisine_type'],
            'status': experience['status'],
            'address': experience['address'],
            'zipcode': experience['zipcode'],
            'city': experience['city'],
            'state': experience['state'],
            'latitude': float(experience['latitude']),
            'longitude': float(experience['longitude']),
            'images': images
        }
        
        return jsonify(response)
        
    except Exception as e:
        print("Error fetching food experience:", str(e))
        return jsonify({'message': 'Failed to fetch food experience', 'error': str(e)}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

# Stay endpoints
@host_bp.route('/stays', methods=['POST'])
@token_required
def create_stay(current_user):
    try:
        data = request.form

        required_fields = ['title', 'description', 'location_name', 'price_per_night', 'max_guests', 'bedrooms']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        if not current_user['is_host']:
            cursor.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (current_user['id'],))
            current_user['is_host'] = True

        query = '''
            INSERT INTO stays (
                host_id, title, description, location_name, address, zipcode, city, state,
                latitude, longitude, price_per_night, max_guests, bedrooms, bathrooms,
                property_type, beds, created_at, updated_at, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s)
        '''

        beds = data.get('beds')
        if not beds:
            beds = data['bedrooms']

        values = (
            current_user['id'], data['title'], data['description'], data['location_name'],
            data['address'], data['zipcode'], data['city'], data['state'],
            data['latitude'], data['longitude'], data['price_per_night'], data['max_guests'],
            data['bedrooms'], data.get('bathrooms'), data.get('property_type', 'house'),
            beds, data.get('status', 'draft')
        )

        cursor.execute(query, values)
        stay_id = cursor.lastrowid

        if 'amenities' in data:
            try:
                amenities = json.loads(data.get('amenities'))
                for amenity_id in amenities:
                    cursor.execute(
                        'INSERT INTO stay_amenities (stay_id, amenity_id) VALUES (%s, %s)',
                        (stay_id, amenity_id)
                    )
            except Exception as e:
                print("Error processing amenities:", str(e))

        if 'images' in request.files:
            images = request.files.getlist('images')
            for i, image in enumerate(images):
                if image and allowed_file(image.filename):
                    filename = secure_filename(f"{stay_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}.jpg")
                    image_path = os.path.join(config.UPLOAD_FOLDER, filename) # Access config through import
                    image.save(image_path)
                    cursor.execute('''
                        INSERT INTO stay_images
                        (stay_id, image_path, display_order, created_at)
                        VALUES (%s, %s, %s, NOW())
                    ''', (stay_id, filename, i))

        if 'existing_images' in data:
            try:
                existing_images = json.loads(data.get('existing_images'))
                for i, image_url in enumerate(existing_images):
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
        return jsonify({'message': 'Stay created successfully', 'id': stay_id}), 201

    except Exception as e:
        print("Error creating stay:", str(e))
        if 'conn' in locals():
            conn.rollback()
        return jsonify({'message': 'Failed to create stay', 'error': str(e)}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@host_bp.route('/stays', methods=['GET'])
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

        for stay in stays:
            stay['created_at'] = stay['created_at'].isoformat()
            stay['updated_at'] = stay['updated_at'].isoformat()
            stay['price_per_night'] = float(stay['price_per_night'])

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
                except Exception as e:
                    print(f"Error processing images for stay {stay['id']}: {str(e)}")
                    stay['images'] = []
            else:
                stay['images'] = []

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

@host_bp.route('/stays/<int:id>', methods=['PUT'])
@token_required
def update_stay(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT host_id FROM stays WHERE id = %s', (id,))
        stay = cursor.fetchone()
        if not stay or stay['host_id'] != current_user['id']:
            return jsonify({'message': 'Stay not found or unauthorized'}), 404

        data = request.form.to_dict()

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

        beds = data.get('beds')
        if not beds:
            beds = data['bedrooms']

        values = (
            data['title'], data['description'], data['location_name'],
            float(data['price_per_night']), int(data['max_guests']),
            int(data['bedrooms']), int(data.get('bathrooms', data['bedrooms'])),
            data.get('property_type', 'house'), int(beds), data['status'],
            data['address'], data['zipcode'], data['city'], data['state'],
            float(data['latitude']), float(data['longitude']), id
        )
        cursor.execute(update_query, values)

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

        if 'availability' in data:
            availability = json.loads(data['availability'])
            cursor.execute('DELETE FROM stay_availability WHERE stay_id = %s', (id,))
            for avail in availability:
                cursor.execute('''
                    INSERT INTO stay_availability
                    (stay_id, date, is_available, price_override, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                ''', (
                    id, avail['date'], avail['is_available'],
                    avail.get('price_override'), datetime.now(timezone.utc), datetime.now(timezone.utc)
                ))

        if 'images' in request.files:
            images = request.files.getlist('images')
            if images and images[0].filename:
                cursor.execute('SELECT MAX(display_order) as max_order FROM stay_images WHERE stay_id = %s', (id,))
                result = cursor.fetchone()
                next_order = (result['max_order'] or 0) + 1 if result else 0

                for i, image in enumerate(images):
                    if image and allowed_file(image.filename):
                        filename = secure_filename(f"{id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}.jpg")
                        image_path = os.path.join(config.UPLOAD_FOLDER, filename) # Access config through import
                        image.save(image_path)
                        cursor.execute('''
                            INSERT INTO stay_images
                            (stay_id, image_path, display_order, created_at)
                            VALUES (%s, %s, %s, NOW())
                        ''', (id, filename, next_order + i))

        if 'existing_images' in request.form:
            try:
                existing_images = json.loads(request.form.get('existing_images'))

                cursor.execute('SELECT id, image_path FROM stay_images WHERE stay_id = %s', (id,))
                current_images = cursor.fetchall()

                image_map = {}
                for img in current_images:
                    image_path = img['image_path']
                    if image_path.startswith('/uploads/'):
                        image_map[image_path] = img['id']
                    else:
                        image_map[f"/uploads/{image_path}"] = img['id']

                for path, img_id in image_map.items():
                    if path not in existing_images:
                        cursor.execute('DELETE FROM stay_images WHERE id = %s', (img_id,))

            except Exception as e:
                print("Error processing existing images:", str(e))

        conn.commit()

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

        if updated_stay:
            updated_stay['price_per_night'] = float(updated_stay['price_per_night'])
            updated_stay['created_at'] = updated_stay['created_at'].isoformat()
            updated_stay['updated_at'] = updated_stay['updated_at'].isoformat()

            images = []
            if updated_stay['image_data']:
                for img_data in updated_stay['image_data'].split(','):
                    path, order = img_data.split(':')
                    images.append({
                        'url': get_full_url(f"/uploads/{path}"),
                        'order': int(order)
                    })
            updated_stay['images'] = images

            updated_stay['amenities'] = updated_stay['amenities'].split(',') if updated_stay['amenities'] else []

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

@host_bp.route('/stays/<int:id>', methods=['GET'])
@token_required
def get_host_stay(current_user, id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if the stay exists and belongs to the current user
        query = """
            SELECT 
                s.*,
                GROUP_CONCAT(DISTINCT CONCAT(si.image_path, ':', si.display_order)) as image_data,
                GROUP_CONCAT(DISTINCT sa.amenity_id) as amenities,
                GROUP_CONCAT(DISTINCT CONCAT(sa2.date, ' ', COALESCE(sa2.price_override, s.price_per_night), ' ', sa2.is_available)) as availability_data
            FROM stays s
            LEFT JOIN stay_images si ON s.id = si.stay_id
            LEFT JOIN stay_amenities sa ON s.id = sa.stay_id
            LEFT JOIN stay_availability sa2 ON s.id = sa2.stay_id
            WHERE s.id = %s AND s.host_id = %s
            GROUP BY s.id
        """
        
        cursor.execute(query, (id, current_user['id']))
        stay = cursor.fetchone()
        
        if not stay:
            return jsonify({'message': 'Stay not found or unauthorized'}), 404
            
        # Format the response
        images = []
        if stay['image_data']:
            for img_data in stay['image_data'].split(','):
                parts = img_data.split(':')
                if len(parts) >= 1:
                    path = parts[0]
                    order = int(parts[1]) if len(parts) > 1 else 0
                    images.append({
                        'url': get_full_url(f"/uploads/{path}"),
                        'order': order
                    })
        
        amenities = []
        if stay['amenities']:
            amenities = stay['amenities'].split(',')
            
        availability = []
        if stay['availability_data']:
            for avail_data in stay['availability_data'].split(','):
                parts = avail_data.split(' ')
                if len(parts) >= 3:
                    availability.append({
                        'date': parts[0],
                        'price': float(parts[1]),
                        'is_available': bool(int(parts[2]))
                    })
        
        response = {
            'id': stay['id'],
            'title': stay['title'],
            'description': stay['description'],
            'location_name': stay['location_name'],
            'price_per_night': float(stay['price_per_night']),
            'max_guests': int(stay['max_guests']),
            'bedrooms': int(stay['bedrooms']),
            'bathrooms': int(stay['bathrooms']),
            'beds': int(stay['beds']),
            'property_type': stay['property_type'],
            'status': stay['status'],
            'address': stay['address'],
            'zipcode': stay['zipcode'],
            'city': stay['city'],
            'state': stay['state'],
            'latitude': float(stay['latitude']),
            'longitude': float(stay['longitude']),
            'images': images,
            'amenities': amenities,
            'availability': availability,
            'created_at': stay['created_at'].isoformat(),
            'updated_at': stay['updated_at'].isoformat()
        }
        
        return jsonify(response)
        
    except Exception as e:
        print("Error fetching stay:", str(e))
        return jsonify({'message': 'Failed to fetch stay', 'error': str(e)}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@host_bp.route('/amenities', methods=['GET'])
def get_amenities():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

@host_bp.route('/stays/<int:id>/availability', methods=['POST'])
@token_required
def update_stay_availability(current_user, id):
    try:
        data = request.get_json()
        dates = data.get('dates', [])

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT host_id FROM stays WHERE id = %s', (id,))
        stay = cursor.fetchone()
        if not stay or stay['host_id'] != current_user['id']:
            return jsonify({'message': 'Stay not found or unauthorized'}), 404

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
                id, date_info['date'], date_info['is_available'],
                date_info.get('price_override'), datetime.now(timezone.utc), datetime.now(timezone.utc)
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

@host_bp.route('/food-experiences/<int:experience_id>/images', methods=['POST'])
@token_required
def upload_food_experience_images(current_user, experience_id):
    try:
        if 'images' not in request.files:
            return jsonify({'message': 'No images provided'}), 400

        files = request.files.getlist('images')
        uploaded_images = []

        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                base, ext = os.path.splitext(filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                new_filename = f"{base}_{timestamp}{ext}"

                file_path = os.path.join(config.UPLOAD_FOLDER, new_filename) # Access config through import
                file.save(file_path)

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