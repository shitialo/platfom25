# backend/main.py
from flask import Flask, jsonify
from flask_cors import CORS
from config import config
from auth import auth_bp
from host import host_bp
from listing import listing_bp
from admin import admin_bp
from chat import chat_bp
from utils import CustomJSONEncoder
import os

app = Flask(__name__)
app.config.from_object(config)
app.json_encoder = CustomJSONEncoder

# CORS configuration
if os.getenv('FLASK_ENV') == 'production':
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS_PRODUCTION,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"]
        }
    })
else:
    CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS_DEVELOPMENT}})


# Create uploads directory if it doesn't exist
os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(host_bp)
app.register_blueprint(listing_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(chat_bp)

@app.route('/api/test-amenities', methods=['GET'])
def test_amenities_route():
    return jsonify({"message": "Test amenities route works!"})

@app.route('/')
def home():
    return jsonify({"message": "Welcome to the API"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=config.DEBUG)