import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { scanAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface ScanResult {
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
  findings?: Array<{
    ruleId: string;
    severity: string;
    description: string;
    filePath: string;
    lineNumber: number;
    matchedText: string;
  }>;
}

interface MisconfigStats {
  ruleId: string;
  count: number;
  severity: string;
  description: string;
}

interface MonthlyStats {
  month: string;
  scans: number;
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const StatisticsTab: React.FC = () => {
  const { user } = useAuth();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [misconfigStats, setMisconfigStats] = useState<MisconfigStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('6');

  // 색상 팔레트
  const COLORS = {
    critical: '#f44336',
    high: '#ff9800',
    medium: '#ffeb3b',
    low: '#4caf50',
  };

  const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('통계 데이터 로딩 시작...');

      // 스캔 히스토리 가져오기
      const scanHistoryResponse = await scanAPI.getScanHistory();
      const allScans: ScanResult[] = scanHistoryResponse.data.scans || [];

      // 사용자별 필터링 (백엔드에서 이미 처리되지만 추가 확인)
      const filteredScans = allScans.filter(scan => {
        const scanUser = scan.user;
        const currentUserRole = user?.role;
        
        if (currentUserRole === 'admin' || currentUserRole === 'security') {
          return true;
        }
        return scanUser?.id === Number(user?.id);
      });

      console.log('필터링된 스캔 수:', filteredScans.length);

      // 상세 스캔 결과 가져오기
      const detailedScans: ScanResult[] = [];
      for (const scan of filteredScans) {
        try {
          const detailResponse = await scanAPI.getScanResult(scan.filename);
          detailedScans.push(detailResponse.data);
        } catch (err) {
          console.warn(`스캔 결과 로딩 실패: ${scan.filename}`, err);
          detailedScans.push(scan); // 기본 정보라도 사용
        }
      }

      setScanResults(detailedScans);

      // 미스컨피그레이션 통계 계산
      const misconfigCounts = new Map<string, MisconfigStats>();
      
      detailedScans.forEach(scan => {
        if (scan.findings) {
          scan.findings.forEach(finding => {
            const key = finding.ruleId;
            if (misconfigCounts.has(key)) {
              misconfigCounts.get(key)!.count++;
            } else {
              misconfigCounts.set(key, {
                ruleId: finding.ruleId,
                count: 1,
                severity: finding.severity,
                description: finding.description,
              });
            }
          });
        }
      });

      const misconfigArray = Array.from(misconfigCounts.values())
        .sort((a, b) => b.count - a.count);

      setMisconfigStats(misconfigArray);

      // 월별 통계 계산
      const monthlyData = calculateMonthlyStats(detailedScans, parseInt(selectedPeriod));
      setMonthlyStats(monthlyData);

      console.log('통계 데이터 로딩 완료:', {
        totalScans: detailedScans.length,
        misconfigTypes: misconfigArray.length,
        monthlyDataPoints: monthlyData.length,
      });

    } catch (err: any) {
      console.error('통계 로딩 오류:', err);
      setError(`통계 데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMonthlyStats = (scans: ScanResult[], months: number): MonthlyStats[] => {
    const monthlyMap = new Map<string, MonthlyStats>();
    
    // 실제 스캔 데이터가 있는 경우에만 처리
    if (scans.length === 0) {
      return [];
    }

    // 스캔 데이터에서 실제 날짜들을 추출하여 월별로 그룹화
    scans.forEach(scan => {
      try {
        const scanDate = parseScanDate(scan.timestamp, scan.filename);
        const monthKey = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            month: monthKey,
            scans: 0,
            findings: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.scans++;
        monthData.findings += scan.stats?.findings || 0;
        
        // 심각도별 카운트
        if (scan.findings) {
          scan.findings.forEach(finding => {
            switch (finding.severity) {
              case 'critical':
                monthData.critical++;
                break;
              case 'high':
                monthData.high++;
                break;
              case 'medium':
                monthData.medium++;
                break;
              case 'low':
                monthData.low++;
                break;
            }
          });
        }
      } catch (err) {
        console.warn('날짜 파싱 실패:', scan.timestamp, err);
      }
    });

    // 월별 데이터를 날짜순으로 정렬
    const sortedMonths = Array.from(monthlyMap.values()).sort((a, b) => {
      return a.month.localeCompare(b.month);
    });

    return sortedMonths;
  };

  const parseScanDate = (timestamp: string, filename?: string): Date => {
    if (timestamp) {
      if (timestamp.match(/^\d{8}_\d{6}$/)) {
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(9, 11);
        const minute = timestamp.substring(11, 13);
        const second = timestamp.substring(13, 15);
        
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
      return new Date(timestamp);
    }
    
    if (filename) {
      const match = filename.match(/(\d{8}_\d{6})/);
      if (match) {
        const timestampStr = match[1];
        const year = timestampStr.substring(0, 4);
        const month = timestampStr.substring(4, 6);
        const day = timestampStr.substring(6, 8);
        const hour = timestampStr.substring(9, 11);
        const minute = timestampStr.substring(11, 13);
        const second = timestampStr.substring(13, 15);
        
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
    }
    
    return new Date();
  };

  const getSeverityColor = (severity: string) => {
    return COLORS[severity as keyof typeof COLORS] || '#666';
  };

  const getSeverityLabel = (severity: string) => {
    const labels = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return labels[severity as keyof typeof labels] || severity;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        📊 보안 통계 분석
      </Typography>

      {/* 기간 선택 */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>분석 기간</InputLabel>
          <Select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            label="분석 기간"
          >
            <MenuItem value="3">최근 3개월</MenuItem>
            <MenuItem value="6">최근 6개월</MenuItem>
            <MenuItem value="12">최근 12개월</MenuItem>
            <MenuItem value="24">최근 24개월</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 전체 요약 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📈 전체 요약
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="primary.contrastText">
                    {scanResults.length}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    총 스캔 수
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="error.contrastText">
                    {scanResults.reduce((sum, scan) => sum + (scan.stats?.findings || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="error.contrastText">
                    총 발견 수
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="warning.contrastText">
                    {misconfigStats.length}
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText">
                    미스컨피그레이션 유형
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                  <Typography variant="h4" color="success.contrastText">
                    {scanResults.length > 0 ? Math.round(scanResults.reduce((sum, scan) => sum + (scan.stats?.findings || 0), 0) / scanResults.length) : 0}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    평균 발견 수
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 차트 섹션 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* 월별 추이 차트 */}
          <Box sx={{ flex: '2 1 400px', minWidth: '400px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📅 월별 스캔 및 발견 추이
                </Typography>
                {monthlyStats.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: 350,
                    color: 'text.secondary'
                  }}>
                    <Typography variant="h6" gutterBottom>
                      📊 데이터가 없습니다
                    </Typography>
                    <Typography variant="body2">
                      스캔을 실행하면 월별 추이를 확인할 수 있습니다
                    </Typography>
                  </Box>
                ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="scans" stroke="#8884d8" strokeWidth={2} name="스캔 수" />
                    <Line type="monotone" dataKey="findings" stroke="#82ca9d" strokeWidth={2} name="발견 수" />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* 심각도별 분포 */}
          <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  🎯 심각도별 분포
                </Typography>
                {monthlyStats.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: 350,
                    color: 'text.secondary'
                  }}>
                    <Typography variant="h6" gutterBottom>
                      📊 데이터가 없습니다
                    </Typography>
                    <Typography variant="body2">
                      스캔을 실행하면 심각도별 분포를 확인할 수 있습니다
                    </Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Critical', value: monthlyStats.reduce((sum, m) => sum + m.critical, 0), color: COLORS.critical },
                          { name: 'High', value: monthlyStats.reduce((sum, m) => sum + m.high, 0), color: COLORS.high },
                          { name: 'Medium', value: monthlyStats.reduce((sum, m) => sum + m.medium, 0), color: COLORS.medium },
                          { name: 'Low', value: monthlyStats.reduce((sum, m) => sum + m.low, 0), color: COLORS.low },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Critical', value: monthlyStats.reduce((sum, m) => sum + m.critical, 0), color: COLORS.critical },
                          { name: 'High', value: monthlyStats.reduce((sum, m) => sum + m.high, 0), color: COLORS.high },
                          { name: 'Medium', value: monthlyStats.reduce((sum, m) => sum + m.medium, 0), color: COLORS.medium },
                          { name: 'Low', value: monthlyStats.reduce((sum, m) => sum + m.low, 0), color: COLORS.low },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* 미스컨피그레이션 상세 통계 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔍 미스컨피그레이션 상세 통계
            </Typography>
            {misconfigStats.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: 200,
                color: 'text.secondary'
              }}>
                <Typography variant="h6" gutterBottom>
                  📊 데이터가 없습니다
                </Typography>
                <Typography variant="body2">
                  스캔을 실행하면 미스컨피그레이션 통계를 확인할 수 있습니다
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>규칙 ID</TableCell>
                      <TableCell>심각도</TableCell>
                      <TableCell align="right">발견 횟수</TableCell>
                      <TableCell>설명</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {misconfigStats.map((misconfig, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {misconfig.ruleId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getSeverityLabel(misconfig.severity)}
                            size="small"
                            sx={{
                              bgcolor: getSeverityColor(misconfig.severity),
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="h6" color="primary">
                            {misconfig.count}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {misconfig.description}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* 미스컨피그레이션 빈도 차트 */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 미스컨피그레이션 빈도 (상위 10개)
            </Typography>
            {misconfigStats.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: 400,
                color: 'text.secondary'
              }}>
                <Typography variant="h6" gutterBottom>
                  📊 데이터가 없습니다
                </Typography>
                <Typography variant="body2">
                  스캔을 실행하면 미스컨피그레이션 빈도를 확인할 수 있습니다
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={misconfigStats.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ruleId" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default StatisticsTab;
