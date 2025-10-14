import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  Divider,
  Button,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { scanAPI } from '../../services/api';
import { ScanResult } from '../../types';
import AIChat from './AIChat';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AIAnalysisNew: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);


  const [analysis, setAnalysis] = useState<string>('');
  const [exploitScenario, setExploitScenario] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<{status: string, message: string, has_knowledge_base: boolean} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);

  // 스캔 날짜 포맷팅 함수
  const formatScanDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown Date';
    
    // YYYYMMDD_HHMMSS 형식인 경우
    if (timestamp.match(/^\d{8}_\d{6}$/)) {
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(9, 11);
      const minute = timestamp.substring(11, 13);
      const second = timestamp.substring(13, 15);
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
      return date.toLocaleString('ko-KR');
    }
    
    // ISO 형식인 경우
    try {
      return new Date(timestamp).toLocaleString('ko-KR');
    } catch {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    loadScanResults();
    checkAiStatus();
  }, []);

  const checkAiStatus = async () => {
    try {
      const response = await fetch('http://localhost:8282/api/ai/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiStatus(data);
      }
    } catch (error) {
      console.error('AI status check failed:', error);
    }
  };

  const loadScanResults = async () => {
    try {
      const response = await scanAPI.getScanHistory();
      setScanResults(response.data.scans || []);
    } catch (error) {
      console.error('Failed to load scan results:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const analyzeScanResults = async () => {
    if (!selectedScan) {
      alert('분석할 스캔 결과를 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:8282/api/ai/analyze-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          scan_results: selectedScan
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.analysis || '분석 결과를 생성할 수 없습니다.');
    } catch (error) {
      console.error('Analysis error:', error);
      alert('분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateExploitScenario = async () => {
    if (!selectedScan) {
      alert('시나리오를 생성할 스캔 결과를 선택해주세요.');
      return;
    }

    setIsGeneratingScenario(true);
    try {
      const response = await fetch('http://localhost:8282/api/ai/exploit-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          scan_results: selectedScan
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setExploitScenario(data.scenario || '시나리오를 생성할 수 없습니다.');
    } catch (error) {
      console.error('Scenario generation error:', error);
      alert('시나리오 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const generateRecommendations = async () => {
    if (!selectedScan) {
      alert('권장사항을 생성할 스캔 결과를 선택해주세요.');
      return;
    }

    setIsGeneratingRecommendations(true);
    try {
      const response = await fetch('http://localhost:8282/api/ai/security-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          scan_results: selectedScan
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecommendations(data.recommendations || '권장사항을 생성할 수 없습니다.');
    } catch (error) {
      console.error('Recommendations generation error:', error);
      alert('권장사항 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        🤖 AI 보안 분석
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        AI를 활용한 Kubernetes 보안 분석 및 권장사항을 제공합니다.
      </Typography>

      {/* AI 상태 표시 */}
      {aiStatus && (
        <Alert 
          severity={aiStatus.status === 'available' ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2">
              <strong>AI 서비스 상태:</strong> {aiStatus.message}
            </Typography>
            {aiStatus.has_knowledge_base && (
              <Chip label="지식베이스 연결됨" size="small" color="success" variant="outlined" />
            )}
          </Box>
        </Alert>
      )}

      {/* 스캔 결과 선택 */}
      {scanResults.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📊 스캔 결과 선택
                  </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              특정 스캔 결과를 선택하면 해당 결과를 기반으로 더 정확한 분석을 제공합니다.
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Select
                value={selectedScan ? (selectedScan as any).filename || selectedScan.id : ''}
                onChange={(e) => {
                  const selectedFilename = e.target.value;
                  if (selectedFilename === '') {
                    setSelectedScan(null);
                  } else {
                    const scan = scanResults.find(s => (s as any).filename === selectedFilename || s.id === selectedFilename);
                    setSelectedScan(scan || null);
                  }
                }}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) {
                    return <em style={{ color: '#999' }}>스캔 결과를 선택하세요</em>;
                  }
                  const scan = scanResults.find(s => (s as any).filename === selected || s.id === selected);
                  if (!scan) return <em style={{ color: '#999' }}>스캔 결과를 선택하세요</em>;
                  return (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {scan.repository_name || (scan as any).repoUrl?.split('/').pop()?.replace('.git', '') || 'Unknown Repository'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {scan.stats?.findings || 0}개 문제 발견 • {formatScanDate((scan as any).timestamp || scan.created_at)}
                      </Typography>
                    </Box>
                  );
                }}
              >
                <MenuItem value="">
                  <em style={{ color: '#999' }}>선택 안함</em>
                </MenuItem>
                {scanResults.slice(0, 10).map((scan, index) => (
                  <MenuItem key={(scan as any).filename || scan.id || `scan-${index}`} value={(scan as any).filename || scan.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="subtitle2">
                        {scan.repository_name || (scan as any).repoUrl?.split('/').pop()?.replace('.git', '') || 'Unknown Repository'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {scan.stats?.findings || 0}개 문제 발견 • {formatScanDate((scan as any).timestamp || scan.created_at)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedScan ? (
              <Paper sx={{ p: 2, bgcolor: 'primary.50', border: 2, borderColor: 'primary.main' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label="선택됨" 
                    color="primary" 
                    size="small" 
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    선택된 스캔 정보
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>저장소:</strong> {selectedScan.repository_name || (selectedScan as any).repoUrl || 'Unknown Repository'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>발견된 문제:</strong> {selectedScan.stats?.findings || 0}개
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>스캔 일시:</strong> {formatScanDate((selectedScan as any).timestamp || selectedScan.created_at)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                스캔 결과를 선택하면 AI 분석을 실행할 수 있습니다.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* 탭 메뉴 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="💬 AI 채팅" icon={<ChatIcon />} />
          <Tab label="🔍 스캔 결과 분석" icon={<AnalyticsIcon />} />
          <Tab label="⚠️ 익스플로잇 시나리오" icon={<WarningIcon />} />
          <Tab label="🛡️ 보안 권장사항" icon={<SecurityIcon />} />
        </Tabs>
      </Box>

      {/* AI 채팅 탭 */}
      <TabPanel value={tabValue} index={0}>
        <AIChat
          selectedScan={selectedScan}
          onAnalysisComplete={setAnalysis}
          onScenarioComplete={setExploitScenario}
          onRecommendationComplete={setAnalysis}
        />
      </TabPanel>

      {/* 스캔 결과 분석 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Box>
          <Typography variant="h6" gutterBottom>
            스캔 결과 분석
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            선택된 스캔 결과를 AI가 분석하여 보안 취약점과 개선 방안을 제시합니다.
          </Typography>

          {selectedScan ? (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" gutterBottom>
                선택된 스캔 정보
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2">
                    <strong>저장소:</strong> {selectedScan.repository_name || selectedScan.repository_url}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2">
                    <strong>발견된 문제:</strong> {selectedScan.stats?.findings || 0}개
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2">
                    <strong>스캔 일시:</strong> {formatScanDate((selectedScan as any).timestamp || selectedScan.created_at)}
                  </Typography>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={analyzeScanResults}
                  disabled={isAnalyzing}
                  startIcon={isAnalyzing ? <CircularProgress size={20} /> : <AnalyticsIcon />}
                >
                  {isAnalyzing ? '분석 중...' : '스캔 결과 분석하기'}
                </Button>
              </Box>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              스캔 결과를 선택하면 AI 분석을 실행할 수 있습니다.
            </Alert>
          )}

          {analysis && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                📊 AI 분석 결과
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {analysis}
              </Typography>
            </Paper>
          )}
        </Box>
      </TabPanel>

      {/* 익스플로잇 시나리오 탭 */}
      <TabPanel value={tabValue} index={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            익스플로잇 시나리오 생성
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            선택된 스캔 결과의 취약점을 기반으로 구체적인 익스플로잇 시나리오를 생성합니다.
          </Typography>

          {selectedScan ? (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                color="warning"
                onClick={generateExploitScenario}
                disabled={isGeneratingScenario}
                startIcon={isGeneratingScenario ? <CircularProgress size={20} /> : <WarningIcon />}
              >
                {isGeneratingScenario ? '시나리오 생성 중...' : '익스플로잇 시나리오 생성하기'}
              </Button>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              스캔 결과를 선택하면 익스플로잇 시나리오를 생성할 수 있습니다.
            </Alert>
          )}

          {exploitScenario && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🎯 익스플로잇 시나리오
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {exploitScenario}
              </Typography>
            </Paper>
          )}
        </Box>
      </TabPanel>

      {/* 보안 권장사항 탭 */}
      <TabPanel value={tabValue} index={3}>
        <Box>
          <Typography variant="h6" gutterBottom>
            보안 권장사항 생성
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            스캔 결과를 바탕으로 구체적인 보안 권장사항을 생성합니다.
          </Typography>

          {selectedScan ? (
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                color="success"
                onClick={generateRecommendations}
                disabled={isGeneratingRecommendations}
                startIcon={isGeneratingRecommendations ? <CircularProgress size={20} /> : <SecurityIcon />}
              >
                {isGeneratingRecommendations ? '권장사항 생성 중...' : '보안 권장사항 생성하기'}
              </Button>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              스캔 결과를 선택하면 보안 권장사항을 생성할 수 있습니다.
            </Alert>
          )}

          {recommendations && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                🛡️ 보안 권장사항
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {recommendations}
              </Typography>
            </Paper>
          )}
        </Box>
      </TabPanel>
    </Box>
  );
};

export default AIAnalysisNew;
