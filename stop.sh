#!/bin/bash

# Kubee Web 종료 스크립트
# 실행 중인 프론트엔드와 백엔드 프로세스를 안전하게 종료합니다.

set -e  # 오류 발생 시 스크립트 종료

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
echo "║    🛑 Kubee Web - 서비스 종료 중...                         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 현재 디렉토리 확인
if [ ! -f "requirements.txt" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ 오류: kubee_web 디렉토리에서 실행해주세요!${NC}"
    exit 1
fi

# PID 파일에서 프로세스 ID 읽기
BACKEND_PID=""
FRONTEND_PID=""

if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
fi

# 백엔드 프로세스 종료
echo -e "${BLUE}🔍 백엔드 프로세스 확인 중...${NC}"

# PID 파일에서 읽은 프로세스 종료
if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${YELLOW}🛑 백엔드 프로세스 종료 중... (PID: $BACKEND_PID)${NC}"
    kill $BACKEND_PID
    sleep 2
    
    # 강제 종료 확인
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  강제 종료 중...${NC}"
        kill -9 $BACKEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ 백엔드 프로세스가 종료되었습니다.${NC}"
else
    echo -e "${YELLOW}ℹ️  실행 중인 백엔드 프로세스가 없습니다.${NC}"
fi

# 백엔드 프로세스 이름으로 검색하여 종료
if pgrep -f "python.*server.py" > /dev/null; then
    echo -e "${YELLOW}🛑 남은 백엔드 프로세스 종료 중...${NC}"
    pkill -f "python.*server.py"
    sleep 2
    echo -e "${GREEN}✅ 남은 백엔드 프로세스가 종료되었습니다.${NC}"
fi

# 프론트엔드 프로세스 종료
echo -e "${BLUE}🔍 프론트엔드 프로세스 확인 중...${NC}"

# PID 파일에서 읽은 프로세스 종료
if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${YELLOW}🛑 프론트엔드 프로세스 종료 중... (PID: $FRONTEND_PID)${NC}"
    kill $FRONTEND_PID
    sleep 2
    
    # 강제 종료 확인
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  강제 종료 중...${NC}"
        kill -9 $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ 프론트엔드 프로세스가 종료되었습니다.${NC}"
else
    echo -e "${YELLOW}ℹ️  실행 중인 프론트엔드 프로세스가 없습니다.${NC}"
fi

# 프론트엔드 프로세스 이름으로 검색하여 종료
if pgrep -f "npm.*start" > /dev/null; then
    echo -e "${YELLOW}🛑 남은 프론트엔드 프로세스 종료 중...${NC}"
    pkill -f "npm.*start"
    sleep 2
    echo -e "${GREEN}✅ 남은 프론트엔드 프로세스가 종료되었습니다.${NC}"
fi

# Node.js 프로세스 정리 (React 개발 서버)
if pgrep -f "node.*react-scripts" > /dev/null; then
    echo -e "${YELLOW}🛑 React 개발 서버 프로세스 종료 중...${NC}"
    pkill -f "node.*react-scripts"
    sleep 2
    echo -e "${GREEN}✅ React 개발 서버가 종료되었습니다.${NC}"
fi

# 포트 사용 확인 및 정리
echo -e "${BLUE}🔍 포트 사용 확인 중...${NC}"

# 8282 포트 (백엔드) 확인
if lsof -ti:8282 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  8282 포트가 여전히 사용 중입니다. 정리합니다...${NC}"
    lsof -ti:8282 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# 3000 포트 (프론트엔드) 확인
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  3000 포트가 여전히 사용 중입니다. 정리합니다...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# PID 파일 정리
if [ -f ".backend.pid" ]; then
    rm .backend.pid
    echo -e "${GREEN}✅ 백엔드 PID 파일이 삭제되었습니다.${NC}"
fi

if [ -f ".frontend.pid" ]; then
    rm .frontend.pid
    echo -e "${GREEN}✅ 프론트엔드 PID 파일이 삭제되었습니다.${NC}"
fi

# 최종 확인
echo -e "${BLUE}🔍 최종 프로세스 확인 중...${NC}"

REMAINING_PROCESSES=0

if pgrep -f "python.*server.py" > /dev/null; then
    echo -e "${RED}❌ 백엔드 프로세스가 여전히 실행 중입니다.${NC}"
    REMAINING_PROCESSES=$((REMAINING_PROCESSES + 1))
fi

if pgrep -f "npm.*start" > /dev/null; then
    echo -e "${RED}❌ 프론트엔드 프로세스가 여전히 실행 중입니다.${NC}"
    REMAINING_PROCESSES=$((REMAINING_PROCESSES + 1))
fi

if pgrep -f "node.*react-scripts" > /dev/null; then
    echo -e "${RED}❌ React 개발 서버가 여전히 실행 중입니다.${NC}"
    REMAINING_PROCESSES=$((REMAINING_PROCESSES + 1))
fi

# 결과 출력
if [ $REMAINING_PROCESSES -eq 0 ]; then
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    ✅ Kubee Web이 성공적으로 종료되었습니다!                ║"
    echo "║                                                              ║"
    echo "║    🧹 모든 프로세스가 정리되었습니다.                       ║"
    echo "║    📁 PID 파일이 삭제되었습니다.                            ║"
    echo "║    🔌 포트가 해제되었습니다.                                ║"
    echo "║                                                              ║"
    echo "║    🚀 다시 시작하려면: ./start.sh                           ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    ⚠️  일부 프로세스가 여전히 실행 중입니다.                ║"
    echo "║                                                              ║"
    echo "║    💡 수동으로 종료하려면:                                  ║"
    echo "║    pkill -f 'python.*server.py'                             ║"
    echo "║    pkill -f 'npm.*start'                                    ║"
    echo "║    pkill -f 'node.*react-scripts'                           ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    exit 1
fi

echo -e "${PURPLE}📋 로그 파일 위치:${NC}"
echo -e "${CYAN}   - 백엔드: logs/backend.log${NC}"
echo -e "${CYAN}   - 프론트엔드: logs/frontend.log${NC}"
echo ""

echo -e "${GREEN}🛑 Kubee Web 종료 완료!${NC}"
