"""
구조화된 로깅 시스템
사용자 활동, 스캔 과정, 시스템 이벤트를 기록
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

class LogLevel(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    DEBUG = "DEBUG"

class LogCategory(Enum):
    USER_ACTION = "USER_ACTION"
    SCAN_PROCESS = "SCAN_PROCESS"

class StructuredLogger:
    def __init__(self, log_dir: str = "./logs"):
        self.log_dir = log_dir
        os.makedirs(log_dir, exist_ok=True)
        
        # 로그 파일 설정
        self.log_files = {
            LogCategory.USER_ACTION: os.path.join(log_dir, "user_actions.log"),
            LogCategory.SCAN_PROCESS: os.path.join(log_dir, "scan_process.log")
        }
        
        # Python logging 설정
        self._setup_logging()
    
    def _setup_logging(self):
        """Python logging 설정"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(self.log_dir, 'application.log')),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def _write_structured_log(self, category: LogCategory, level: LogLevel, 
                            message: str, data: Dict[str, Any] = None):
        """구조화된 로그를 파일에 기록"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level.value,
            "category": category.value,
            "message": message,
            "data": data or {}
        }
        
        try:
            with open(self.log_files[category], 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            self.logger.error(f"Failed to write log: {e}")
    
    def log_user_action(self, user_id: int, username: str, action: str, 
                       details: Dict[str, Any] = None):
        """사용자 활동 로그"""
        data = {
            "user_id": user_id,
            "username": username,
            "action": action,
            "details": details or {}
        }
        self._write_structured_log(LogCategory.USER_ACTION, LogLevel.INFO, 
                                 f"User {username} performed {action}", data)
    
    def log_scan_start(self, user_id: int, username: str, repo_url: str, 
                      scan_id: str = None):
        """스캔 시작 로그"""
        data = {
            "user_id": user_id,
            "username": username,
            "repo_url": repo_url,
            "scan_id": scan_id or f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "status": "started"
        }
        self._write_structured_log(LogCategory.SCAN_PROCESS, LogLevel.INFO,
                                 f"Scan started for {repo_url}", data)
    
    def log_scan_progress(self, scan_id: str, stage: str, progress: int = None,
                         details: Dict[str, Any] = None):
        """스캔 진행 상황 로그"""
        data = {
            "scan_id": scan_id,
            "stage": stage,
            "progress": progress,
            "details": details or {}
        }
        self._write_structured_log(LogCategory.SCAN_PROCESS, LogLevel.INFO,
                                 f"Scan {scan_id} - {stage}", data)
    
    def log_scan_complete(self, scan_id: str, repo_url: str, files_scanned: int,
                         findings_count: int, duration_seconds: float = None):
        """스캔 완료 로그"""
        data = {
            "scan_id": scan_id,
            "repo_url": repo_url,
            "files_scanned": files_scanned,
            "findings_count": findings_count,
            "duration_seconds": duration_seconds,
            "status": "completed"
        }
        self._write_structured_log(LogCategory.SCAN_PROCESS, LogLevel.INFO,
                                 f"Scan {scan_id} completed", data)
    
    def log_scan_error(self, scan_id: str, repo_url: str, error_message: str,
                      error_type: str = None):
        """스캔 에러 로그"""
        data = {
            "scan_id": scan_id,
            "repo_url": repo_url,
            "error_message": error_message,
            "error_type": error_type,
            "status": "failed"
        }
        self._write_structured_log(LogCategory.SCAN_PROCESS, LogLevel.ERROR,
                                 f"Scan {scan_id} failed: {error_message}", data)
    
    
    def get_logs(self, category: LogCategory = None, limit: int = 100, 
                offset: int = 0) -> list:
        """로그 조회"""
        logs = []
        
        if category:
            files_to_read = [self.log_files[category]]
        else:
            files_to_read = list(self.log_files.values())
        
        for log_file in files_to_read:
            if not os.path.exists(log_file):
                continue
                
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for line in lines[-limit-offset:limit]:
                        try:
                            log_entry = json.loads(line.strip())
                            logs.append(log_entry)
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                self.logger.error(f"Failed to read log file {log_file}: {e}")
        
        # 시간순 정렬 (최신순)
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return logs[offset:offset+limit]

# 전역 로거 인스턴스
logger = StructuredLogger()
