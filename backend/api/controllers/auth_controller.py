from flask import Blueprint, request, jsonify
from http import HTTPStatus
from database import db
from auth_utils import hash_password, verify_password, generate_token, blacklist_token, get_current_user, require_auth, require_role

authController = Blueprint("auth", __name__)

@authController.post("/auth/register")
def register():
    """사용자 회원가입"""
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ('username', 'email', 'password')):
            return jsonify({"error": "사용자명, 이메일, 비밀번호가 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        username = data['username'].strip()
        email = data['email'].strip()
        password = data['password']
        role = data.get('role', 'user')
        
        # 입력 검증
        if len(username) < 3:
            return jsonify({"error": "사용자명은 최소 3자 이상이어야 합니다."}), HTTPStatus.BAD_REQUEST
        
        if len(password) < 6:
            return jsonify({"error": "비밀번호는 최소 6자 이상이어야 합니다."}), HTTPStatus.BAD_REQUEST
        
        if '@' not in email:
            return jsonify({"error": "유효한 이메일 주소를 입력해주세요."}), HTTPStatus.BAD_REQUEST
        
        # 비밀번호 해싱
        password_hash = hash_password(password)
        
        # 사용자 생성
        user_id = db.create_user(username, email, password_hash, role)
        
        if user_id is None:
            return jsonify({"error": "사용자명 또는 이메일이 이미 존재합니다."}), HTTPStatus.CONFLICT
        
        return jsonify({
            "message": "회원가입이 완료되었습니다.",
            "user_id": user_id
        }), HTTPStatus.CREATED
        
    except Exception as e:
        return jsonify({"error": f"회원가입 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@authController.post("/auth/login")
def login():
    """사용자 로그인"""
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ('username', 'password')):
            return jsonify({"error": "사용자명과 비밀번호가 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        username = data['username'].strip()
        password = data['password']
        
        # 사용자 조회
        user = db.get_user_by_username(username)
        
        if not user:
            return jsonify({"error": "사용자명 또는 비밀번호가 올바르지 않습니다."}), HTTPStatus.UNAUTHORIZED
        
        if not user['is_active']:
            return jsonify({"error": "비활성화된 계정입니다."}), HTTPStatus.UNAUTHORIZED
        
        # 비밀번호 검증
        if not verify_password(password, user['password_hash']):
            return jsonify({"error": "사용자명 또는 비밀번호가 올바르지 않습니다."}), HTTPStatus.UNAUTHORIZED
        
        # JWT 토큰 생성
        token = generate_token(user['id'], user['username'], user['role'])
        
        return jsonify({
            "message": "로그인 성공",
            "token": token,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role'],
                "created_at": user['created_at']
            }
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"로그인 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@authController.post("/auth/logout")
@require_auth
def logout(current_user):
    """사용자 로그아웃"""
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            blacklist_token(token)
        
        return jsonify({"message": "로그아웃되었습니다."}), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"로그아웃 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@authController.get("/auth/me")
@require_auth
def get_current_user_info(current_user):
    """현재 사용자 정보 조회"""
    return jsonify({
        "user": current_user
    }), HTTPStatus.OK

@authController.get("/users")
@require_auth
def get_users(current_user):
    """사용자 목록 조회 (관리자만)"""
    if current_user['role'] not in ['admin']:
        return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
    
    try:
        users = db.get_all_users()
        return jsonify({"users": users}), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"사용자 목록 조회 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@authController.post("/users")
@require_auth
def create_user(current_user):
    """새 사용자 생성 (관리자만)"""
    if current_user['role'] not in ['admin']:
        return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
    
    try:
        data = request.get_json()
        
        if not data or not all(k in data for k in ('username', 'email', 'password')):
            return jsonify({"error": "사용자명, 이메일, 비밀번호가 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        username = data['username'].strip()
        email = data['email'].strip()
        password = data['password']
        role = data.get('role', 'user')
        
        # 입력 검증
        if len(username) < 3:
            return jsonify({"error": "사용자명은 최소 3자 이상이어야 합니다."}), HTTPStatus.BAD_REQUEST
        
        if len(password) < 6:
            return jsonify({"error": "비밀번호는 최소 6자 이상이어야 합니다."}), HTTPStatus.BAD_REQUEST
        
        if '@' not in email:
            return jsonify({"error": "유효한 이메일 주소를 입력해주세요."}), HTTPStatus.BAD_REQUEST
        
        # 비밀번호 해싱
        password_hash = hash_password(password)
        
        # 사용자 생성
        user_id = db.create_user(username, email, password_hash, role)
        
        if user_id is None:
            return jsonify({"error": "사용자명 또는 이메일이 이미 존재합니다."}), HTTPStatus.CONFLICT
        
        return jsonify({
            "message": "사용자가 생성되었습니다.",
            "user_id": user_id
        }), HTTPStatus.CREATED
        
    except Exception as e:
        return jsonify({"error": f"사용자 생성 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@authController.put("/users/<int:user_id>/role")
@require_auth
def update_user_role(current_user, user_id):
    """사용자 역할 업데이트 (관리자만)"""
    if current_user['role'] not in ['admin']:
        return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
    
    try:
        data = request.get_json()
        
        if not data or 'role' not in data:
            return jsonify({"error": "역할이 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        role = data['role']
        
        if role not in ['user', 'admin', 'security']:
            return jsonify({"error": "유효하지 않은 역할입니다."}), HTTPStatus.BAD_REQUEST
        
        success = db.update_user_role(user_id, role)
        
        if not success:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), HTTPStatus.NOT_FOUND
        
        return jsonify({"message": "사용자 역할이 업데이트되었습니다."}), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"사용자 역할 업데이트 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@authController.delete("/users/<int:user_id>")
@require_auth
def delete_user(current_user, user_id):
    """사용자 삭제 (관리자만)"""
    if current_user['role'] not in ['admin']:
        return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
    
    try:
        # 자기 자신은 삭제할 수 없음
        if current_user['id'] == user_id:
            return jsonify({"error": "자기 자신은 삭제할 수 없습니다."}), HTTPStatus.BAD_REQUEST
        
        success = db.delete_user(user_id)
        
        if not success:
            return jsonify({"error": "사용자를 찾을 수 없습니다."}), HTTPStatus.NOT_FOUND
        
        return jsonify({"message": "사용자가 삭제되었습니다."}), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"사용자 삭제 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
