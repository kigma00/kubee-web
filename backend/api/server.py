"""
Kubernetes Misconfiguration Scanner API Server
원본 k8s-misconfiguration 기반 Flask API 서버
"""

import os
import sys
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# k8s-misconfiguration 서비스 임포트
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'k8s-misconfiguration'))

# Flask 앱 설정
app = Flask(__name__)
CORS(app)

# 환경변수 설정 (기본값)
os.environ.setdefault('FLASK_HOST', '0.0.0.0')
os.environ.setdefault('FLASK_PORT', '8282')
os.environ.setdefault('FLASK_DEBUG', 'false')
os.environ.setdefault('CLONE_BASE_DIR', '/tmp/kube-scan')
os.environ.setdefault('JWT_SECRET_KEY', 'super-secret-key')
os.environ.setdefault('JWT_ALGORITHM', 'HS256')
os.environ.setdefault('JWT_EXPIRATION_HOURS', '24')
os.environ.setdefault('DATABASE_PATH', './users.db')
os.environ.setdefault('SCAN_RESULTS_DIR', './scan_results')
os.environ.setdefault('LOG_DIR', './logs')
os.environ.setdefault('ENVIRONMENT', 'development')

# Register blueprints
from controllers.scan_controller import scanController
from controllers.system_controller import systemController
from controllers.auth_controller import authController
from controllers.health_controller import healthController
from controllers.ai_controller import aiController
from controllers.log_controller import logController

app.register_blueprint(scanController)
app.register_blueprint(systemController)
app.register_blueprint(authController)
app.register_blueprint(healthController)
app.register_blueprint(aiController)
app.register_blueprint(logController)

if __name__ == "__main__":
    print("🚀 Flask API 서버를 시작합니다...")
    print(f"📍 URL: http://{os.getenv('FLASK_HOST', '0.0.0.0')}:{os.getenv('FLASK_PORT', '8282')}")
    print(f"🔧 Debug 모드: {os.getenv('FLASK_DEBUG', 'false')}")
    print(f"🌍 환경: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"🗄️ 데이터베이스: {os.getenv('DATABASE_PATH', './users.db')}")
    
    app.run(
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_PORT', '8282')),
        debug=os.getenv('FLASK_DEBUG', 'false').lower() in {'true', '1', 'yes'}
    )