from flask import Blueprint, request, jsonify
from app.services.supabase_service import supabase_admin
from app.middleware.auth_middleware import require_auth

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
@auth_bp.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    name = data.get('name') or (email.split('@')[0] if email else 'User')

    if not email or not password:
        return jsonify({"error": "Email and password are required.", "code": "VALIDATION_ERROR"}), 400

    try:
        res = supabase_admin.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"full_name": name, "name": name}}
        })
        user = res.user
        session = res.session
        return jsonify({
            "user_id": user.id if user else None,
            "email": user.email if user else email,
            "auth_token": session.access_token if session else None,
            "token": session.access_token if session else None,
            "user": {
                "user_id": user.id if user else None,
                "name": name,
                "email": email,
                "email_verified": False
            },
            "refresh_token": session.refresh_token if session else None,
            "message": "Account created! Please check your email to verify."
        }), 201
    except Exception as e:
        err_msg = str(e)
        if "already registered" in err_msg.lower():
            return jsonify({"error": "An account with this email already exists.", "code": "EMAIL_TAKEN"}), 409
        return jsonify({"error": err_msg, "code": "SIGNUP_ERROR"}), 400

@auth_bp.route('/login', methods=['POST'])
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required.", "code": "VALIDATION_ERROR"}), 400

    try:
        res = supabase_admin.auth.sign_in_with_password({"email": email, "password": password})
        user = res.user
        session = res.session
        name = user.user_metadata.get("full_name") or user.user_metadata.get("name") or user.email.split("@")[0]
        return jsonify({
            "user_id": user.id,
            "email": user.email,
            "auth_token": session.access_token,
            "token": session.access_token,
            "refresh_token": session.refresh_token,
            "user": {
                "user_id": user.id,
                "name": name,
                "email": user.email,
                "email_verified": user.email_confirmed_at is not None
            }
        }), 200
    except Exception as e:
        return jsonify({"error": "Invalid email or password.", "code": "INVALID_CREDENTIALS"}), 401

@auth_bp.route('/logout', methods=['POST'])
@auth_bp.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    return jsonify({"message": "Logged out successfully"}), 200

@auth_bp.route('/me', methods=['GET'])
@auth_bp.route('/api/auth/me', methods=['GET'])
@require_auth
def get_me():
    try:
        user_res = supabase_admin.auth.admin.get_user_by_id(request.user_id)
        user = user_res.user
        name = user.user_metadata.get("full_name") or user.user_metadata.get("name") or user.email.split("@")[0]
        return jsonify({
            "user": {
                "user_id": user.id,
                "email": user.email,
                "name": name,
                "email_verified": user.email_confirmed_at is not None,
                "created_at": user.created_at
            }
        }), 200
    except Exception as e:
        return jsonify({
            "user": {
                "user_id": request.user_id,
                "email": request.user_email,
                "name": request.user_name,
                "email_verified": True
            }
        }), 200
