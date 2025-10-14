import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  Paper,
  Chip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Code as CodeIcon,
  FileOpen as FileOpenIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import { scanAPI } from '../../services/api';
import { ScanResult, Finding } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';

interface ScanFormProps {
  onScanComplete: (result: ScanResult) => void;
}

const ScanForm: React.FC<ScanFormProps> = ({ onScanComplete }) => {
  const { showBrowserNotification, showSuccess, showError } = useNotification();
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  // 설정 로드 제거 (스캔 옵션이 없으므로 불필요)

  const handleScan = async () => {
    if (!repoUrl.trim()) {
      setError('GitHub 저장소 URL을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await scanAPI.startScan({
        repository_url: repoUrl
      });
      const result = response.data;
      setLastResult(result);
      onScanComplete(result);
      setRepoUrl(''); // 폼 초기화
      
      // 브라우저 알림 표시
      showBrowserNotification(
        '스캔 완료',
        `${result.repository_name || repoUrl} 스캔이 완료되었습니다. ${result.stats?.findings || 0}개의 문제가 발견되었습니다.`,
        {
          tag: 'scan-complete',
          requireInteraction: true,
        }
      );
      
      showSuccess('스캔이 완료되었습니다!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '스캔 중 오류가 발생했습니다.';
      setError(errorMessage);
      
      // 오류 알림 표시
      showBrowserNotification(
        '스캔 실패',
        `${repoUrl} 스캔 중 오류가 발생했습니다: ${errorMessage}`,
        {
          tag: 'scan-error',
          requireInteraction: true,
        }
      );
      
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setRepoUrl('');
    setError(null);
    setLastResult(null);
  };

  const handleDownload = () => {
    if (!lastResult) return;

    const dataStr = JSON.stringify(lastResult, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scan_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      case 'unknown': return 'default';
      default: return 'default';
    }
  };

  const getSeverityEmoji = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      case 'unknown': return '⚪';
      default: return '⚪';
    }
  };

  const groupFindingsByRule = (findings: Finding[]) => {
    const grouped: { [key: string]: Finding[] } = {};
    findings.forEach(finding => {
      const ruleId = finding.rule_id;
      if (!grouped[ruleId]) {
        grouped[ruleId] = [];
      }
      grouped[ruleId].push(finding);
    });
    return grouped;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        🔍 Kubernetes 설정 파일 스캔
      </Typography>
      
      <Card>
        <CardContent>
          <Box component="form" noValidate>
            <TextField
              fullWidth
              label="📁 GitHub 저장소 URL"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              margin="normal"
              disabled={isLoading}
              helperText="스캔할 Kubernetes 설정 파일이 있는 GitHub 저장소의 URL을 입력하세요."
            />

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              📋 스캔 정보
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Kubernetes YAML/JSON 파일에서 보안 취약점을 검사합니다.
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={handleScan}
                disabled={isLoading || !repoUrl.trim()}
                startIcon={isLoading ? <CircularProgress size={20} /> : <PlayIcon />}
                size="large"
              >
                {isLoading ? '스캔 중...' : '🚀 스캔 시작'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={isLoading}
                startIcon={<ClearIcon />}
                size="large"
              >
                🗑️ 초기화
              </Button>
              
              {lastResult && (
                <Button
                  variant="outlined"
                  onClick={handleDownload}
                  startIcon={<DownloadIcon />}
                  size="large"
                >
                  📥 결과 다운로드
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 스캔 결과 표시 */}
      {lastResult && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 스캔 결과
            </Typography>
            
            {/* 결과 통계 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {lastResult.stats?.filesScanned || lastResult.files_scanned || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    📁 스캔된 파일
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error">
                    {lastResult.stats?.findings || lastResult.findings.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    🔍 발견된 문제
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    ✅
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    💾 저장 상태
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* 발견된 문제들 */}
            {lastResult.findings && lastResult.findings.length > 0 ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  🔍 발견된 보안 문제
                </Typography>
                {Object.entries(groupFindingsByRule(lastResult.findings)).map(([ruleId, findings]) => (
                  <Paper key={ruleId} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <span>{getSeverityEmoji(findings[0].severity || 'unknown')}</span>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {ruleId} ({findings.length}개 발견)
                      </Typography>
                      <Chip 
                        label={(findings[0].severity || 'unknown').toUpperCase()} 
                        color={getSeverityColor(findings[0].severity || 'unknown') as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {findings[0].description}
                    </Typography>
                    
                    {findings.map((finding, idx) => (
                      <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CodeIcon fontSize="small" />
                          <Typography variant="subtitle2">
                            위치 {idx + 1}:
                          </Typography>
                        </Box>
                        
                        <Paper 
                          component="pre" 
                          sx={{ 
                            bgcolor: 'grey.100', 
                            p: 2, 
                            borderRadius: 1, 
                            fontSize: '0.875rem',
                            overflow: 'auto',
                            mb: 1,
                            fontFamily: 'monospace'
                          }}
                        >
                          {finding.matchedText || finding.matched_text}
                        </Paper>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <FileOpenIcon fontSize="small" />
                          <Typography variant="caption" color="text.secondary">
                            파일: {finding.filePath || finding.file_path} (라인 {finding.lineNumber || finding.line_number})
                          </Typography>
                        </Box>
                        
                        {(finding.fixSuggestion || finding.fix_suggestion) && (
                          <Alert 
                            severity="info" 
                            icon={<LightbulbIcon />}
                            sx={{ mt: 1 }}
                          >
                            <Typography variant="subtitle2" gutterBottom>
                              💡 수정 제안:
                            </Typography>
                            <Typography variant="body2">
                              {finding.fixSuggestion || finding.fix_suggestion}
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    ))}
                  </Paper>
                ))}
              </Box>
            ) : (
              <Alert severity="success" icon={false}>
                🎉 보안 문제가 발견되지 않았습니다!
              </Alert>
            )}

            {lastResult.saved_to && (
              <Alert severity="info" sx={{ mt: 2 }}>
                📁 결과가 저장되었습니다: `{lastResult.saved_to}`
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ScanForm;
