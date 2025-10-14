#!/bin/bash

# Kubee Web 상태 확인 스크립트
# 실행 중인 서비스의 상태를 확인합니다.

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로고 출력
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    📊 Kubee Web - 서비스 상태 확인                          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 현재 디렉토리 확인
if [ ! -f "requirements.txt" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ 오류: kubee_web 디렉토리에서 실행해주세요!${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 서비스 상태 확인 중...${NC}"
echo ""

# 백엔드 상태 확인
echo -e "${PURPLE}🔧 백엔드 서버 (포트 8282):${NC}"
if pgrep -f "python.*server.py" > /dev/null; then
    BACKEND_PID=$(pgrep -f "python.*server.py")
    echo -e "${GREEN}   ✅ 실행 중 (PID: $BACKEND_PID)${NC}"
    
    # 헬스 체크
    if curl -s http://localhost:8282/health > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ 헬스 체크 통과${NC}"
        
        # 헬스 체크 상세 정보
        HEALTH_INFO=$(curl -s http://localhost:8282/health 2>/dev/null)
        if [ ! -z "$HEALTH_INFO" ]; then
            echo -e "${CYAN}   📊 시스템 상태:${NC}"
            echo "$HEALTH_INFO" | python3 -m json.tool 2>/dev/null | sed 's/^/      /' || echo "      $HEALTH_INFO"
        fi
    else
        echo -e "${YELLOW}   ⚠️  실행 중이지만 헬스 체크 실패${NC}"
    fi
else
    echo -e "${RED}   ❌ 실행 중이 아님${NC}"
fi

echo ""

# 프론트엔드 상태 확인
echo -e "${PURPLE}🌐 프론트엔드 서버 (포트 3000):${NC}"
if pgrep -f "npm.*start" > /dev/null; then
    FRONTEND_PID=$(pgrep -f "npm.*start")
    echo -e "${GREEN}   ✅ 실행 중 (PID: $FRONTEND_PID)${NC}"
    
    # 프론트엔드 접근 확인
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ 웹 서버 응답 정상${NC}"
    else
        echo -e "${YELLOW}   ⚠️  실행 중이지만 웹 서버 응답 없음${NC}"
    fi
else
    echo -e "${RED}   ❌ 실행 중이 아님${NC}"
fi

echo ""

# 포트 사용 현황
echo -e "${PURPLE}🔌 포트 사용 현황:${NC}"
echo -e "${CYAN}   포트 8282 (백엔드):${NC}"
if lsof -ti:8282 > /dev/null 2>&1; then
    PORT_8282_PID=$(lsof -ti:8282)
    PORT_8282_PROCESS=$(ps -p $PORT_8282_PID -o comm= 2>/dev/null || echo "unknown")
    echo -e "${GREEN}   ✅ 사용 중 (PID: $PORT_8282_PID, 프로세스: $PORT_8282_PROCESS)${NC}"
else
    echo -e "${RED}   ❌ 사용 중이 아님${NC}"
fi

echo -e "${CYAN}   포트 3000 (프론트엔드):${NC}"
if lsof -ti:3000 > /dev/null 2>&1; then
    PORT_3000_PID=$(lsof -ti:3000)
    PORT_3000_PROCESS=$(ps -p $PORT_3000_PID -o comm= 2>/dev/null || echo "unknown")
    echo -e "${GREEN}   ✅ 사용 중 (PID: $PORT_3000_PID, 프로세스: $PORT_3000_PROCESS)${NC}"
else
    echo -e "${RED}   ❌ 사용 중이 아님${NC}"
fi

echo ""

# PID 파일 확인
echo -e "${PURPLE}📁 PID 파일 상태:${NC}"
if [ -f ".backend.pid" ]; then
    BACKEND_PID_FILE=$(cat .backend.pid)
    if kill -0 $BACKEND_PID_FILE 2>/dev/null; then
        echo -e "${GREEN}   ✅ 백엔드 PID 파일 유효 (PID: $BACKEND_PID_FILE)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  백엔드 PID 파일이 있지만 프로세스가 실행 중이 아님${NC}"
    fi
else
    echo -e "${YELLOW}   ℹ️  백엔드 PID 파일 없음${NC}"
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID_FILE=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID_FILE 2>/dev/null; then
        echo -e "${GREEN}   ✅ 프론트엔드 PID 파일 유효 (PID: $FRONTEND_PID_FILE)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  프론트엔드 PID 파일이 있지만 프로세스가 실행 중이 아님${NC}"
    fi
else
    echo -e "${YELLOW}   ℹ️  프론트엔드 PID 파일 없음${NC}"
fi

echo ""

# 로그 파일 확인
echo -e "${PURPLE}📋 로그 파일 상태:${NC}"
if [ -f "logs/backend.log" ]; then
    BACKEND_LOG_SIZE=$(du -h logs/backend.log | cut -f1)
    BACKEND_LOG_LINES=$(wc -l < logs/backend.log)
    echo -e "${GREEN}   ✅ 백엔드 로그: logs/backend.log (크기: $BACKEND_LOG_SIZE, 라인: $BACKEND_LOG_LINES)${NC}"
else
    echo -e "${YELLOW}   ℹ️  백엔드 로그 파일 없음${NC}"
fi

if [ -f "logs/frontend.log" ]; then
    FRONTEND_LOG_SIZE=$(du -h logs/frontend.log | cut -f1)
    FRONTEND_LOG_LINES=$(wc -l < logs/frontend.log)
    echo -e "${GREEN}   ✅ 프론트엔드 로그: logs/frontend.log (크기: $FRONTEND_LOG_SIZE, 라인: $FRONTEND_LOG_LINES)${NC}"
else
    echo -e "${YELLOW}   ℹ️  프론트엔드 로그 파일 없음${NC}"
fi

echo ""

# 데이터베이스 상태 확인
echo -e "${PURPLE}🗄️  데이터베이스 상태:${NC}"
if [ -f "backend/api/users.db" ]; then
    DB_SIZE=$(du -h backend/api/users.db | cut -f1)
    echo -e "${GREEN}   ✅ SQLite 데이터베이스 존재 (크기: $DB_SIZE)${NC}"
    
    # 데이터베이스 연결 테스트
    if python3 -c "import sqlite3; conn = sqlite3.connect('backend/api/users.db'); conn.close()" 2>/dev/null; then
        echo -e "${GREEN}   ✅ 데이터베이스 연결 정상${NC}"
    else
        echo -e "${YELLOW}   ⚠️  데이터베이스 연결 실패${NC}"
    fi
else
    echo -e "${RED}   ❌ 데이터베이스 파일 없음${NC}"
fi

echo ""

# 스캔 결과 디렉토리 확인
echo -e "${PURPLE}📁 스캔 결과 디렉토리:${NC}"
if [ -d "backend/api/scan_results" ]; then
    SCAN_COUNT=$(find backend/api/scan_results -name "*.json" | wc -l)
    echo -e "${GREEN}   ✅ 스캔 결과 디렉토리 존재 (파일 수: $SCAN_COUNT)${NC}"
else
    echo -e "${YELLOW}   ℹ️  스캔 결과 디렉토리 없음${NC}"
fi

echo ""

# 전체 상태 요약
echo -e "${PURPLE}📊 전체 상태 요약:${NC}"

BACKEND_RUNNING=false
FRONTEND_RUNNING=false

if pgrep -f "python.*server.py" > /dev/null && curl -s http://localhost:8282/health > /dev/null 2>&1; then
    BACKEND_RUNNING=true
fi

if pgrep -f "npm.*start" > /dev/null && curl -s http://localhost:3000 > /dev/null 2>&1; then
    FRONTEND_RUNNING=true
fi

if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}   🎉 모든 서비스가 정상적으로 실행 중입니다!${NC}"
    echo -e "${CYAN}   🌐 웹 접속: http://localhost:3000${NC}"
    echo -e "${CYAN}   🔧 API 접속: http://localhost:8282${NC}"
elif [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = false ]; then
    echo -e "${YELLOW}   ⚠️  백엔드는 실행 중이지만 프론트엔드가 실행 중이 아닙니다.${NC}"
elif [ "$BACKEND_RUNNING" = false ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${YELLOW}   ⚠️  프론트엔드는 실행 중이지만 백엔드가 실행 중이 아닙니다.${NC}"
else
    echo -e "${RED}   ❌ 모든 서비스가 실행 중이 아닙니다.${NC}"
    echo -e "${CYAN}   💡 시작하려면: ./start.sh${NC}"
fi

echo ""

# 유용한 명령어 안내
echo -e "${PURPLE}💡 유용한 명령어:${NC}"
echo -e "${CYAN}   ./start.sh     - 서비스 시작${NC}"
echo -e "${CYAN}   ./stop.sh      - 서비스 종료${NC}"
echo -e "${CYAN}   ./dev.sh       - 개발 모드 시작${NC}"
echo -e "${CYAN}   ./status.sh    - 상태 확인 (현재 명령어)${NC}"
echo -e "${CYAN}   tail -f logs/backend.log    - 백엔드 로그 실시간 보기${NC}"
echo -e "${CYAN}   tail -f logs/frontend.log   - 프론트엔드 로그 실시간 보기${NC}"
echo ""
