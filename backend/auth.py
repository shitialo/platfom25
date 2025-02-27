# backend/auth.py
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timezone, timedelta
from db import get_db_connection
from utils import token_required
from config import config
import uuid
import requests

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not all(k in data for k in ['email', 'password', 'name']):
        missing_fields = [k for k in ['email', 'password', 'name'] if k not in data]
        return jsonify({
            'message': 'Missing required fields',
            'missing_fields': missing_fields
        }), 400

    if not all(data.get(k) for k in ['email', 'password', 'name']):
        empty_fields = [k for k in ['email', 'password', 'name'] if not data.get(k)]
        return jsonify({
            'message': 'Required fields cannot be empty',
            'empty_fields': empty_fields
        }), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT * FROM users WHERE email = %s', (data['email'],))
        if cursor.fetchone():
            return jsonify({'message': 'User already exists'}), 409

        hashed_password = generate_password_hash(data['password'], method='sha256')
        insert_query = '''
            INSERT INTO users (email, password, name, created_at)
            VALUES (%s, %s, %s, %s)
        '''
        values = (data['email'], hashed_password, data['name'], datetime.now(timezone.utc))

        cursor.execute(insert_query, values)
        conn.commit()

        cursor.execute(
            'SELECT id, email, name, created_at FROM users WHERE email = %s',
            (data['email'],)
        )
        user = cursor.fetchone()

        if not user:
            raise Exception("User was not created successfully")

        user['created_at'] = user['created_at'].isoformat()

        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.now(timezone.utc) + timedelta(days=7)
        }, config.SECRET_KEY, algorithm="HS256")

        return jsonify({
            'user': user,
            'token': token
        }), 201

    except Exception as e:
        print("Error during registration:", str(e))
        return jsonify({
            'message': 'Registration failed',
            'error': str(e)
        }), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@auth_bp.route('/login', methods=['POST'])
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

        user.pop('password', None)
        user['is_host'] = bool(user['is_host'])

        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.now(timezone.utc) + timedelta(days=7)
        }, config.SECRET_KEY, algorithm="HS256")

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

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute('SELECT id, name, email, is_host FROM users WHERE id = %s', (current_user['id'],))
        user = cursor.fetchone()

        if not user:
            return jsonify({'message': 'User not found'}), 404

        user['is_host'] = bool(user['is_host'])

        cursor.execute('''
            SELECT
                (SELECT COUNT(*) FROM food_experiences WHERE host_id = %s) as food_count,
                (SELECT COUNT(*) FROM stays WHERE host_id = %s) as stay_count
        ''', (user['id'], user['id']))
        counts = cursor.fetchone()

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

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    return jsonify({'message': 'Successfully logged out'})

@auth_bp.route('/google/verify', methods=['POST'])
def verify_google_token():
    data = request.get_json()
    access_token = data.get('access_token')

    if not access_token:
        return jsonify({'message': 'No token provided'}), 400

    try:
        userinfo_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'}
        )

        if not userinfo_response.ok:
            return jsonify({'message': 'Failed to verify Google token'}), 401

        google_data = userinfo_response.json()

        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            "SELECT id, name, email, is_host FROM users WHERE email = %s",
            (google_data['email'],)
        )
        user = cur.fetchone()

        if user is None:
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

            cur.execute(
                "SELECT id, name, email, is_host FROM users WHERE email = %s",
                (google_data['email'],)
            )
            user = cur.fetchone()
        else:
            cur.execute('UPDATE users SET is_host = TRUE WHERE id = %s', (user['id'],))
            conn.commit()
            user['is_host'] = True

        token = jwt.encode(
            {
                'user_id': user['id'],
                'email': user['email'],
                'exp': datetime.utcnow() + timedelta(days=1)
            },
            config.SECRET_KEY
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
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()