import json
import os
from datetime import datetime
from flask import Blueprint, jsonify, request
from http import HTTPStatus
import sys
import os
import time

# Add the parent directory to the path to import auth utilities
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'api'))
from auth_utils import require_auth
from utils.logger import logger

from services.repo_service import RepoService
from services.scan_service import ScanService


scanController = Blueprint("scan", __name__)


def _perform_scan(repo_url: str, current_user: dict = None):
    if not repo_url:
        return jsonify({"error": "repo-url parameter is required"}), HTTPStatus.BAD_REQUEST

    # 스캔 시작 로깅
    scan_id = f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    start_time = time.time()
    
    if current_user:
        logger.log_user_action(
            current_user['id'], 
            current_user['username'], 
            "scan_started", 
            {"repo_url": repo_url, "scan_id": scan_id}
        )
        logger.log_scan_start(
            current_user['id'], 
            current_user['username'], 
            repo_url, 
            scan_id
        )

    repo_service = RepoService()
    scan_service = ScanService()

    clone_path = None
    try:
        # 저장소 클론 로깅
        logger.log_scan_progress(scan_id, "cloning_repository", 10, {"repo_url": repo_url})
        clone_path = repo_service.clone_repo(repo_url)
        
        # 스캔 실행 로깅
        logger.log_scan_progress(scan_id, "scanning_files", 50, {"repo_url": repo_url})
        scan_result = scan_service.scan_repository(clone_path)

        # 스캔 결과에 메타데이터 추가
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        repo_name = repo_url.split('/')[-1].replace('.git', '')
        
        response = {
            "repoUrl": repo_url,
            "timestamp": timestamp,
            "user": {
                "id": current_user.get("id") if current_user else None,
                "username": current_user.get("username") if current_user else "unknown",
                "role": current_user.get("role") if current_user else "unknown"
            },
            "stats": {
                "filesScanned": scan_result["filesScanned"],
                "findings": len(scan_result["findings"]),
            },
            "findings": scan_result["findings"],
        }

        # 스캔 결과를 파일로 저장
        scan_results_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'api', 'scan_results')
        os.makedirs(scan_results_dir, exist_ok=True)
        
        filename = f"{repo_name}_{timestamp}.json"
        file_path = os.path.join(scan_results_dir, filename)
        
        # 저장 경로 정보 추가
        response["savedTo"] = file_path
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(response, f, ensure_ascii=False, indent=2)

        # 스캔 완료 로깅
        duration = time.time() - start_time
        logger.log_scan_progress(scan_id, "saving_results", 90, {"file_path": file_path})
        logger.log_scan_complete(
            scan_id, 
            repo_url, 
            scan_result["filesScanned"], 
            len(scan_result["findings"]), 
            duration
        )
        
        if current_user:
            logger.log_user_action(
                current_user['id'], 
                current_user['username'], 
                "scan_completed", 
                {
                    "repo_url": repo_url, 
                    "scan_id": scan_id,
                    "files_scanned": scan_result["filesScanned"],
                    "findings": len(scan_result["findings"]),
                    "duration": duration
                }
            )

        return jsonify(response), HTTPStatus.OK
    except ValueError as exc:
        # 스캔 에러 로깅
        logger.log_scan_error(scan_id, repo_url, str(exc), "validation_error")
        return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST
    except Exception as exc:
        # 스캔 에러 로깅
        logger.log_scan_error(scan_id, repo_url, str(exc), "unexpected_error")
        return jsonify({"error": f"Unexpected error: {exc}"}), HTTPStatus.INTERNAL_SERVER_ERROR
    finally:
        if clone_path:
            try:
                repo_service.cleanup(clone_path)
                logger.log_scan_progress(scan_id, "cleanup", 100, {"status": "completed"})
            except Exception as e:
                logger.log_scan_progress(scan_id, "cleanup", 100, {"status": "failed", "error": str(e)})


@scanController.get("/scan")
@require_auth
def scan_repository_get_query(current_user):
    repo_url = request.args.get("repo-url")
    return _perform_scan(repo_url, current_user)


@scanController.get("/scan/history")
@require_auth
def get_scan_history(current_user):
    """스캔 히스토리 조회"""
    try:
        scan_results_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'api', 'scan_results')
        
        if not os.path.exists(scan_results_dir):
            return jsonify({"scans": []}), HTTPStatus.OK
        
        scan_files = []
        for filename in os.listdir(scan_results_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(scan_results_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        scan_data = json.load(f)
                    
                    # 사용자별 필터링
                    scan_user = scan_data.get("user", {})
                    current_user_id = current_user.get("id")
                    current_user_role = current_user.get("role")
                    
                    # 관리자는 모든 스캔을 볼 수 있음
                    # 보안담당자는 모든 스캔을 볼 수 있음 (모니터링 목적)
                    # 일반사용자는 본인 스캔만 볼 수 있음
                    can_view = False
                    if current_user_role == "admin" or current_user_role == "security":
                        can_view = True
                    elif scan_user.get("id") == current_user_id:
                        can_view = True
                    
                    if not can_view:
                        continue
                    
                    # 메타데이터만 추출 (findings는 제외)
                    scan_meta = {
                        "filename": filename,
                        "repoUrl": scan_data.get("repoUrl", ""),
                        "timestamp": scan_data.get("timestamp", ""),
                        "user": scan_user,
                        "stats": scan_data.get("stats", {}),
                        "savedTo": scan_data.get("savedTo", file_path)
                    }
                    scan_files.append(scan_meta)
                except Exception:
                    continue
        
        # 타임스탬프 기준으로 최신순 정렬
        scan_files.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return jsonify({"scans": scan_files}), HTTPStatus.OK
    except Exception as exc:
        return jsonify({"error": f"Failed to load scan history: {exc}"}), HTTPStatus.INTERNAL_SERVER_ERROR


@scanController.get("/scan/<filename>")
@require_auth
def get_scan_result(current_user, filename):
    """특정 스캔 결과 조회"""
    try:
        scan_results_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'api', 'scan_results')
        file_path = os.path.join(scan_results_dir, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Scan result not found"}), HTTPStatus.NOT_FOUND
        
        with open(file_path, 'r', encoding='utf-8') as f:
            scan_data = json.load(f)
        
        return jsonify(scan_data), HTTPStatus.OK
    except Exception as exc:
        return jsonify({"error": f"Failed to load scan result: {exc}"}), HTTPStatus.INTERNAL_SERVER_ERROR
