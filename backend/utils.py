# backend/utils.py
import os
from flask import jsonify, request
from functools import wraps, lru_cache
import jwt
from config import config
from decimal import Decimal
from flask.json import JSONEncoder
from PIL import Image
from io import BytesIO
import time
from werkzeug.utils import secure_filename
from datetime import datetime, timezone

def get_full_url(path):
    if not path:
        return None
    if path.startswith('http'):
        return path
    base_url = config.BASE_URL
    return f"{base_url}/api/{path}"

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in config.ALLOWED_EXTENSIONS

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, config.SECRET_KEY, algorithms=["HS256"])
            from db import get_db_connection
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT * FROM users WHERE id = %s', (data['user_id'],))
            current_user = cursor.fetchone()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Token verification error: {e}")  # Log error for debugging
            return jsonify({'message': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)

    return decorated

class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

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

def cleanup_thumbnails(max_age_days=7):
    """Remove thumbnails older than max_age_days"""
    thumb_dir = os.path.join(config.UPLOAD_FOLDER, 'thumbnails') # Access config here
    if not os.path.exists(thumb_dir):
        return

    cutoff = time.time() - (max_age_days * 24 * 60 * 60)

    for filename in os.listdir(thumb_dir):
        filepath = os.path.join(thumb_dir, filename)
        if os.path.getmtime(filepath) < cutoff:
            try:
                os.remove(filepath)
                print(f"Removed old thumbnail: {filename}")
            except Exception as e:
                print(f"Error removing {filename}: {str(e)}")