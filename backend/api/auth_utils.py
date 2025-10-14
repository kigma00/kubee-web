import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, jsonify, current_app
from database import db

# JWT 설정
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def hash_password(password: str) -> str:
    """비밀번호 해싱"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def generate_token(user_id: int, username: str, role: str) -> str:
    """JWT 토큰 생성"""
    now = datetime.utcnow()
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'iat': now,
        'exp': now + timedelta(hours=JWT_EXPIRATION_HOURS),
        'jti': f"{user_id}_{now.timestamp()}"  # JWT ID for blacklisting
    }
    
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # 토큰이 블랙리스트에 있는지 확인
        if db.is_token_blacklisted(payload.get('jti')):
            return None
        
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_current_user() -> Optional[Dict[str, Any]]:
    """현재 사용자 정보 반환"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    
    if not payload:
        return None
    
    user = db.get_user_by_id(payload['user_id'])
    if not user or not user['is_active']:
        return None
    
    return {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'created_at': user['created_at']
    }

def require_auth(f):
    """인증이 필요한 엔드포인트 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': '인증이 필요합니다.'}), 401
        
        # 함수에 현재 사용자 정보 전달
        return f(user, *args, **kwargs)
    return decorated_function

def require_role(required_role: str):
    """특정 역할이 필요한 엔드포인트 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'error': '인증이 필요합니다.'}), 401
            
            if user['role'] != required_role and user['role'] != 'admin':
                return jsonify({'error': '권한이 없습니다.'}), 403
            
            return f(user, *args, **kwargs)
        return decorated_function
    return decorator

def blacklist_token(token: str) -> bool:
    """토큰을 블랙리스트에 추가"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload['user_id']
        jti = payload['jti']
        exp = datetime.fromtimestamp(payload['exp'])
        
        return db.add_session(user_id, jti, exp)
    except jwt.InvalidTokenError:
        return False
