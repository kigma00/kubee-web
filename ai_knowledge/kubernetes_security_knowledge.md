# Kubernetes 보안 지식베이스

## 1. 컨테이너 보안

### 1.1 Privileged 컨테이너
**위험도**: Critical
**설명**: privileged=true로 설정된 컨테이너는 호스트 시스템의 모든 권한을 가집니다.

**위험성**:
- 호스트 파일시스템에 직접 접근 가능
- 호스트 네트워크 스택 조작 가능
- 호스트 프로세스 조작 가능
- 컨테이너 탈출 시 호스트 전체 제어 가능

**방어 방법**:
```yaml
securityContext:
  privileged: false  # 반드시 false로 설정
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
```

### 1.2 Security Context 설정
**위험도**: High
**설명**: 적절한 Security Context 설정이 없으면 보안 위험이 증가합니다.

**권장 설정**:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop:
    - ALL
    add:
    - NET_BIND_SERVICE
```

### 1.3 읽기 전용 루트 파일시스템
**위험도**: Medium
**설명**: 컨테이너의 루트 파일시스템을 읽기 전용으로 설정하여 무단 수정을 방지합니다.

**설정 방법**:
```yaml
securityContext:
  readOnlyRootFilesystem: true
volumeMounts:
- name: tmp
  mountPath: /tmp
- name: var-tmp
  mountPath: /var/tmp
volumes:
- name: tmp
  emptyDir: {}
- name: var-tmp
  emptyDir: {}
```

## 2. 네트워크 보안

### 2.1 호스트 네트워크 사용 금지
**위험도**: Critical
**설명**: hostNetwork=true는 컨테이너가 호스트의 네트워크 스택을 직접 사용하게 합니다.

**위험성**:
- 호스트의 모든 네트워크 인터페이스에 접근 가능
- 포트 충돌 가능성
- 네트워크 격리 우회

**방어 방법**:
```yaml
spec:
  hostNetwork: false  # 반드시 false로 설정
  containers:
  - name: app
    ports:
    - containerPort: 8080
```

### 2.2 네트워크 정책
**위험도**: High
**설명**: 네트워크 정책을 통해 Pod 간 통신을 제어합니다.

**예시 정책**:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

### 2.3 서비스 타입 보안
**위험도**: Medium
**설명**: NodePort 서비스는 외부에서 직접 접근 가능하므로 주의가 필요합니다.

**권장사항**:
- ClusterIP 사용 권장
- LoadBalancer 사용 시 방화벽 규칙 설정
- NodePort 사용 시 필요한 포트만 노출

## 3. 접근 제어 및 권한 관리

### 3.1 RBAC (Role-Based Access Control)
**위험도**: High
**설명**: 최소 권한 원칙에 따라 사용자 및 서비스 계정의 권한을 제한합니다.

**권장 설정**:
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### 3.2 서비스 계정 관리
**위험도**: Medium
**설명**: 기본 서비스 계정 사용을 피하고 필요한 권한만 부여합니다.

**설정 방법**:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
automountServiceAccountToken: false
---
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  serviceAccountName: my-service-account
  containers:
  - name: app
    image: nginx
```

## 4. 시크릿 관리

### 4.1 시크릿 암호화
**위험도**: High
**설명**: 민감한 정보는 반드시 Secret으로 관리하고 암호화해야 합니다.

**올바른 사용법**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
type: Opaque
data:
  username: YWRtaW4=  # base64 인코딩
  password: MWYyZDFlMmU2N2Rm
---
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: nginx
    env:
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: my-secret
          key: username
```

### 4.2 하드코딩된 시크릿 금지
**위험도**: Critical
**설명**: 코드나 설정 파일에 시크릿을 직접 포함하면 안 됩니다.

**잘못된 예시**:
```yaml
# ❌ 절대 하지 말 것
env:
- name: DB_PASSWORD
  value: "mypassword123"  # 하드코딩 금지!
```

## 5. 이미지 보안

### 5.1 이미지 태그 관리
**위험도**: Medium
**설명**: latest 태그 사용을 피하고 구체적인 버전을 사용합니다.

**권장사항**:
```yaml
# ✅ 좋은 예시
image: nginx:1.21.6
image: redis:7.0-alpine

