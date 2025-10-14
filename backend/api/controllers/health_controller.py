from flask import Blueprint, jsonify
from http import HTTPStatus
import os
import sqlite3
from datetime import datetime

healthController = Blueprint("health", __name__)

@healthController.get("/health")
def health_check():
    """시스템 헬스 체크"""
    try:
        # 기본 상태 정보
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "services": {}
        }
        
        # 데이터베이스 상태 확인
        try:
            db_path = os.path.join(os.path.dirname(__file__), '..', 'users.db')
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                conn.close()
                
                health_status["services"]["database"] = {
                    "status": "healthy",
                    "user_count": user_count
                }
            else:
                health_status["services"]["database"] = {
                    "status": "unhealthy",
                    "error": "Database file not found"
                }
        except Exception as e:
            health_status["services"]["database"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # 스캔 결과 디렉토리 확인
        try:
            scan_results_dir = os.path.join(os.path.dirname(__file__), '..', 'scan_results')
            if os.path.exists(scan_results_dir):
                scan_files = [f for f in os.listdir(scan_results_dir) if f.endswith('.json')]
                health_status["services"]["scan_storage"] = {
                    "status": "healthy",
                    "scan_count": len(scan_files)
                }
            else:
                health_status["services"]["scan_storage"] = {
                    "status": "unhealthy",
                    "error": "Scan results directory not found"
                }
        except Exception as e:
            health_status["services"]["scan_storage"] = {
                "status": "unhealthy",
                "error": str(e)
            }
        
        # 전체 상태 결정
        all_healthy = all(
            service["status"] == "healthy" 
            for service in health_status["services"].values()
        )
        
        if not all_healthy:
            health_status["status"] = "degraded"
        
        return jsonify(health_status), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@healthController.get("/health/ready")
def readiness_check():
    """서비스 준비 상태 확인 (Kubernetes readiness probe용)"""
    try:
        # 필수 서비스들이 준비되었는지 확인
        db_path = os.path.join(os.path.dirname(__file__), '..', 'users.db')
        scan_results_dir = os.path.join(os.path.dirname(__file__), '..', 'scan_results')
        
        if not os.path.exists(db_path):
            return jsonify({"status": "not_ready", "reason": "Database not initialized"}), HTTPStatus.SERVICE_UNAVAILABLE
        
        if not os.path.exists(scan_results_dir):
            return jsonify({"status": "not_ready", "reason": "Scan results directory not found"}), HTTPStatus.SERVICE_UNAVAILABLE
        
        return jsonify({"status": "ready"}), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"status": "not_ready", "error": str(e)}), HTTPStatus.SERVICE_UNAVAILABLE

@healthController.get("/health/live")
def liveness_check():
    """서비스 생존 상태 확인 (Kubernetes liveness probe용)"""
    return jsonify({
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }), HTTPStatus.OK
