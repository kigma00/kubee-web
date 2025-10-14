"""
AI 서비스 컨트롤러
Kubernetes 보안 AI 기능을 위한 API 엔드포인트
"""

import os
import sys
from flask import Blueprint, request, jsonify
from http import HTTPStatus
from typing import Dict, Any

# AI 서비스 임포트를 위한 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from ai_services.simple_ai import SimpleKubernetesSecurityAI
from auth_utils import require_auth

aiController = Blueprint("ai", __name__)

# AI 서비스 인스턴스 (싱글톤)
_ai_service = None

def get_ai_service():
    """AI 서비스 인스턴스 반환 (싱글톤)"""
    global _ai_service
    if _ai_service is None:
        try:
            _ai_service = SimpleKubernetesSecurityAI()
        except Exception as e:
            print(f"AI 서비스 초기화 실패: {str(e)}")
            return None
    return _ai_service

@aiController.post("/api/ai/chat")
@require_auth
def chat_with_ai(current_user):
    """AI와 일반 대화"""
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "메시지가 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        message = data['message'].strip()
        if not message:
            return jsonify({"error": "메시지가 비어있습니다."}), HTTPStatus.BAD_REQUEST
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({"error": "AI 서비스를 사용할 수 없습니다. OpenAI API 키를 확인해주세요."}), HTTPStatus.SERVICE_UNAVAILABLE
        
        response = ai_service.chat_with_ai(message)
        
        return jsonify({
            "message": "AI 응답 생성 완료",
            "response": response,
            "user": current_user['username']
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"AI 채팅 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@aiController.post("/api/ai/analyze-scan")
@require_auth
def analyze_scan_results(current_user):
    """스캔 결과 AI 분석"""
    try:
        data = request.get_json()
        if not data or 'scan_results' not in data:
            return jsonify({"error": "스캔 결과가 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        scan_results = data['scan_results']
        if not isinstance(scan_results, dict):
            return jsonify({"error": "스캔 결과 형식이 올바르지 않습니다."}), HTTPStatus.BAD_REQUEST
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({"error": "AI 서비스를 사용할 수 없습니다. OpenAI API 키를 확인해주세요."}), HTTPStatus.SERVICE_UNAVAILABLE
        
        analysis = ai_service.analyze_scan_results(scan_results)
        
        return jsonify({
            "message": "스캔 결과 분석 완료",
            "analysis": analysis,
            "scan_id": scan_results.get('id', 'unknown'),
            "user": current_user['username']
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"스캔 결과 분석 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@aiController.post("/api/ai/exploit-scenario")
@require_auth
def generate_exploit_scenario(current_user):
    """익스플로잇 시나리오 생성"""
    try:
        data = request.get_json()
        scan_results = data.get('scan_results') if data else None
        vulnerability_type = data.get('vulnerability_type') if data else None
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({"error": "AI 서비스를 사용할 수 없습니다. OpenAI API 키를 확인해주세요."}), HTTPStatus.SERVICE_UNAVAILABLE
        
        # 스캔 결과가 있는 경우 해당 결과를 기반으로 시나리오 생성
        if scan_results:
            # 스캔 결과에서 발견된 취약점들을 분석하여 시나리오 생성
            findings = scan_results.get('findings', [])
            if findings:
                # 가장 심각한 취약점들을 우선적으로 시나리오 생성에 사용
                critical_findings = [f for f in findings if f.get('severity') == 'critical']
                high_findings = [f for f in findings if f.get('severity') == 'high']
                
                # 취약점 유형 결정
                if critical_findings:
                    vulnerability_type = critical_findings[0].get('ruleId', 'critical_vulnerability')
                elif high_findings:
                    vulnerability_type = high_findings[0].get('ruleId', 'high_vulnerability')
                else:
                    vulnerability_type = findings[0].get('ruleId', 'medium_vulnerability')
        
        scenario = ai_service.generate_exploit_scenario(vulnerability_type, scan_results)
        
        return jsonify({
            "message": "익스플로잇 시나리오 생성 완료",
            "scenario": scenario,
            "vulnerability_type": vulnerability_type,
            "based_on_scan": scan_results is not None,
            "user": current_user['username']
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"익스플로잇 시나리오 생성 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@aiController.post("/api/ai/security-recommendations")
@require_auth
def get_security_recommendations(current_user):
    """보안 권장사항 생성"""
    try:
        data = request.get_json()
        scan_results = data.get('scan_results') if data else None
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({"error": "AI 서비스를 사용할 수 없습니다. OpenAI API 키를 확인해주세요."}), HTTPStatus.SERVICE_UNAVAILABLE
        
        recommendations = ai_service.get_security_recommendations(scan_results)
        
        return jsonify({
            "message": "보안 권장사항 생성 완료",
            "recommendations": recommendations,
            "user": current_user['username']
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"보안 권장사항 생성 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR

@aiController.get("/api/ai/status")
@require_auth
def get_ai_status(current_user):
    """AI 서비스 상태 확인"""
    try:
        ai_service = get_ai_service()
        
        if ai_service:
            return jsonify({
                "status": "available",
                "message": "AI 서비스가 정상적으로 작동 중입니다.",
                "has_knowledge_base": ai_service.vectorstore is not None,
                "model": os.getenv('OPENAI_MODEL', 'gpt-4')
            }), HTTPStatus.OK
        else:
            return jsonify({
                "status": "unavailable",
                "message": "AI 서비스를 사용할 수 없습니다. OpenAI API 키를 확인해주세요.",
                "has_knowledge_base": False,
                "model": None
            }), HTTPStatus.SERVICE_UNAVAILABLE
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"AI 서비스 상태 확인 중 오류가 발생했습니다: {str(e)}",
            "has_knowledge_base": False,
            "model": None
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@aiController.post("/api/ai/chat")
@require_auth
def ai_chat(current_user):
    """AI 채팅"""
    try:
        data = request.get_json()
        message = data.get('message', '') if data else ''
        scan_results = data.get('scan_results') if data else None
        context = data.get('context', {}) if data else {}
        
        if not message:
            return jsonify({"error": "메시지가 필요합니다."}), HTTPStatus.BAD_REQUEST
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({"error": "AI 서비스를 사용할 수 없습니다. OpenAI API 키를 확인해주세요."}), HTTPStatus.SERVICE_UNAVAILABLE
        
        # 채팅 응답 생성
        response = ai_service.chat(message, scan_results, context)
        
        return jsonify({
            "message": "AI 채팅 응답 생성 완료",
            "response": response.get('content', ''),
            "type": response.get('type', 'text'),
            "user": current_user['username']
        }), HTTPStatus.OK
        
    except Exception as e:
        return jsonify({"error": f"AI 채팅 중 오류가 발생했습니다: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR
