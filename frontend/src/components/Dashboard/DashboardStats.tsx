import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  BugReport as BugReportIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { scanAPI, userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface ScanHistoryItem {
  filename: string;
  repoUrl: string;
  timestamp: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
  stats: {
    filesScanned: number;
    findings: number;
  };
  savedTo: string;
}

interface DashboardStatsData {
  totalScans: number;
  totalUsers: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  recentScans: ScanHistoryItem[];
  scanTrend: {
    date: string;
    scans: number;
    findings: number;
  }[];
}

const DashboardStats: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 스캔 날짜 포맷팅 함수
  const formatScanDate = (timestamp: string, filename?: string) => {
    // 타임스탬프가 있으면 사용
    if (timestamp) {
      try {
        // YYYYMMDD_HHMMSS 형식을 Date로 변환
        if (timestamp.match(/^\d{8}_\d{6}$/)) {
          const year = timestamp.substring(0, 4);
          const month = timestamp.substring(4, 6);
          const day = timestamp.substring(6, 8);
          const hour = timestamp.substring(9, 11);
          const minute = timestamp.substring(11, 13);
          const second = timestamp.substring(13, 15);
          
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          );
          
          return date.toLocaleString('ko-KR');
        }
        
        // ISO 형식인 경우
        return new Date(timestamp).toLocaleString('ko-KR');
      } catch {
        return timestamp;
      }
    }
    
    // 타임스탬프가 없으면 파일명에서 추출
    if (filename) {
      try {
        // 파일명 형식: repo_YYYYMMDD_HHMMSS.json
        const match = filename.match(/(\d{8}_\d{6})/);
        if (match) {
          const timestampStr = match[1];
          const year = timestampStr.substring(0, 4);
          const month = timestampStr.substring(4, 6);
          const day = timestampStr.substring(6, 8);
          const hour = timestampStr.substring(9, 11);
          const minute = timestampStr.substring(11, 13);
          const second = timestampStr.substring(13, 15);
          
          const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          );
          
          return date.toLocaleString('ko-KR');
        }
      } catch {
        // 파일명에서 추출 실패시 파일 수정 시간 사용
        return '시간 정보 없음';
      }
    }
    
    return '시간 정보 없음';
  };

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('대시보드 통계 로딩 시작...');

      // 스캔 히스토리는 사용자별로 필터링됨 (백엔드에서 처리)
      const scanHistoryResponse = await scanAPI.getScanHistory();
      console.log('스캔 히스토리 응답:', scanHistoryResponse);

      const scanHistory: ScanHistoryItem[] = scanHistoryResponse.data.scans || [];

      // 사용자 데이터는 관리자만 접근 가능
      let users: any[] = [];
      if (user?.role === 'admin') {
        try {
          const usersResponse = await userAPI.getUsers();
          users = usersResponse.data.users || [];
          console.log('사용자 데이터 응답:', usersResponse);
        } catch (err: any) {
          console.warn('사용자 데이터 로딩 실패 (관리자가 아님):', err.message);
          // 관리자가 아니면 빈 배열로 설정
          users = [];
        }
      } else {
        console.log('관리자가 아니므로 사용자 데이터를 로딩하지 않습니다.');
        users = [];
      }

      console.log('파싱된 데이터:', { scanHistory, users });

      // 통계 계산 (이미 필터링된 스캔 히스토리 기반)
      const totalScans = scanHistory.length;
      const totalUsers = users.length;
      
      let totalFindings = 0;
      let criticalFindings = 0;
      let highFindings = 0;
      let mediumFindings = 0;
      let lowFindings = 0;

      // 각 스캔의 상세 결과를 가져와서 통계 계산
      const recentScans = scanHistory.slice(0, 5);
      const scanDetailsPromises = recentScans.map((scan: ScanHistoryItem) => 
        scanAPI.getScanResult(scan.filename).catch(() => null)
      );
      
      const scanDetails = await Promise.all(scanDetailsPromises);
      
      scanDetails.forEach((detail, index) => {
        if (detail?.data?.findings) {
          const findings = detail.data.findings;
          totalFindings += findings.length;
          
          findings.forEach((finding: any) => {
            switch (finding.severity) {
              case 'critical':
                criticalFindings++;
                break;
              case 'high':
                highFindings++;
                break;
              case 'medium':
                mediumFindings++;
                break;
              case 'low':
                lowFindings++;
                break;
            }
          });
        }
      });

      // 최근 7일간의 스캔 트렌드 계산
      const scanTrend = calculateScanTrend(scanHistory);

      setStats({
        totalScans,
        totalUsers,
        totalFindings,
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        recentScans,
        scanTrend,
      });
    } catch (err: any) {
      console.error('대시보드 통계 로딩 실패:', err);
      console.error('오류 상세:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText
      });
      
      let errorMessage = '통계를 불러오는데 실패했습니다.';
      if (err.response?.status === 401) {
        errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
      } else if (err.response?.status === 403) {
        errorMessage = '접근 권한이 없습니다.';
      } else if (err.message) {
        errorMessage = `오류: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScanTrend = (scans: ScanHistoryItem[]) => {
    const last7Days = [];
    const today = new Date();
    
    // 안전한 날짜 파싱 함수
    const parseScanDate = (scan: ScanHistoryItem): Date | null => {
      // 1. timestamp가 있으면 사용
      if (scan.timestamp) {
        const date = new Date(scan.timestamp);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // 2. filename에서 날짜 추출 시도
      if (scan.filename) {
        const parts = scan.filename.split('_');
        if (parts.length >= 2) {
          const dateStr = parts[1].substring(0, 8);
          if (dateStr.length === 8) {
            // YYYYMMDD 형식으로 파싱
            const year = parseInt(dateStr.substring(0, 4));
            const month = parseInt(dateStr.substring(4, 6)) - 1; // 월은 0부터 시작
            const day = parseInt(dateStr.substring(6, 8));
            
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
      }
      
      // 3. 현재 시간으로 fallback
      return new Date();
    };
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayScans = scans.filter(scan => {
        const scanDate = parseScanDate(scan);
        if (!scanDate) return false;
        
        return scanDate.toISOString().split('T')[0] === dateStr;
      });
      
      last7Days.push({
        date: dateStr,
        scans: dayScans.length,
        findings: dayScans.reduce((sum, scan) => sum + (scan.stats?.findings || 0), 0),
      });
    }
    
    return last7Days;
  };

  useEffect(() => {
    loadStats();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user?.role]); // 사용자 역할이 변경될 때만 다시 로드

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string; 
    subtitle?: string; 
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color, mr: 1 }}>
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        📊 대시보드
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {user?.role === 'admin' 
          ? '전체 시스템 현황 및 스캔 통계를 확인하세요' 
          : user?.role === 'security'
          ? '보안 모니터링을 위한 전체 스캔 현황을 확인하세요'
          : '내가 분석한 레포지토리의 현황을 확인하세요'
        }
      </Typography>

      {/* 주요 통계 카드 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <StatCard
            title={user?.role === 'admin' ? "총 스캔 수" : user?.role === 'security' ? "총 스캔 수" : "내 스캔 수"}
            value={stats.totalScans}
            icon={<ScheduleIcon />}
            color="primary.main"
            subtitle={user?.role === 'admin' ? "실행된 스캔 총 개수" : user?.role === 'security' ? "모든 사용자 스캔 수" : "내가 실행한 스캔 수"}
          />
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <StatCard
            title="등록 사용자"
            value={stats.totalUsers}
            icon={<SecurityIcon />}
            color="success.main"
            subtitle={user?.role === 'admin' ? "시스템 사용자 수" : "관리자만 확인 가능"}
          />
        </Box>
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <StatCard
            title={user?.role === 'admin' ? "탐지된 미스컨피그레이션" : user?.role === 'security' ? "탐지된 미스컨피그레이션" : "내 스캔 미스컨피그레이션"}
            value={stats.totalFindings}
            icon={<BugReportIcon />}
            color="error.main"
            subtitle={user?.role === 'admin' ? "전체 미스컨피그레이션 수" : user?.role === 'security' ? "모든 사용자 스캔 미스컨피그레이션" : "내 스캔에서 탐지된 미스컨피그레이션"}
          />
        </Box>
      </Box>

      {/* 심각도별 문제 분포 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {user?.role === 'admin' ? "🚨 보안 문제 심각도 분포" : user?.role === 'security' ? "🚨 전체 보안 문제 심각도 분포" : "🚨 내 스캔 문제 심각도 분포"}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Critical</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.criticalFindings}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.criticalFindings / stats.totalFindings) * 100}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
                  color="error"
                />
              </Box>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">High</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.highFindings}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.highFindings / stats.totalFindings) * 100}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
                  color="warning"
                />
              </Box>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Medium</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.mediumFindings}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.mediumFindings / stats.totalFindings) * 100}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
                  color="info"
                />
              </Box>
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Low</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {stats.lowFindings}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(stats.lowFindings / stats.totalFindings) * 100}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
                  color="success"
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 최근 스캔 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {user?.role === 'admin' ? "📋 최근 스캔 결과" : user?.role === 'security' ? "📋 전체 최근 스캔 결과" : "📋 내 최근 스캔 결과"}
          </Typography>
          {stats.recentScans.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {user?.role === 'admin' ? "최근 스캔 결과가 없습니다." : user?.role === 'security' ? "최근 스캔 결과가 없습니다." : "내가 실행한 스캔이 없습니다."}
            </Typography>
          ) : (
            <Box>
              {stats.recentScans.map((scan, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1,
                    borderBottom: index < stats.recentScans.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {scan.repoUrl.split('/').pop()?.replace('.git', '')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatScanDate(scan.timestamp, scan.filename)}
                    </Typography>
                    {scan.user && (
                      <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                        👤 {scan.user.username} ({scan.user.role})
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={`${scan.stats?.findings || 0}개 문제`}
                      size="small"
                      color={scan.stats?.findings > 0 ? 'error' : 'success'}
                      variant="outlined"
                    />
                    <Chip
                      label={`${scan.stats?.filesScanned || 0}개 파일`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardStats;