# ❌ 피해야 할 예시
image: nginx:latest
image: redis:latest
```

### 5.2 이미지 취약점 스캔
**위험도**: High
**설명**: 사용하는 모든 이미지에 대해 취약점 스캔을 수행해야 합니다.

**도구**:
- Trivy
- Clair
- Snyk
- Docker Scout

## 6. 모니터링 및 로깅

### 6.1 보안 이벤트 모니터링
**위험도**: High
**설명**: 보안 관련 이벤트를 지속적으로 모니터링해야 합니다.

**모니터링 항목**:
- 권한 상승 시도
- 비정상적인 네트워크 통신
- 컨테이너 탈출 시도
- 시크릿 접근 패턴

### 6.2 중앙집중식 로깅
**위험도**: Medium
**설명**: 모든 로그를 중앙에서 수집하고 분석합니다.

**도구**:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Fluentd
- Prometheus + Grafana

## 7. 정책 및 컴플라이언스

### 7.1 Pod Security Standards
**위험도**: High
**설명**: Kubernetes의 Pod Security Standards를 적용합니다.

**적용 방법**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 7.2 OPA Gatekeeper
**위험도**: Medium
**설명**: Open Policy Agent를 사용하여 정책을 자동으로 적용합니다.

**예시 정책**:
```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        properties:
          labels:
            type: array
            items:
              type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          required := input.parameters.labels
          provided := input.review.object.metadata.labels
          missing := required[_]
          not provided[missing]
          msg := sprintf("Missing required label: %v", [missing])
        }
```

## 8. 일반적인 공격 벡터

### 8.1 컨테이너 탈출
**공격 방법**:
1. privileged 컨테이너 악용
2. 호스트 파일시스템 마운트
3. 호스트 네트워크 스택 조작
4. 호스트 프로세스 조작

**방어 방법**:
- 적절한 Security Context 설정
- 네트워크 정책 적용
- 정기적인 보안 스캔
- 컨테이너 런타임 보안 강화

### 8.2 권한 상승
**공격 방법**:
1. 서비스 계정 토큰 탈취
2. RBAC 권한 오남용
3. 클러스터 관리자 권한 획득

**방어 방법**:
- 최소 권한 원칙 적용
- 정기적인 권한 검토
- 서비스 계정 토큰 제한
- 감사 로깅 활성화

### 8.3 네트워크 공격
**공격 방법**:
1. 서비스 간 통신 가로채기
2. DNS 스푸핑
3. 네트워크 정책 우회

**방어 방법**:
- mTLS 적용
- 네트워크 정책 강화
- 서비스 메시 도입
- 네트워크 모니터링

## 9. 보안 도구 및 모범 사례

### 9.1 보안 스캔 도구
- **kube-score**: Kubernetes 리소스 점수 평가
- **kube-hunter**: 클러스터 보안 취약점 탐지
- **kube-bench**: CIS Kubernetes Benchmark 검사
- **Polaris**: Kubernetes 모범 사례 검사

### 9.2 정기적인 보안 점검
1. **주간**: 보안 스캔 실행
2. **월간**: 권한 검토 및 정리
3. **분기**: 보안 정책 업데이트
4. **연간**: 전체 보안 아키텍처 검토

### 9.3 사고 대응 계획
1. **탐지**: 이상 행위 감지
2. **분석**: 공격 벡터 분석
3. **격리**: 영향 범위 제한
4. **복구**: 시스템 정상화
5. **학습**: 사고 분석 및 개선

## 10. 규정 준수

### 10.1 CIS Kubernetes Benchmark
- 컨테이너 이미지 보안
- 네트워크 정책
- RBAC 설정
- 감사 로깅

### 10.2 NIST Cybersecurity Framework
- Identify: 자산 식별
- Protect: 보호 조치
- Detect: 탐지 시스템
- Respond: 대응 절차
- Recover: 복구 계획

### 10.3 GDPR/개인정보보호법
- 데이터 암호화
- 접근 제어
- 감사 로깅
- 데이터 보존 정책
