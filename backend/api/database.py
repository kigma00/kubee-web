import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

class Database:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # 현재 스크립트의 디렉토리를 기준으로 데이터베이스 경로 설정
            import os
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(current_dir, "users.db")
        else:
            self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """데이터베이스 테이블 초기화"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 사용자 테이블 생성
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 세션 테이블 생성 (JWT 토큰 블랙리스트용)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_jti TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_connection(self):
        """데이터베이스 연결 반환"""
        conn = sqlite3.connect(self.db_path, timeout=30.0)
        # WAL 모드 활성화 (동시 읽기/쓰기 지원)
        conn.execute("PRAGMA journal_mode=WAL")
        # 외래키 제약 조건 활성화
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
    
    def create_user(self, username: str, email: str, password_hash: str, role: str = 'user') -> Optional[int]:
        """새 사용자 생성"""
        import time
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                conn = self.get_connection()
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO users (username, email, password_hash, role)
                    VALUES (?, ?, ?, ?)
                ''', (username, email, password_hash, role))
                
                user_id = cursor.lastrowid
                conn.commit()
                conn.close()
                
                return user_id
            except sqlite3.IntegrityError:
                return None
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e) and attempt < max_retries - 1:
                    print(f"데이터베이스 잠금 오류, {retry_delay}초 후 재시도... (시도 {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # 지수 백오프
                    continue
                else:
                    raise e
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """사용자명으로 사용자 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, password_hash, role, is_active, created_at
            FROM users WHERE username = ?
        ''', (username,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'password_hash': row[3],
                'role': row[4],
                'is_active': bool(row[5]),
                'created_at': row[6]
            }
        return None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """ID로 사용자 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, password_hash, role, is_active, created_at
            FROM users WHERE id = ?
        ''', (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'password_hash': row[3],
                'role': row[4],
                'is_active': bool(row[5]),
                'created_at': row[6]
            }
        return None
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """모든 사용자 조회"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, username, email, role, is_active, created_at
            FROM users ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [
            {
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'role': row[3],
                'is_active': bool(row[4]),
                'created_at': row[5]
            }
            for row in rows
        ]
    
    def update_user_role(self, user_id: int, role: str) -> bool:
        """사용자 역할 업데이트"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (role, user_id))
            
            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            return success
        except Exception:
            return False
    
    def delete_user(self, user_id: int) -> bool:
        """사용자 삭제"""
        import time
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                conn = self.get_connection()
                cursor = conn.cursor()
                
                # 먼저 사용자가 존재하는지 확인
                cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
                if not cursor.fetchone():
                    conn.close()
                    print(f"사용자 ID {user_id}가 존재하지 않습니다.")
                    return False
                
                # 먼저 관련 세션 삭제 (외래키 제약 조건 해결)
                cursor.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
                print(f"사용자 ID {user_id}의 세션 {cursor.rowcount}개 삭제됨")
                
                cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
                success = cursor.rowcount > 0
                conn.commit()
                conn.close()
                
                if success:
                    print(f"사용자 ID {user_id}가 성공적으로 삭제되었습니다.")
                else:
                    print(f"사용자 ID {user_id} 삭제 실패: rowcount = {cursor.rowcount}")
                
                return success
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e) and attempt < max_retries - 1:
                    print(f"데이터베이스 잠금 오류, {retry_delay}초 후 재시도... (시도 {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    print(f"데이터베이스 오류: {e}")
                    return False
            except Exception as e:
                print(f"사용자 삭제 중 오류: {e}")
                return False
    
    def add_session(self, user_id: int, token_jti: str, expires_at: datetime) -> bool:
        """세션 추가 (토큰 블랙리스트용)"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO sessions (user_id, token_jti, expires_at)
                VALUES (?, ?, ?)
            ''', (user_id, token_jti, expires_at))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception:
            return False
    
    def is_token_blacklisted(self, token_jti: str) -> bool:
        """토큰이 블랙리스트에 있는지 확인"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 1 FROM sessions 
            WHERE token_jti = ? AND expires_at > CURRENT_TIMESTAMP
        ''', (token_jti,))
        
        result = cursor.fetchone() is not None
        conn.close()
        
        return result
    
    def cleanup_expired_sessions(self):
        """만료된 세션 정리"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP')
        conn.commit()
        conn.close()

# 전역 데이터베이스 인스턴스
db = Database()
