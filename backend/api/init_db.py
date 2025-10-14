#!/usr/bin/env python3
"""
데이터베이스 초기화 및 기본 사용자 생성 스크립트
"""

from database import db
from auth_utils import hash_password

def init_database():
    """데이터베이스 초기화 및 기본 사용자 생성"""
    print("🗄️ 데이터베이스 초기화 중...")
    
    # 기본 관리자 계정 생성
    admin_user = db.get_user_by_username('admin')
    if not admin_user:
        admin_password = hash_password('admin123')
        admin_id = db.create_user('admin', 'admin@example.com', admin_password, 'admin')
        if admin_id:
            print("✅ 관리자 계정 생성 완료: admin / admin123")
        else:
            print("❌ 관리자 계정 생성 실패")
    else:
        print("ℹ️ 관리자 계정이 이미 존재합니다.")
    
    # 기본 사용자 계정 생성
    user_user = db.get_user_by_username('user')
    if not user_user:
        user_password = hash_password('user123')
        user_id = db.create_user('user', 'user@example.com', user_password, 'user')
        if user_id:
            print("✅ 사용자 계정 생성 완료: user / user123")
        else:
            print("❌ 사용자 계정 생성 실패")
    else:
        print("ℹ️ 사용자 계정이 이미 존재합니다.")
    
    # 보안 담당자 계정 생성
    security_user = db.get_user_by_username('security')
    if not security_user:
        security_password = hash_password('security123')
        security_id = db.create_user('security', 'security@example.com', security_password, 'security')
        if security_id:
            print("✅ 보안 담당자 계정 생성 완료: security / security123")
        else:
            print("❌ 보안 담당자 계정 생성 실패")
    else:
        print("ℹ️ 보안 담당자 계정이 이미 존재합니다.")
    
    print("\n📋 생성된 계정 정보:")
    print("┌─────────────┬──────────────┬──────────┐")
    print("│ 사용자명    │ 비밀번호     │ 역할     │")
    print("├─────────────┼──────────────┼──────────┤")
    print("│ admin       │ admin123     │ admin    │")
    print("│ user        │ user123      │ user     │")
    print("│ security    │ security123  │ security │")
    print("└─────────────┴──────────────┴──────────┘")
    
    print("\n🔐 보안 주의사항:")
    print("- 프로덕션 환경에서는 반드시 기본 비밀번호를 변경하세요!")
    print("- JWT_SECRET_KEY를 안전한 값으로 변경하세요!")
    print("- HTTPS를 사용하여 통신을 암호화하세요!")

if __name__ == "__main__":
    init_database()
