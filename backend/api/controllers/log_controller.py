"""
로그 조회 및 관리 API
"""

from flask import Blueprint, jsonify, request
from http import HTTPStatus
import sys
import os

# Add the parent directory to the path to import utilities
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from utils.logger import logger, LogCategory
from auth_utils import require_auth, require_role

logController = Blueprint("logs", __name__)

@logController.get("/api/logs")
@require_auth
def get_logs(current_user):
    """로그 조회"""
    try:
        # 권한 확인 (관리자와 보안담당자만 접근 가능)
        if current_user['role'] not in ['admin', 'security']:
            return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
        
        # 쿼리 파라미터
        category = request.args.get('category')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # 카테고리 변환
        log_category = None
        if category:
            try:
                log_category = LogCategory(category.upper())
            except ValueError:
                return jsonify({"error": "유효하지 않은 카테고리입니다."}), HTTPStatus.BAD_REQUEST
        
        # 로그 조회
        logs = logger.get_logs(category=log_category, limit=limit, offset=offset)
        
        return jsonify({
            "logs": logs,
            "total": len(logs),
            "category": category,
            "limit": limit,
            "offset": offset
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"로그 조회 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@logController.get("/api/logs/categories")
@require_auth
def get_log_categories(current_user):
    """로그 카테고리 목록 조회"""
    try:
        if current_user['role'] not in ['admin', 'security']:
            return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
        
        categories = [
            {"value": "USER_ACTION", "label": "사용자 활동"},
            {"value": "SCAN_PROCESS", "label": "스캔 과정"}
        ]
        
        return jsonify({"categories": categories}), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"카테고리 조회 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@logController.get("/api/logs/stats")
@require_auth
def get_log_stats(current_user):
    """로그 통계 조회"""
    try:
        if current_user['role'] not in ['admin', 'security']:
            return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
        
        # 각 카테고리별 로그 수 조회
        stats = {}
        for category in LogCategory:
            logs = logger.get_logs(category=category, limit=1000)
            stats[category.value] = len(logs)
        
        # 최근 24시간 로그 수
        recent_logs = logger.get_logs(limit=1000)
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        
        recent_count = 0
        for log in recent_logs:
            try:
                log_time = datetime.fromisoformat(log['timestamp'].replace('Z', '+00:00'))
                if log_time >= yesterday:
                    recent_count += 1
            except:
                continue
        
        return jsonify({
            "category_stats": stats,
            "recent_24h": recent_count,
            "total_logs": sum(stats.values())
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"로그 통계 조회 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@logController.post("/api/logs/convert-scan-history")
@require_auth
def convert_scan_history_to_logs(current_user):
    """기존 스캔 히스토리를 로그로 변환"""
    try:
        if current_user['role'] not in ['admin', 'security']:
            return jsonify({"error": "권한이 없습니다."}), HTTPStatus.FORBIDDEN
        
        import json
        import os
        from datetime import datetime
        
        # 스캔 결과 디렉토리에서 파일들 읽기
        scan_results_dir = os.path.join(os.path.dirname(__file__), '..', 'scan_results')
        converted_count = 0
        
        if os.path.exists(scan_results_dir):
            for filename in os.listdir(scan_results_dir):
                if filename.endswith('.json'):
                    file_path = os.path.join(scan_results_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            scan_data = json.load(f)
                        
                        # 스캔 완료 로그 생성
                        scan_id = f"scan_{scan_data.get('timestamp', 'unknown')}"
                        user_info = scan_data.get('user', {})
                        
                        # 사용자 활동 로그
                        logger.log_user_action(
                            user_info.get('id', 0),
                            user_info.get('username', 'unknown'),
                            "scan_completed_legacy",
                            {
                                "repo_url": scan_data.get('repoUrl', ''),
                                "scan_id": scan_id,
                                "files_scanned": scan_data.get('stats', {}).get('filesScanned', 0),
                                "findings": scan_data.get('stats', {}).get('findings', 0),
                                "source": "legacy_scan_result"
                            }
                        )
                        
                        # 스캔 과정 로그
                        logger.log_scan_complete(
                            scan_id,
                            scan_data.get('repoUrl', ''),
                            scan_data.get('stats', {}).get('filesScanned', 0),
                            scan_data.get('stats', {}).get('findings', 0)
                        )
                        
                        converted_count += 1
                        
                    except Exception as e:
                        print(f"Failed to convert {filename}: {e}")
                        continue
        
        return jsonify({
            "message": f"{converted_count}개의 스캔 결과가 로그로 변환되었습니다.",
            "converted_count": converted_count
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"스캔 히스토리 변환 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
