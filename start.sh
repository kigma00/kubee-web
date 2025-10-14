#!/bin/bash

# Kubee Web 시작 스크립트
# 프론트엔드와 백엔드를 동시에 시작합니다.

set -e  # 오류 발생 시 스크립트 종료

# .env 파일 로드
if [ -f ".env" ]; then
    echo "📄 .env 파일을 로드합니다..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  .env 파일이 없습니다. env.example을 참고하여 .env 파일을 생성하세요."
    echo "   cp env.example .env"
fi

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
echo "║    🚀 Kubee Web - Kubernetes 보안 스캔 플랫폼 시작 중...     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 현재 디렉토리 확인
if [ ! -f "requirements.txt" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ 오류: kubee_web 디렉토리에서 실행해주세요!${NC}"
    exit 1
fi

# 기존 프로세스 확인 및 종료
echo -e "${YELLOW}🔍 기존 프로세스 확인 중...${NC}"
if pgrep -f "python.*server.py" > /dev/null; then
    echo -e "${YELLOW}⚠️  기존 백엔드 프로세스가 실행 중입니다. 종료합니다...${NC}"
    pkill -f "python.*server.py" || true
    sleep 2
fi

if pgrep -f "npm.*start" > /dev/null; then
    echo -e "${YELLOW}⚠️  기존 프론트엔드 프로세스가 실행 중입니다. 종료합니다...${NC}"
    pkill -f "npm.*start" || true
    sleep 2
fi

# 가상환경 확인 및 활성화
echo -e "${BLUE}🐍 Python 가상환경 확인 중...${NC}"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  가상환경이 없습니다. 생성합니다...${NC}"
    python3 -m venv venv
fi

echo -e "${BLUE}🔧 가상환경 활성화 중...${NC}"
source venv/bin/activate

# Python 의존성 설치 확인
echo -e "${BLUE}📦 Python 의존성 확인 중...${NC}"
if ! python -c "import flask" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Python 의존성을 설치합니다...${NC}"
    pip install -r requirements.txt
fi

# 데이터베이스 초기화 확인
echo -e "${BLUE}🗄️  데이터베이스 초기화 확인 중...${NC}"
if [ ! -f "backend/api/users.db" ]; then
    echo -e "${YELLOW}⚠️  데이터베이스를 초기화합니다...${NC}"
    python backend/api/init_db.py
fi

# Node.js 확인
echo -e "${BLUE}📦 Node.js 환경 확인 중...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다. Node.js를 설치해주세요.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm이 설치되지 않았습니다. npm을 설치해주세요.${NC}"
    exit 1
fi

# 프론트엔드 의존성 설치 확인
echo -e "${BLUE}📦 프론트엔드 의존성 확인 중...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  프론트엔드 의존성을 설치합니다...${NC}"
    cd frontend
    npm install
    cd ..
fi

# 백그라운드에서 백엔드 시작
echo -e "${GREEN}🚀 백엔드 서버 시작 중...${NC}"
cd backend/api
nohup python server.py > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# 백엔드 시작 대기
echo -e "${BLUE}⏳ 백엔드 서버 시작 대기 중...${NC}"
sleep 5

# 백엔드 헬스 체크
echo -e "${BLUE}🏥 백엔드 헬스 체크 중...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:8282/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 백엔드 서버가 정상적으로 시작되었습니다!${NC}"
        break
    else
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ 백엔드 서버 시작에 실패했습니다. 로그를 확인해주세요.${NC}"
            echo -e "${YELLOW}📋 백엔드 로그:${NC}"
            tail -20 logs/backend.log
            exit 1
        fi
        echo -e "${YELLOW}⏳ 백엔드 서버 시작 대기 중... ($i/10)${NC}"
        sleep 2
    fi
done

# 백그라운드에서 프론트엔드 시작
echo -e "${GREEN}🚀 프론트엔드 서버 시작 중...${NC}"
cd frontend
nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 프론트엔드 시작 대기
echo -e "${BLUE}⏳ 프론트엔드 서버 시작 대기 중...${NC}"
sleep 10

# 프론트엔드 헬스 체크
echo -e "${BLUE}🏥 프론트엔드 헬스 체크 중...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 프론트엔드 서버가 정상적으로 시작되었습니다!${NC}"
        break
    else
        if [ $i -eq 15 ]; then
            echo -e "${RED}❌ 프론트엔드 서버 시작에 실패했습니다. 로그를 확인해주세요.${NC}"
            echo -e "${YELLOW}📋 프론트엔드 로그:${NC}"
            tail -20 logs/frontend.log
            exit 1
        fi
        echo -e "${YELLOW}⏳ 프론트엔드 서버 시작 대기 중... ($i/15)${NC}"
        sleep 3
    fi
done

# PID 파일 저장
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 로그 디렉토리 생성
mkdir -p logs

# 성공 메시지
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║    🎉 Kubee Web이 성공적으로 시작되었습니다!                ║"
echo "║                                                              ║"
echo "║    🌐 프론트엔드: http://localhost:3000                     ║"
echo "║    🔧 백엔드 API: http://localhost:8282                      ║"
echo "║    🏥 헬스 체크: http://localhost:8282/health                ║"
echo "║                                                              ║"
echo "║    📋 로그 파일:                                             ║"
echo "║    - 백엔드: logs/backend.log                                ║"
echo "║    - 프론트엔드: logs/frontend.log                           ║"
echo "║                                                              ║"
echo "║    🛑 종료하려면: ./stop.sh                                  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 기본 계정 정보 출력
echo -e "${PURPLE}👤 기본 계정 정보:${NC}"
echo -e "${CYAN}   관리자: admin / admin123${NC}"
echo -e "${CYAN}   보안담당자: security / security123${NC}"
echo -e "${CYAN}   일반사용자: user / user123${NC}"
echo ""

# 로그 모니터링 옵션
echo -e "${YELLOW}💡 팁: 실시간 로그를 보려면 다음 명령어를 사용하세요:${NC}"
echo -e "${CYAN}   tail -f logs/backend.log    # 백엔드 로그${NC}"
echo -e "${CYAN}   tail -f logs/frontend.log   # 프론트엔드 로그${NC}"
echo ""

echo -e "${GREEN}🚀 서비스가 백그라운드에서 실행 중입니다!${NC}"
