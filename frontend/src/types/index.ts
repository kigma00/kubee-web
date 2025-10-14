// 사용자 관련 타입
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'security';
  created_at: string;
  last_login?: string;
}

// 스캔 옵션 타입 제거됨 (사용하지 않음)

// 발견된 문제 타입
export interface Finding {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file_path: string;
  line_number: number;
  matched_text: string;
  fix_suggestion?: string;
  instances?: FindingInstance[];
  // API 응답에서 사용하는 필드들 (하위 호환성을 위해 추가)
  filePath?: string;
  lineNumber?: number;
  matchedText?: string;
  fixSuggestion?: string;
  ruleId?: string;
}

// 발견된 문제 인스턴스 타입
export interface FindingInstance {
  filePath: string;
  lineNumber: number;
  matchedText: string;
  fixSuggestion?: string;
}

// 스캔 결과 타입
export interface ScanResult {
  id: string;
  repository_name: string;
  repository_url: string;
  repoUrl?: string; // 호환성을 위한 별칭
  created_at: string;
  completed_at?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  files_scanned: number;
  findings: Finding[];
  stats?: ScanStats;
  saved_to?: string;
  // 추가 메타데이터 (스캔 히스토리에서 사용)
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// 스캔 통계 타입
export interface ScanStats {
  filesScanned: number;
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// 스캔 로그 타입
export interface ScanLog {
  id: string;
  user_id: string;
  username: string;
  repository_name: string;
  repository_url: string;
  created_at: string;
  completed_at?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  files_scanned: number;
  findings_count: number;
  deep_scan: boolean;
  auto_fix: boolean;
}

// AI 메시지 타입
export interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  scan_id?: string;
  finding_id?: string;
}

// AI 분석 결과 타입
export interface AIAnalysis {
  id: string;
  scan_id: string;
  analysis_type: 'general' | 'scan_analysis' | 'exploit_generation' | 'recommendations';
  content: string;
  created_at: string;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 로그인 요청 타입
export interface LoginRequest {
  username: string;
  password: string;
}

// 로그인 응답 타입
export interface LoginResponse {
  token: string;
  user: User;
}

// 새 사용자 생성 타입
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'security';
}

// 설정 타입
export interface Settings {
  slack_webhook_url?: string;
  scan_result_path: string;
  supported_rules: string[];
  service_info: {
    flask_port: number;
    react_port: number;
  };
}

// 그룹화된 발견 문제 타입
export interface GroupedFindings {
  [ruleId: string]: {
    rule_name: string;
    severity: string;
    count: number;
    instances: FindingInstance[];
  };
}
