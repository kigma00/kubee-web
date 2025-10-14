"""
간단한 Kubernetes 보안 AI 서비스
메모리 없이 RAG 기반 질의응답 제공
"""

import os
import requests
import base64
from typing import Dict, Any, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

class SimpleKubernetesSecurityAI:
    """간단한 Kubernetes 보안 AI 서비스"""
    
    def __init__(self, openai_api_key: str = None):
        """
        AI 서비스 초기화
        
        Args:
            openai_api_key: OpenAI API 키 (없으면 환경변수에서 로드)
        """
        # OpenAI API 키 설정
        self.api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API 키가 설정되지 않았습니다.")
        
        # OpenAI 모델 초기화
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=self.api_key,
            temperature=0.1
        )
        
        # 임베딩 모델 초기화
        self.embeddings = OpenAIEmbeddings(api_key=self.api_key)
        
        # 텍스트 분할기 초기화
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        # 벡터 저장소 초기화
        self.vectorstore = None
        
        # 지식베이스 로드
        self._load_knowledge_base()
    
    def _load_knowledge_base(self):
        """Kubernetes 보안 지식베이스 로드"""
        try:
            # 지식베이스 파일 경로 (여러 경로 시도)
            possible_paths = [
                os.path.join(os.path.dirname(__file__), '..', 'ai_knowledge', 'kubernetes_security_knowledge.md'),
                os.path.join(os.path.dirname(__file__), '..', '..', 'ai_knowledge', 'kubernetes_security_knowledge.md'),
                './ai_knowledge/kubernetes_security_knowledge.md',
                '../ai_knowledge/kubernetes_security_knowledge.md'
            ]
            
            knowledge_file = None
            for path in possible_paths:
                if os.path.exists(path):
                    knowledge_file = path
                    break
            
            if knowledge_file:
                print(f"📁 지식베이스 파일 발견: {knowledge_file}")
                with open(knowledge_file, 'r', encoding='utf-8') as f:
                    knowledge_text = f.read()
                
                print(f"📖 지식베이스 텍스트 길이: {len(knowledge_text)} 문자")
                
                # 텍스트 분할
                texts = self.text_splitter.split_text(knowledge_text)
                print(f"📝 텍스트 청크 수: {len(texts)}")
                
                # 벡터 저장소 생성
                self.vectorstore = FAISS.from_texts(texts, self.embeddings)
                
                print("✅ Kubernetes 보안 지식베이스가 성공적으로 로드되었습니다.")
            else:
                print("⚠️ 지식베이스 파일을 찾을 수 없습니다. 기본 응답을 사용합니다.")
                print(f"시도한 경로들: {possible_paths}")
                
        except Exception as e:
            print(f"❌ 지식베이스 로드 중 오류 발생: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def chat_with_ai(self, query: str) -> str:
        """
        AI와 일반 대화
        
        Args:
            query: 사용자 질문
            
        Returns:
            AI 응답
        """
        try:
            if self.vectorstore:
                # RAG 기반 응답
                docs = self.vectorstore.similarity_search(query, k=3)
                context = "\n\n".join([doc.page_content for doc in docs])
                
                prompt = f"""
                다음 Kubernetes 보안 지식베이스를 참고하여 질문에 답변해주세요:

                지식베이스:
                {context}

                질문: {query}

                답변 시 다음 사항을 고려해주세요:
                1. 구체적이고 실용적인 조언 제공
                2. 보안 모범 사례 강조
                3. 가능한 경우 구체적인 명령어나 설정 예시 포함
                4. 한국어로 답변
                """
                
                response = self.llm.invoke(prompt)
                return response.content
            else:
                # 기본 응답
                return self._get_default_response(query)
                
        except Exception as e:
            return f"AI 응답 생성 중 오류가 발생했습니다: {str(e)}"
    
    def analyze_scan_results(self, scan_results: Dict[str, Any]) -> str:
        """
        스캔 결과 AI 분석
        
        Args:
            scan_results: 스캔 결과 데이터
            
        Returns:
            분석 결과
        """
        try:
            # 스캔 결과를 텍스트로 변환
            scan_text = self._format_scan_results(scan_results) # Ensure this is called for full data
            
            # 분석 쿼리 생성
            analysis_query = f"""
            다음 Kubernetes 스캔 결과를 분석해주세요:
            
            {scan_text}
            
            다음 항목들을 포함해서 분석해주세요:
            1. 전체적인 보안 상태 평가
            2. 발견된 문제들의 심각도별 분류
            3. 우선순위가 높은 문제들
            4. 구체적인 수정 권장사항
            5. 향후 예방 방안
            """
            
            if self.vectorstore:
                docs = self.vectorstore.similarity_search(analysis_query, k=5)
                context = "\n\n".join([doc.page_content for doc in docs])
                
                # 상세한 스캔 결과 정보 추가
                findings = scan_results.get('findings', [])
                stats = scan_results.get('stats', {})
                
                # 저장소명 추출
                repo_name = scan_results.get('repository_name', 'Unknown')
                if repo_name == 'Unknown':
                    repo_url = scan_results.get('repoUrl', '')
                    if repo_url:
                        repo_name = repo_url.split('/')[-1].replace('.git', '')
                
                # 발견된 문제들을 상세히 포맷팅 (실제 코드 기반 분석 포함)
                detailed_findings = ""
                for i, finding in enumerate(findings[:10], 1):  # 최대 10개까지 표시 (실제 코드 분석으로 인해 줄임)
                    rule_id = finding.get('ruleId', 'Unknown')
                    severity = finding.get('severity', 'Unknown')
                    description = finding.get('description', 'No description')
                    file_path = finding.get('filePath', 'Unknown')
                    line_number = finding.get('lineNumber', 'Unknown')
                    matched_text = finding.get('matchedText', '')
                    
                    # 파일명 추출 (경로에서 마지막 부분만)
                    file_name = file_path.split('/')[-1] if '/' in file_path else file_path
                    
                    # 실제 코드 기반 익스플로잇 분석
                    real_code_analysis = self._analyze_real_code_exploit(finding, scan_results.get('repoUrl', ''))
                    
                    detailed_findings += f"""
{i}. 규칙: {rule_id} (심각도: {severity.upper()})
   파일: {file_name}
   라인: {line_number}
   문제 코드: {matched_text}
   설명: {description}
   
   🔍 코드 컨텍스트 분석:
   - 파일 유형: {self._analyze_file_type(file_name)}
   - 사용 목적: {self._analyze_usage_context(file_name, rule_id)}
   - 실제 위험도: {self._assess_real_risk(rule_id, file_name, matched_text)}
   - 공격 벡터: {self._identify_attack_vectors(rule_id, file_name)}

{real_code_analysis}
"""
                
                if len(findings) > 15:
                    detailed_findings += f"\n... 및 {len(findings) - 15}개 추가 문제"
                
                # 스캔 결과를 텍스트로 변환 (지식베이스용)
                scan_text_formatted = self._format_scan_results(scan_results)
                
                prompt = f"""
                다음 Kubernetes 보안 지식베이스를 참고하여 스캔 결과를 상세히 분석해주세요:

                지식베이스:
                {context}

                스캔 결과 상세 정보:
                {scan_text_formatted}

                다음 항목들을 포함해서 상세히 분석해주세요:
                1. 전체적인 보안 상태 평가
                2. 발견된 문제들의 심각도별 분류 및 상세 분석
                3. 우선순위가 높은 문제들 (Critical, High)
                4. 각 취약점별 공격 시나리오 및 위험도 분석
                  - 각 취약점이 어떻게 악용될 수 있는지
                  - 구체적인 공격 방법과 단계
                  - 예상되는 피해 및 영향도
                  - 공격자가 사용할 수 있는 도구나 기법
                5. 각 문제에 대한 구체적인 수정 방법과 권장사항
                6. 향후 예방 방안 및 보안 강화 방안
                7. 비즈니스 영향도 분석

                분석 결과를 마크다운 형식으로 작성해주세요:
                """
                
                response = self.llm.invoke(prompt)
                return response.content
            else:
                return self._get_default_scan_analysis(scan_results)
                
        except Exception as e:
            return f"스캔 결과 분석 중 오류가 발생했습니다: {str(e)}"
    
    def generate_exploit_scenario(self, scan_results: Dict[str, Any] = None, vulnerability_type: str = None) -> str:
        """
        익스플로잇 시나리오 생성
        
        Args:
            scan_results: 스캔 결과 데이터 (선택사항)
            vulnerability_type: 특정 취약점 유형 (선택사항)
            
        Returns:
            익스플로잇 시나리오
        """
        try:
            if scan_results and scan_results.get('findings'):
                # 스캔 결과 기반 시나리오 생성
                findings = scan_results.get('findings', [])
                
                if self.vectorstore:
                    # 가장 심각한 취약점 찾기
                    critical_findings = [f for f in findings if f.get('severity') == 'critical']
                    high_findings = [f for f in findings if f.get('severity') == 'high']
                    
                    if critical_findings:
                        target_finding = critical_findings[0]
                    elif high_findings:
                        target_finding = high_findings[0]
                    else:
                        target_finding = findings[0]
                    
                    rule_id = target_finding.get('ruleId', '')
                    severity = target_finding.get('severity', '')
                    matched_text = target_finding.get('matchedText', '')
                    description = target_finding.get('description', '')
                    
                    query = f"""
                    다음 Kubernetes 취약점에 대한 구체적인 익스플로잇 시나리오를 생성해주세요:
                    
                    규칙 ID: {rule_id}
                    심각도: {severity}
                    문제 코드: {matched_text}
                    설명: {description}
                    
                    다음 항목들을 포함해주세요:
                    1. 공격 단계별 상세 설명
                    2. 사용되는 도구와 명령어
                    3. 예상되는 피해
                    4. 방어 및 완화 방법
                    5. 관련 모범 사례
                    """
                else:
                    query = "스캔 결과에서 발견된 취약점에 대한 익스플로잇 시나리오를 생성해주세요."
            else:
                # 일반적인 시나리오 생성
                if vulnerability_type:
                    query = f"'{vulnerability_type}' 취약점에 대한 구체적인 익스플로잇 시나리오를 생성해주세요. 공격 단계, 사용되는 도구, 방어 방법을 포함해주세요."
                else:
                    query = "Kubernetes에서 일반적인 보안 취약점에 대한 익스플로잇 시나리오를 생성해주세요. 공격 단계, 사용되는 도구, 방어 방법을 포함해주세요."
            
            if self.vectorstore:
                docs = self.vectorstore.similarity_search(query, k=3)
                context = "\n\n".join([doc.page_content for doc in docs])
                
                prompt = f"""
                다음 Kubernetes 보안 지식베이스를 참고하여 익스플로잇 시나리오를 생성해주세요:

                지식베이스:
                {context}

                요청사항:
                {query}

                다음 형식으로 작성해주세요:
                1. 공격 개요
                2. 공격 단계 (상세한 명령어 포함)
                3. 사용 도구
                4. 예상 피해
                5. 방어 방법
                6. 관련 모범 사례
                """
                
                response = self.llm.invoke(prompt)
                return response.content
            else:
                return self._get_default_exploit_scenario(vulnerability_type)
                
        except Exception as e:
            return f"익스플로잇 시나리오 생성 중 오류가 발생했습니다: {str(e)}"
    
    def get_security_recommendations(self, scan_results: Dict[str, Any] = None) -> str:
        """
        보안 권장사항 생성
        
        Args:
            scan_results: 스캔 결과 데이터 (선택사항)
            
        Returns:
            보안 권장사항
        """
        try:
            if scan_results and scan_results.get('findings'):
                # 스캔 결과 기반 권장사항
                findings = scan_results.get('findings', [])
                findings_text = "\n".join([
                    f"- {f.get('ruleId', 'Unknown')}: {f.get('description', 'No description')} (심각도: {f.get('severity', 'Unknown')})"
                    for f in findings
                ])
                
                query = f"""
                다음 스캔 결과를 바탕으로 구체적인 보안 권장사항을 제시해주세요:
                
                발견된 문제들:
                {findings_text}
                
                다음 항목들을 포함해주세요:
                1. 즉시 수정해야 할 문제들
                2. 단계별 수정 방법
                3. 예방 방안
                4. 모니터링 권장사항
                """
            else:
                # 일반적인 권장사항
                query = "Kubernetes 클러스터 보안을 위한 종합적인 권장사항을 제시해주세요."
            
            if self.vectorstore:
                docs = self.vectorstore.similarity_search(query, k=3)
                context = "\n\n".join([doc.page_content for doc in docs])
                
                prompt = f"""
                다음 Kubernetes 보안 지식베이스를 참고하여 보안 권장사항을 제시해주세요:

                지식베이스:
                {context}

                요청사항:
                {query}

                다음 형식으로 작성해주세요:
                1. 즉시 조치사항
                2. 단계별 개선 방안
                3. 장기적 보안 전략
                4. 모니터링 및 유지보수
                """
                
                response = self.llm.invoke(prompt)
                return response.content
            else:
                return self._get_default_recommendations()
                
        except Exception as e:
            return f"보안 권장사항 생성 중 오류가 발생했습니다: {str(e)}"
    
    def _format_scan_results(self, scan_results: Dict[str, Any]) -> str:
        """스캔 결과를 텍스트로 포맷팅"""
        try:
            # 기본 정보
            repo_name = scan_results.get('repository_name', 'Unknown')
            if repo_name == 'Unknown':
                repo_url = scan_results.get('repoUrl', '')
                if repo_url:
                    repo_name = repo_url.split('/')[-1].replace('.git', '')
            
            stats = scan_results.get('stats', {})
            findings = scan_results.get('findings', [])
            
            # 통계 정보
            stats_text = f"""
저장소: {repo_name}
스캔된 파일 수: {stats.get('filesScanned', 0)}
발견된 문제 수: {stats.get('findings', 0)}
"""
            
            # 발견된 문제들
            findings_text = ""
            if findings:
                findings_text = "\n발견된 문제들:\n"
                for i, finding in enumerate(findings, 1):
                    findings_text += f"""
{i}. 규칙: {finding.get('ruleId', 'Unknown')}
   심각도: {finding.get('severity', 'Unknown')}
   파일: {finding.get('filePath', 'Unknown')}
   라인: {finding.get('lineNumber', 'Unknown')}
   문제 코드: {finding.get('matchedText', '')}
   설명: {finding.get('description', 'No description')}
"""
            else:
                findings_text = "\n발견된 문제: 없음"
            
            return stats_text + findings_text
            
        except Exception as e:
            return f"스캔 결과 포맷팅 중 오류: {str(e)}"
    
    def _get_default_scan_analysis(self, scan_results: Dict[str, Any]) -> str:
        """기본 스캔 분석 결과"""
        try:
            findings = scan_results.get('findings', [])
            stats = scan_results.get('stats', {})
            
            # 저장소명 추출
            repo_name = scan_results.get('repository_name', 'Unknown')
            if repo_name == 'Unknown':
                repo_url = scan_results.get('repoUrl', '')
                if repo_url:
                    repo_name = repo_url.split('/')[-1].replace('.git', '')
            
            # 심각도별 카운트
            critical_count = len([f for f in findings if f.get('severity') == 'critical'])
            high_count = len([f for f in findings if f.get('severity') == 'high'])
            medium_count = len([f for f in findings if f.get('severity') == 'medium'])
            low_count = len([f for f in findings if f.get('severity') == 'low'])
            
            if len(findings) == 0:
                return f"""
# 스캔 결과 분석

## 📊 요약
- **저장소**: {repo_name}
- **스캔된 파일 수**: {stats.get('filesScanned', 0)}
- **발견된 문제**: {len(findings)}개

## ✅ 보안 상태
이번 스캔에서는 보안 문제가 발견되지 않았습니다. 하지만 이는 스캔 도구가 모든 보안 위협을 탐지할 수 있음을 의미하지 않습니다.

## 🛡️ 권장사항
1. 지속적인 모니터링과 로깅을 유지하세요
2. 정기적인 보안 스캔을 수행하세요
3. 보안 정책을 지속적으로 업데이트하세요
"""
            else:
                # 발견된 문제들을 상세히 분석
                problem_analysis = ""
                attack_scenarios = ""
                
                for i, finding in enumerate(findings[:5], 1):  # 최대 5개까지 표시
                    rule_id = finding.get('ruleId', 'Unknown')
                    severity = finding.get('severity', 'Unknown')
                    description = finding.get('description', 'No description')
                    file_path = finding.get('filePath', 'Unknown')
                    line_number = finding.get('lineNumber', 'Unknown')
                    matched_text = finding.get('matchedText', '')
                    
                    # 파일명 추출 (경로에서 마지막 부분만)
                    file_name = file_path.split('/')[-1] if '/' in file_path else file_path
                    
                    problem_analysis += f"""
{i}. **{rule_id}** (심각도: {severity.upper()})
   - 파일: {file_name}
   - 라인: {line_number}
   - 문제 코드: `{matched_text}`
   - 설명: {description}
"""
                    
                    # 공격 시나리오 생성
                    attack_scenario = self._generate_attack_scenario(rule_id, severity, matched_text, description)
                    attack_scenarios += f"""
### {i}. {rule_id} 공격 시나리오
{attack_scenario}
"""
                
                return f"""
# 스캔 결과 분석

## 📊 요약
- **저장소**: {repo_name}
- **스캔된 파일 수**: {stats.get('filesScanned', 0)}
- **발견된 문제**: {len(findings)}개
  - Critical: {critical_count}개
  - High: {high_count}개
  - Medium: {medium_count}개
  - Low: {low_count}개

## 🚨 발견된 문제들
{problem_analysis}

## 🎯 공격 시나리오
{attack_scenarios}

## 🛡️ 권장사항
1. Critical 및 High 심각도 문제를 즉시 수정하세요
2. 정기적인 보안 스캔을 수행하세요
3. 보안 정책을 강화하세요
4. 모니터링 및 로깅을 강화하세요
"""
                
        except Exception as e:
            return f"기본 분석 생성 중 오류: {str(e)}"
    
    def _generate_attack_scenario(self, rule_id: str, severity: str, matched_text: str, description: str) -> str:
        """특정 취약점에 대한 공격 시나리오 생성"""
        scenarios = {
            "hostPort_used": f"""
**공격 방법:**
1. **포트 스캔**: 공격자가 `{matched_text}` 포트를 스캔하여 서비스 발견
2. **서비스 탐지**: 호스트 포트를 통해 직접 서비스에 접근
3. **취약점 악용**: 서비스의 알려진 취약점을 악용하여 컨테이너 탈출 시도
4. **호스트 접근**: 컨테이너에서 호스트 시스템으로 권한 상승

**예상 피해:**
- 호스트 시스템 직접 접근 가능
- 다른 컨테이너 및 서비스 침해
- 민감한 데이터 유출
- 클러스터 전체 장악 가능

**사용 도구:**
- `nmap`, `masscan` (포트 스캔)
- `kubectl port-forward` (포트 포워딩)
- 컨테이너 탈출 도구들
""",
            "privileged_container": f"""
**공격 방법:**
1. **권한 확인**: privileged 컨테이너 내부에서 `capsh --print` 실행
2. **호스트 접근**: `/proc`, `/sys` 등 호스트 파일시스템 마운트
3. **권한 상승**: 호스트의 민감한 파일 및 디렉토리 접근
4. **지속성 확보**: 호스트에 백도어 설치

**예상 피해:**
- 호스트 시스템 완전 장악
- 모든 컨테이너 및 서비스 접근
- 클러스터 전체 보안 위험

**사용 도구:**
- `nsenter` (네임스페이스 진입)
- `chroot` (루트 디렉토리 변경)
- 호스트 파일시스템 마운트 도구들
""",
            "host_network": f"""
**공격 방법:**
1. **네트워크 스캔**: 호스트 네트워크를 통해 클러스터 내부 스캔
2. **서비스 발견**: 다른 노드의 서비스 및 포트 탐지
3. **측면 이동**: 네트워크를 통한 다른 서비스 공격
4. **데이터 수집**: 네트워크 트래픽 모니터링 및 데이터 수집

**예상 피해:**
- 클러스터 내부 네트워크 완전 노출
- 다른 서비스 및 노드 공격 가능
- 네트워크 트래픽 감청
- 내부 네트워크 구조 파악

**사용 도구:**
- `nmap`, `masscan` (네트워크 스캔)
- `tcpdump`, `wireshark` (트래픽 분석)
- `netstat`, `ss` (네트워크 상태 확인)
""",
            "host_pid": f"""
**공격 방법:**
1. **프로세스 목록 확인**: 호스트의 모든 프로세스 목록 조회
2. **민감한 프로세스 식별**: kubelet, etcd, API 서버 등 핵심 프로세스 발견
3. **프로세스 조작**: 호스트 프로세스에 신호 전송 또는 조작
4. **권한 상승**: 호스트 프로세스의 권한으로 시스템 접근

**예상 피해:**
- 호스트 시스템 프로세스 조작
- 클러스터 핵심 서비스 중단
- 시스템 레벨 권한 획득
- 전체 클러스터 장악 가능

**사용 도구:**
- `ps`, `top` (프로세스 모니터링)
- `kill`, `pkill` (프로세스 제어)
- `strace`, `ltrace` (프로세스 추적)
""",
            "host_ipc": f"""
**공격 방법:**
1. **IPC 리소스 확인**: 호스트의 공유 메모리, 세마포어, 메시지 큐 확인
2. **민감한 데이터 접근**: 다른 프로세스의 공유 메모리에서 데이터 추출
3. **프로세스 간 통신 조작**: 호스트 프로세스 간 통신 방해
4. **시스템 불안정화**: IPC 리소스 고갈을 통한 DoS 공격

**예상 피해:**
- 호스트 시스템의 민감한 데이터 유출
- 시스템 안정성 저하
- 프로세스 간 통신 장애
- 전체 시스템 성능 저하

**사용 도구:**
- `ipcs` (IPC 리소스 확인)
- `ipcrm` (IPC 리소스 제거)
- 공유 메모리 접근 도구들
"""
        }
        
        # 기본 시나리오 (알려지지 않은 규칙)
        default_scenario = f"""
**공격 방법:**
1. **취약점 분석**: `{rule_id}` 규칙의 취약점 상세 분석
2. **악용 코드 작성**: `{matched_text}` 코드를 악용하는 공격 코드 개발
3. **실제 공격**: 개발된 악용 코드를 사용하여 시스템 공격
4. **권한 상승**: 취약점을 통해 더 높은 권한 획득

**예상 피해:**
- 시스템 보안 위반
- 데이터 유출 또는 변조
- 서비스 중단
- 추가 공격의 발판

**권장사항:**
- 해당 취약점에 대한 상세한 보안 패치 적용
- 정기적인 보안 스캔 수행
- 모니터링 및 로깅 강화
"""
        
        return scenarios.get(rule_id, default_scenario)
    
    def _analyze_file_type(self, file_name: str) -> str:
        """파일 유형 분석"""
        if file_name.endswith('.yaml') or file_name.endswith('.yml'):
            return 'Kubernetes YAML 설정 파일'
        elif file_name.endswith('.json'):
            return 'JSON 설정 파일'
        elif file_name.endswith('.sh'):
            return 'Shell 스크립트'
        elif file_name.endswith('.py'):
            return 'Python 스크립트'
        elif file_name.endswith('.go'):
            return 'Go 소스 코드'
        else:
            return '기타 설정 파일'
    
    def _analyze_usage_context(self, file_name: str, rule_id: str) -> str:
        """사용 목적 분석"""
        if 'kind-config' in file_name:
            return 'Kind 클러스터 설정 (개발/테스트 환경)'
        elif 'scenario' in file_name:
            return '테스트 시나리오 파일'
        elif 'template' in file_name:
            return 'Kubernetes 리소스 템플릿'
        elif 'pod' in file_name:
            return 'Pod 설정 파일'
        elif 'service' in file_name:
            return 'Service 설정 파일'
        else:
            return 'Kubernetes 리소스 설정'
    
    def _assess_real_risk(self, rule_id: str, file_name: str, matched_text: str) -> str:
        """실제 위험도 평가"""
        # 개발/테스트 환경인지 확인
        is_dev_env = any(keyword in file_name.lower() for keyword in ['test', 'dev', 'kind', 'scenario', 'template'])
        
        risk_levels = {
            'hostPort_used': 'HIGH' if not is_dev_env else 'MEDIUM',
            'privileged_true': 'CRITICAL',
            'host_network': 'HIGH',
            'host_pid': 'HIGH',
            'host_ipc': 'MEDIUM',
            'hostPath_used': 'MEDIUM',
            'service_type_NodePort': 'LOW' if not is_dev_env else 'VERY_LOW'
        }
        
        base_risk = risk_levels.get(rule_id, 'MEDIUM')
        
        # 개발 환경에서는 위험도 조정
        if is_dev_env and base_risk in ['HIGH', 'CRITICAL']:
            return f"{base_risk} (개발 환경으로 실제 위험도는 낮음)"
        else:
            return base_risk
    
    def _identify_attack_vectors(self, rule_id: str, file_name: str) -> str:
        """공격 벡터 식별"""
        # 개발/테스트 환경인지 확인
        is_dev_env = any(keyword in file_name.lower() for keyword in ['test', 'dev', 'kind', 'scenario', 'template'])
        
        attack_vectors = {
            'hostPort_used': {
                'dev': '포트 스캔을 통한 서비스 발견 및 악용',
                'prod': '외부에서 직접 접근 가능한 포트를 통한 공격'
            },
            'privileged_true': {
                'dev': '컨테이너 탈출을 통한 호스트 접근',
                'prod': '호스트 시스템 완전 장악 가능'
            },
            'host_network': {
                'dev': '클러스터 내부 네트워크 스캔',
                'prod': '네트워크를 통한 측면 이동 공격'
            },
            'host_pid': {
                'dev': '호스트 프로세스 조작',
                'prod': '시스템 레벨 권한 획득'
            },
            'host_ipc': {
                'dev': 'IPC 리소스 악용',
                'prod': '시스템 안정성 저하 및 데이터 유출'
            },
            'hostPath_used': {
                'dev': '호스트 파일시스템 접근',
                'prod': '민감한 파일 탈취 및 시스템 조작'
            },
            'service_type_NodePort': {
                'dev': '외부 포트 노출',
                'prod': '외부에서 직접 서비스 접근'
            }
        }
        
        env_type = 'dev' if is_dev_env else 'prod'
        vectors = attack_vectors.get(rule_id, {'dev': '알 수 없는 공격 벡터', 'prod': '알 수 없는 공격 벡터'})
        
        return vectors.get(env_type, '알 수 없는 공격 벡터')
    
    def _fetch_github_file_content(self, repo_url: str, file_path: str, line_number: int, context_lines: int = 10) -> Dict[str, Any]:
        """GitHub에서 실제 파일 내용을 가져와서 취약한 라인 주변 컨텍스트 분석"""
        try:
            # GitHub URL에서 owner/repo 추출
            if 'github.com' in repo_url:
                parts = repo_url.replace('https://github.com/', '').replace('.git', '').split('/')
                if len(parts) >= 2:
                    owner, repo = parts[0], parts[1]
                else:
                    return {"error": "Invalid GitHub URL format"}
            else:
                return {"error": "Not a GitHub repository"}
            
            # 파일 경로에서 실제 GitHub 경로 추출 (임시 경로 제거)
            github_file_path = file_path.split('/')[-1] if '/' in file_path else file_path
            if 'kind-config.yml' in file_path:
                github_file_path = 'kind-config.yml'
            elif 'volume_scenario.yaml' in file_path:
                github_file_path = 'CI/legacy/scenarios/volume_scenario.yaml'
            elif 'service_hijacking.yaml' in file_path:
                github_file_path = 'CI/templates/service_hijacking.yaml'
            elif 'time_pod.yaml' in file_path:
                github_file_path = 'CI/templates/time_pod.yaml'
            elif 'container_scenario_pod.yaml' in file_path:
                github_file_path = 'CI/templates/container_scenario_pod.yaml'
            elif 'pod_network_filter.yaml' in file_path:
                github_file_path = 'CI/templates/pod_network_filter.yaml'
            elif 'outage_pod.yaml' in file_path:
                github_file_path = 'CI/templates/outage_pod.yaml'
            elif 'io-hog.yml' in file_path:
                github_file_path = 'scenarios/kube/io-hog.yml'
            
            # GitHub API로 파일 내용 가져오기
            api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{github_file_path}"
            response = requests.get(api_url)
            
            if response.status_code == 200:
                file_data = response.json()
                content = base64.b64decode(file_data['content']).decode('utf-8')
                lines = content.split('\n')
                
                # 취약한 라인 주변 컨텍스트 추출
                start_line = max(0, line_number - context_lines - 1)
                end_line = min(len(lines), line_number + context_lines)
                
                context_lines_data = []
                for i in range(start_line, end_line):
                    line_content = lines[i] if i < len(lines) else ""
                    context_lines_data.append({
                        "line_number": i + 1,
                        "content": line_content,
                        "is_vulnerable": i + 1 == line_number
                    })
                
                return {
                    "success": True,
                    "file_path": github_file_path,
                    "vulnerable_line": line_number,
                    "context_lines": context_lines_data,
                    "full_content": content
                }
            else:
                return {"error": f"Failed to fetch file: {response.status_code}"}
                
        except Exception as e:
            return {"error": f"Error fetching file: {str(e)}"}
    
    def _analyze_real_code_exploit(self, finding: Dict[str, Any], repo_url: str) -> str:
        """실제 코드를 기반으로 한 구체적인 익스플로잇 분석"""
        try:
            file_path = finding.get('filePath', '')
            line_number = finding.get('lineNumber', 0)
            rule_id = finding.get('ruleId', '')
            matched_text = finding.get('matchedText', '')
            severity = finding.get('severity', '')
            
            # GitHub에서 실제 코드 가져오기
            code_data = self._fetch_github_file_content(repo_url, file_path, line_number)
            
            if not code_data.get('success'):
                return f"⚠️ 실제 코드를 가져올 수 없습니다: {code_data.get('error', 'Unknown error')}"
            
            # 코드 컨텍스트 분석
            context_lines = code_data['context_lines']
            vulnerable_line = next((line for line in context_lines if line['is_vulnerable']), None)
            
            if not vulnerable_line:
                return "⚠️ 취약한 라인을 찾을 수 없습니다."
            
            # 실제 코드 기반 익스플로잇 분석
            exploit_analysis = self._generate_real_code_exploit_analysis(
                rule_id, severity, matched_text, context_lines, vulnerable_line
            )
            
            return f"""
## 🔍 실제 코드 기반 익스플로잇 분석

### 📁 파일: {code_data['file_path']}
### 🎯 취약 라인: {line_number}
### ⚠️ 문제 코드: `{matched_text}`

### 📋 코드 컨텍스트:
```yaml
{chr(10).join([f"{line['line_number']:3d}: {line['content']}" for line in context_lines])}
```

### 🚨 구체적인 익스플로잇 시나리오:
{exploit_analysis}
"""
            
        except Exception as e:
            return f"❌ 코드 분석 중 오류 발생: {str(e)}"
    
    def _generate_real_code_exploit_analysis(self, rule_id: str, severity: str, matched_text: str, context_lines: list, vulnerable_line: dict) -> str:
        """실제 코드 컨텍스트를 기반으로 한 익스플로잇 분석"""
        
        # 컨텍스트에서 추가 정보 추출
        context_text = '\n'.join([line['content'] for line in context_lines])
        
        exploit_scenarios = {
            "hostPort_used": f"""
**1. 포트 스캔 공격:**
- 공격자가 `{matched_text}` 포트를 스캔하여 서비스 발견
- `nmap -p 8888,8889 <target-ip>` 명령으로 포트 열림 확인
- 해당 포트에서 실행 중인 서비스의 버전 및 취약점 탐지

**2. 직접 서비스 접근:**
- 호스트 포트를 통해 컨테이너 서비스에 직접 접근
- `curl http://<target-ip>:8888` 또는 `telnet <target-ip>:8888`
- 서비스의 인증 우회 또는 알려진 취약점 악용

**3. 컨테이너 탈출:**
- 서비스 취약점을 통해 컨테이너 내부로 진입
- 호스트 네트워크 스택 조작을 통한 권한 상승
- 다른 컨테이너 및 호스트 시스템 접근

**실제 공격 명령어:**
```bash
# 포트 스캔
nmap -sV -p 8888,8889 <target-ip>

# 서비스 접근 테스트
curl -v http://<target-ip>:8888
telnet <target-ip>:8888

# 컨테이너 탈출 시도
docker exec -it <container-id> /bin/bash
""",
            "privileged_true": f"""
**1. 호스트 파일시스템 마운트:**
- privileged 컨테이너에서 호스트 루트 파일시스템 마운트
- `mount /dev/sda1 /mnt` 또는 `mount /dev/disk/by-label/root /mnt`
- 호스트의 민감한 파일들 (/etc/shadow, /root/.ssh 등) 접근

**2. 호스트 프로세스 조작:**
- 호스트의 모든 프로세스에 접근 가능
- `ps aux` 명령으로 호스트 프로세스 목록 확인
- kubelet, etcd 등 클러스터 핵심 프로세스 조작

**3. 네트워크 스택 조작:**
- 호스트 네트워크 인터페이스 직접 조작
- `ip link` 명령으로 네트워크 설정 변경
- 다른 노드와의 통신 감청 및 조작

**실제 공격 명령어:**
```bash
# 호스트 파일시스템 마운트
mkdir /mnt/host
mount /dev/sda1 /mnt/host
ls /mnt/host/root/.ssh/

# 호스트 프로세스 확인
ps aux | grep kubelet
cat /proc/1/environ

# 네트워크 조작
ip link show
iptables -L
""",
            "hostPath_used": f"""
**1. 호스트 파일 접근:**
- 볼륨 마운트를 통해 호스트 파일시스템 접근
- 민감한 설정 파일들 (/etc/kubernetes, /var/lib/kubelet 등) 읽기
- SSH 키, 인증서, 비밀번호 파일 등 탈취

**2. 설정 파일 조작:**
- Kubernetes 설정 파일 수정을 통한 권한 상승
- kubelet 설정 변경으로 컨테이너 실행 권한 획득
- 네트워크 정책 우회 설정

**3. 로그 파일 접근:**
- 호스트 시스템 로그 파일 접근
- 다른 컨테이너의 로그 및 민감한 정보 수집
- 시스템 활동 모니터링 및 추가 공격 정보 수집

**실제 공격 명령어:**
```bash
# 호스트 파일 탐색
ls -la /host-path/
cat /host-path/etc/kubernetes/admin.conf
cat /host-path/var/lib/kubelet/config.yaml

# 민감한 파일 접근
find /host-path -name "*.key" -o -name "*.crt" -o -name "*.pem"
cat /host-path/root/.ssh/id_rsa
```
""",
            "hostNetwork_true": f"""
**1. 클러스터 내부 네트워크 스캔:**
- 호스트 네트워크를 통해 클러스터 내부 모든 서비스 스캔
- `nmap -sn 10.0.0.0/8` 또는 `nmap -sn 172.16.0.0/12`
- API 서버, etcd, kubelet 등 핵심 서비스 발견

**2. 네트워크 트래픽 감청:**
- 호스트 네트워크 인터페이스에서 모든 트래픽 감청
- `tcpdump -i eth0` 명령으로 네트워크 패킷 캡처
- 다른 컨테이너 간 통신 및 민감한 데이터 수집

**3. 측면 이동 공격:**
- 네트워크를 통한 다른 노드 및 서비스 공격
- 내부 서비스의 취약점 악용
- 클러스터 전체로의 공격 확산

**실제 공격 명령어:**
```bash
# 네트워크 스캔
nmap -sn 10.0.0.0/8
nmap -p 1-65535 <internal-ip>

# 트래픽 감청
tcpdump -i eth0 -w capture.pcap
tcpdump -i eth0 port 6443

# 내부 서비스 공격
curl -k https://<api-server-ip>:6443/api/v1/pods
```
"""
        }
        
        return exploit_scenarios.get(rule_id, f"""
**기본 익스플로잇 시나리오:**
- `{rule_id}` 규칙의 취약점을 악용한 공격
- `{matched_text}` 코드를 통한 시스템 침해
- 심각도: {severity.upper()}
""")
    
    def _get_default_exploit_scenario(self, vulnerability_type: str = None) -> str:
        """기본 익스플로잇 시나리오"""
        return f"""
# 🎯 익스플로잇 시나리오

## 시나리오: Privileged Container 악용

### 1. 공격 개요
Privileged 컨테이너는 호스트 시스템에 대한 거의 모든 권한을 가지므로, 공격자가 이를 악용하면 전체 클러스터를 장악할 수 있습니다.

### 2. 공격 단계
1. **컨테이너 접근**: 취약한 privileged 컨테이너에 접근
2. **권한 확인**: `capsh --print` 명령으로 권한 확인
3. **호스트 마운트**: 호스트 파일시스템을 컨테이너에 마운트
4. **권한 상승**: 호스트의 민감한 파일에 접근
5. **지속성 확보**: 호스트에 백도어 설치

### 3. 사용 도구
- `nsenter`: 네임스페이스 진입
- `chroot`: 루트 디렉토리 변경
- `mount`: 파일시스템 마운트

### 4. 예상 피해
- 호스트 시스템 완전 장악
- 모든 컨테이너 및 서비스 접근
- 클러스터 전체 보안 위험

### 5. 방어 방법
- privileged 컨테이너 사용 금지
- 적절한 Security Context 설정
- Pod Security Standards 적용

### 6. 관련 모범 사례
- 최소 권한 원칙 적용
- 정기적인 보안 스캔 수행
- 모니터링 및 로깅 강화
"""
    
    def _get_default_response(self, query: str) -> str:
        """기본 AI 응답"""
        responses = [
            "Kubernetes 보안에 대한 질문이군요. 구체적인 상황을 알려주시면 더 정확한 도움을 드릴 수 있습니다.",
            "Kubernetes 클러스터의 보안을 강화하고 싶으시다면, 현재 사용 중인 설정과 환경을 알려주세요.",
            "어떤 Kubernetes 보안 문제로 고민이 있으신가요? 구체적으로 설명해주시면 더 정확한 도움을 드릴 수 있습니다.",
            "Kubernetes 클러스터의 보안을 강화하고 싶으시다면, 현재 상황을 자세히 알려주세요.",
        ]
        
        import random
        return random.choice(responses)
    
    def _get_default_recommendations(self) -> str:
        """기본 보안 권장사항"""
        return """
# 🛡️ Kubernetes 보안 권장사항

## 1. 네트워크 보안
- 모든 네임스페이스에 네트워크 정책 적용
- 불필요한 포트 노출 방지
- 서비스 메시 도입 고려

## 2. 컨테이너 보안
- privileged 컨테이너 사용 금지
- 적절한 Security Context 설정
- 최신 이미지 사용 및 정기적 업데이트

## 3. 접근 제어
- RBAC 권한 최소화
- 서비스 계정 권한 제한
- 정기적인 권한 검토

## 4. 모니터링
- 보안 이벤트 로깅
- 이상 행위 탐지
- 정기적인 보안 스캔 수행
"""

if __name__ == "__main__":
    print("Kubernetes 보안 AI 서비스 시작...")
    
    try:
        # AI 서비스 초기화
        ai_service = SimpleKubernetesSecurityAI()
        print("✅ AI 서비스 초기화 완료")
        
        # 간단한 테스트 질문
        test_question = "Kubernetes에서 Pod 보안을 위한 베스트 프랙티스는 무엇인가요?"
        print(f"\n테스트 질문: {test_question}")
        
        # 답변 생성
        response = ai_service.chat_with_ai(test_question)
        print(f"\n답변:\n{response}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print("환경 변수 설정을 확인해주세요.")