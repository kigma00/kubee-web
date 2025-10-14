import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { scanAPI } from '../../services/api';
import { ScanResult, AIMessage, Finding } from '../../types';
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

const AIAnalysis: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [exploitScenario, setExploitScenario] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<{status: string, message: string, has_knowledge_base: boolean} | null>(null);

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
      // API 응답 구조에 맞게 수정
      const scans = response.data.scans || [];
      
      // 스캔 히스토리 데이터를 ScanResult 형식으로 변환
      const convertedScans = scans.map((scan: any) => ({
        id: scan.filename,
        repository_name: scan.repoUrl.split('/').pop().replace('.git', ''),
        repository_url: scan.repoUrl,
        created_at: scan.timestamp,
        completed_at: scan.timestamp,
        status: 'completed' as const,
        files_scanned: scan.stats?.filesScanned || 0,
        findings: [], // 실제 findings는 별도로 로드
        deep_scan: false,
        auto_fix: false,
        saved_to: scan.savedTo,
        // 추가 메타데이터
        user: scan.user,
        stats: scan.stats
      }));
      
      setScanResults(convertedScans);
    } catch (error) {
      console.error('Failed to load scan results:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // 실제 AI API 호출
      const response = await fetch('http://localhost:8282/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: inputMessage })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || '죄송합니다. 응답을 생성할 수 없습니다.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '죄송합니다. AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScanDetails = async (filename: string) => {
    try {
      const response = await scanAPI.getScanResult(filename);
      return response.data;
    } catch (error) {
      console.error('Failed to load scan details:', error);
      return null;
    }
  };

  const handleAnalyzeScan = async () => {
    if (!selectedScan) return;

    setIsLoading(true);
    try {
      // 선택된 스캔의 상세 데이터 로드
      const scanDetails = await loadScanDetails(selectedScan.id);
      if (!scanDetails) {
        throw new Error('스캔 상세 데이터를 로드할 수 없습니다.');
      }

      // 실제 AI 분석 API 호출
      const response = await fetch('http://localhost:8282/api/ai/analyze-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ scan_results: scanDetails })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.analysis || '분석 결과를 생성할 수 없습니다.');
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysis('죄송합니다. AI 분석 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateExploitScenario = async () => {
    if (!selectedScan) {
      // 스캔이 선택되지 않은 경우 일반적인 시나리오 생성
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:8282/api/ai/exploit-scenario', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setExploitScenario(data.scenario || '익스플로잇 시나리오를 생성할 수 없습니다.');
      } catch (error) {
        console.error('Scenario generation error:', error);
        setExploitScenario('죄송합니다. 익스플로잇 시나리오 생성 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 선택된 스캔 결과 기반 시나리오 생성
    setIsLoading(true);
    try {
      // 선택된 스캔의 상세 데이터 로드
      const scanDetails = await loadScanDetails(selectedScan.id);
      if (!scanDetails) {
        throw new Error('스캔 상세 데이터를 로드할 수 없습니다.');
      }

      // 스캔 결과 기반 익스플로잇 시나리오 생성 API 호출
      const response = await fetch('http://localhost:8282/api/ai/exploit-scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ scan_results: scanDetails })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setExploitScenario(data.scenario || '스캔 결과 기반 익스플로잇 시나리오를 생성할 수 없습니다.');
    } catch (error) {
      console.error('Scan-based scenario generation error:', error);
      setExploitScenario('죄송합니다. 스캔 결과 기반 익스플로잇 시나리오 생성 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSecurityRecommendations = async () => {
    setIsLoading(true);
    try {
      // 일반 보안 권장사항 생성 API 호출
      const response = await fetch('http://localhost:8282/api/ai/security-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.recommendations || '보안 권장사항을 생성할 수 없습니다.');
    } catch (error) {
      console.error('Security recommendations error:', error);
      setAnalysis('죄송합니다. 보안 권장사항 생성 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateScanBasedRecommendations = async () => {
    if (!selectedScan) return;

    setIsLoading(true);
    try {
      // 선택된 스캔의 상세 데이터 로드
      const scanDetails = await loadScanDetails(selectedScan.id);
      if (!scanDetails) {
        throw new Error('스캔 상세 데이터를 로드할 수 없습니다.');
      }

      // 스캔 결과 기반 보안 권장사항 생성 API 호출
      const response = await fetch('http://localhost:8282/api/ai/security-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ scan_results: scanDetails })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data.recommendations || '스캔 결과 기반 권장사항을 생성할 수 없습니다.');
    } catch (error) {
      console.error('Scan-based recommendations error:', error);
      setAnalysis('죄송합니다. 스캔 결과 기반 권장사항 생성 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🤖 AI 보안 분석
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Kubernetes 보안 전문가 AI와 대화하고 스캔 결과를 분석해보세요
      </Typography>

      {aiStatus && (
        <Alert 
          severity={aiStatus.status === 'available' ? 'success' : 'warning'} 
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            <strong>AI 서비스 상태:</strong> {aiStatus.message}
            {aiStatus.has_knowledge_base && (
              <span> | <strong>지식베이스:</strong> 로드됨</span>
            )}
          </Typography>
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="💬 일반 보안 질문" icon={<ChatIcon />} />
            <Tab label="🔍 스캔 결과 분석" icon={<AnalyticsIcon />} />
            <Tab label="⚠️ 익스플로잇 시나리오" icon={<WarningIcon />} />
            <Tab label="🛡️ 보안 권장사항" icon={<SecurityIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ flexGrow: 1, p: 2, mb: 2, overflow: 'auto', bgcolor: 'grey.50' }}>
              {messages.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Kubernetes 보안에 대해 궁금한 것을 질문해보세요!
                </Typography>
              ) : (
                messages.map((message, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={message.type === 'user' ? '사용자' : 'AI'}
                        color={message.type === 'user' ? 'primary' : 'secondary'}
                        size="small"
                      />
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Paper sx={{ p: 2, bgcolor: message.type === 'user' ? 'primary.light' : 'grey.100' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                    </Paper>
                  </Box>
                ))
              )}
              {isLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">AI가 답변을 생성하는 중...</Typography>
                </Box>
              )}
            </Paper>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Kubernetes 보안에 대해 질문해보세요..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                startIcon={<SendIcon />}
              >
                전송
              </Button>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            <Typography variant="h6" gutterBottom>
              스캔 결과 AI 분석
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              저장된 스캔 결과 중 하나를 선택하여 AI가 분석합니다.
            </Typography>

            {!scanResults || scanResults.length === 0 ? (
              <Alert severity="info">분석할 스캔 결과가 없습니다. 먼저 스캔을 실행해주세요.</Alert>
            ) : (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  📊 스캔 결과 선택
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      fullWidth
                      select
                      label="분석할 스캔 결과를 선택하세요"
                      value={selectedScan?.id || ''}
                      onChange={(e) => {
                        const scan = scanResults?.find(s => s.id === e.target.value);
                        setSelectedScan(scan || null);
                      }}
                      SelectProps={{ native: true }}
                      sx={{ 
                        '& .MuiInputLabel-root': {
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }
                      }}
                    >
                      <option value=""></option>
                      {scanResults?.map((result) => (
                        <option key={result.id} value={result.id}>
                          {result.repository_name} ({new Date(result.created_at).toLocaleDateString()}) - {result.stats?.findings || 0}개 발견
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleAnalyzeScan}
                      disabled={!selectedScan || isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <AnalyticsIcon />}
                      sx={{ height: '56px' }}
                    >
                      {isLoading ? '분석 중...' : '🤖 AI 분석 시작'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

            {selectedScan && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  선택된 스캔 결과 미리보기
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>저장소:</strong> {selectedScan.repository_name}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>발견된 문제:</strong> {selectedScan.stats?.findings || 0}개
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>스캔 일시:</strong> {new Date(selectedScan.created_at).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {analysis && (
              <Paper sx={{ p: 3, mt: 3 }}>
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

        <TabPanel value={tabValue} index={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              익스플로잇 시나리오 생성
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              선택된 스캔 결과의 취약점을 기반으로 구체적인 익스플로잇 시나리오를 생성합니다.
            </Typography>

            {!scanResults || scanResults.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                스캔 결과가 없어 일반적인 익스플로잇 시나리오를 생성합니다.
              </Alert>
            ) : (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  📊 스캔 결과 선택 (선택사항)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <TextField
                      fullWidth
                      select
                      label="시나리오 생성에 사용할 스캔 결과를 선택하세요"
                      value={selectedScan?.id || ''}
                      onChange={(e) => {
                        const scan = scanResults?.find(s => s.id === e.target.value);
                        setSelectedScan(scan || null);
                      }}
                      SelectProps={{ native: true }}
                      sx={{ 
                        '& .MuiInputLabel-root': {
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }
                      }}
                    >
                      <option value=""></option>
                      {scanResults?.map((result) => (
                        <option key={result.id} value={result.id}>
                          {result.repository_name} ({new Date(result.created_at).toLocaleDateString()}) - {result.stats?.findings || 0}개 발견
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={generateExploitScenario}
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <WarningIcon />}
                      sx={{ height: '56px' }}
                    >
                      {isLoading ? '생성 중...' : '🎯 익스플로잇 시나리오 생성'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}

            {selectedScan && (
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" gutterBottom>
                  선택된 스캔 결과 미리보기
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>저장소:</strong> {selectedScan.repository_name}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>발견된 문제:</strong> {selectedScan.stats?.findings || 0}개
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>스캔 일시:</strong> {new Date(selectedScan.created_at).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {exploitScenario && (
              <Paper sx={{ p: 3, mt: 3 }}>
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

        <TabPanel value={tabValue} index={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              보안 권장사항 생성
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              스캔 결과를 바탕으로 구체적인 보안 권장사항을 생성합니다.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={generateSecurityRecommendations}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <SecurityIcon />}
                >
                  {isLoading ? '생성 중...' : '🛡️ 일반 보안 권장사항 생성'}
                </Button>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={generateScanBasedRecommendations}
                  disabled={!selectedScan || isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <AnalyticsIcon />}
                >
                  {isLoading ? '생성 중...' : '📊 스캔 결과 기반 권장사항'}
                </Button>
              </Grid>
            </Grid>

            {analysis && (
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🛡️ 보안 권장사항
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {analysis}
                </Typography>
              </Paper>
            )}
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default AIAnalysis;