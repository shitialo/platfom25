# backend/admin.py
from flask import Blueprint, request, jsonify
from utils import token_required
from db import get_db_connection

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/food-experiences/<int:id>/toggle-featured', methods=['POST'])
@token_required
def toggle_food_featured(current_user, id):
    if not current_user.get('is_admin'):
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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

@admin_bp.route('/stays/<int:id>/toggle-featured', methods=['POST'])
@token_required
def toggle_stay_featured(current_user, id):
    if not current_user.get('is_admin'):
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

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