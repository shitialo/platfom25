from flask import Blueprint, request, jsonify, g
from functools import wraps
import requests
import jwt
import os
from datetime import datetime, timedelta
from config import config

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

# Sendbird configuration
SENDBIRD_APP_ID = "203C093A-E0DC-4F42-AC0D-2682A7E606FC"
SENDBIRD_API_TOKEN = "14460ce256243a064cdb02acf9c991af8c649abf"
SENDBIRD_API_URL = f"https://api-{SENDBIRD_APP_ID}.sendbird.com/v3"

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            # Decode token
            data = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=["HS256"])
            g.user_id = data['sub']
            g.is_host = data.get('is_host', False)
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(*args, **kwargs)
    
    return decorated

# Generate a Sendbird session token
@chat_bp.route('/token', methods=['GET'])
@token_required
def get_sendbird_token():
    user_id = g.user_id
    
    # Create a session token for Sendbird
    try:
        # Session token expires in 24 hours
        expires_at = datetime.utcnow() + timedelta(days=1)
        
        # Make request to Sendbird API to create a session token
        response = requests.post(
            f"{SENDBIRD_API_URL}/users/{user_id}/token",
            headers={
                "Api-Token": SENDBIRD_API_TOKEN,
                "Content-Type": "application/json"
            },
            json={
                "expires_at": int(expires_at.timestamp())
            }
        )
        
        if response.status_code != 200:
            return jsonify({'message': 'Failed to create Sendbird token'}), 500
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Create or get a Sendbird user
@chat_bp.route('/user', methods=['POST'])
@token_required
def create_or_get_user():
    user_id = g.user_id
    
    # Get user data from request
    data = request.get_json()
    nickname = data.get('nickname', 'User')
    profile_url = data.get('profile_url', '')
    
    try:
        # Check if user exists
        response = requests.get(
            f"{SENDBIRD_API_URL}/users/{user_id}",
            headers={"Api-Token": SENDBIRD_API_TOKEN}
        )
        
        if response.status_code == 200:
            # User exists, update if needed
            response = requests.put(
                f"{SENDBIRD_API_URL}/users/{user_id}",
                headers={
                    "Api-Token": SENDBIRD_API_TOKEN,
                    "Content-Type": "application/json"
                },
                json={
                    "nickname": nickname,
                    "profile_url": profile_url
                }
            )
        else:
            # User doesn't exist, create new user
            response = requests.post(
                f"{SENDBIRD_API_URL}/users",
                headers={
                    "Api-Token": SENDBIRD_API_TOKEN,
                    "Content-Type": "application/json"
                },
                json={
                    "user_id": user_id,
                    "nickname": nickname,
                    "profile_url": profile_url
                }
            )
        
        if response.status_code not in [200, 201]:
            return jsonify({'message': 'Failed to create or update Sendbird user'}), 500
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get channels for a user
@chat_bp.route('/channels', methods=['GET'])
@token_required
def get_channels():
    try:
        response = requests.get(
            f"{SENDBIRD_API_URL}/users/{g.user_id}/my_group_channels",
            headers={"Api-Token": SENDBIRD_API_TOKEN},
            params={
                "limit": 100,
                "order": "latest_last_message"
            }
        )
        
        if response.status_code != 200:
            return jsonify({'message': 'Failed to get channels'}), 500
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get messages for a channel
@chat_bp.route('/channels/<channel_url>/messages', methods=['GET'])
@token_required
def get_messages(channel_url):
    try:
        response = requests.get(
            f"{SENDBIRD_API_URL}/group_channels/{channel_url}/messages",
            headers={"Api-Token": SENDBIRD_API_TOKEN},
            params={
                "limit": 100,
                "reverse": True
            }
        )
        
        if response.status_code != 200:
            return jsonify({'message': 'Failed to get messages'}), 500
        
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500
