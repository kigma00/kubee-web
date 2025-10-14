import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  FileOpen as FileOpenIcon,
  Lightbulb as LightbulbIcon,
  GetApp as GetAppIcon,
  TableView as TableChartIcon,
} from '@mui/icons-material';
import { scanAPI } from '../../services/api';
import { ScanResult, Finding } from '../../types';
import { exportScanResultsToCSV, exportScanReport } from '../../utils/exportUtils';
import { useNotification } from '../../contexts/NotificationContext';

interface ScanHistoryItem {
  filename: string;
  repoUrl: string;
  timestamp: string;
  stats: {
    filesScanned: number;
    findings: number;
  };
  savedTo: string;
}

const ScanResults: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [scanDetails, setScanDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScanHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Loading scan history...');
      const response = await scanAPI.getScanHistory();
      console.log('Scan history response:', response.data);
      setScanHistory(response.data.scans || []);
      if (response.data.scans && response.data.scans.length > 0) {
        console.log('Setting selected scan:', response.data.scans[0]);
        setSelectedScan(response.data.scans[0]);
        // 첫 번째 스캔의 상세 정보도 로드
        loadScanDetails(response.data.scans[0].filename);
      }
    } catch (err: any) {
      setError('스캔 히스토리를 불러오는데 실패했습니다.');
      console.error('Failed to load scan history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScanDetails = async (filename: string) => {
    setIsLoadingDetails(true);
    setError(null);
    try {
      console.log('Loading scan details for:', filename);
      const response = await scanAPI.getScanResult(filename);
      console.log('Scan details response:', response.data);
      setScanDetails(response.data);
    } catch (err: any) {
      setError('스캔 결과를 불러오는데 실패했습니다.');
      console.error('Failed to load scan details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleExportCSV = () => {
    if (!scanDetails) {
      showError('내보낼 스캔 결과가 없습니다.');
      return;
    }
    try {
      exportScanResultsToCSV(scanDetails);
      showSuccess('CSV 파일이 다운로드되었습니다.');
    } catch (error) {
      showError('CSV 내보내기에 실패했습니다.');
    }
  };

  const handleExportJSON = () => {
    if (!scanDetails) {
      showError('내보낼 스캔 결과가 없습니다.');
      return;
    }
    try {
      exportScanReport(scanDetails);
      showSuccess('JSON 보고서가 다운로드되었습니다.');
    } catch (error) {
      showError('JSON 내보내기에 실패했습니다.');
    }
  };

  useEffect(() => {
    loadScanHistory();
  }, []);

  useEffect(() => {
    if (selectedScan) {
      loadScanDetails(selectedScan.filename);
    }
  }, [selectedScan]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityEmoji = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const groupFindingsByRule = (findings: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    findings.forEach(finding => {
      const ruleId = finding.ruleId;
      if (!grouped[ruleId]) {
        grouped[ruleId] = [];
      }
      grouped[ruleId].push(finding);
    });
    return grouped;
  };

  const downloadResult = (scanData: any) => {
    const dataStr = JSON.stringify(scanData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scanData.repoUrl.split('/').pop()}_scan_result.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string, filename?: string) => {
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
          
          return date.toLocaleString();
        }
      } catch {
        // 파일명에서 추출 실패시 파일 수정 시간 사용
        return '시간 정보 없음';
      }
    }
    
    return '시간 정보 없음';
  };

  const getRepoName = (repoUrl: string) => {
    const parts = repoUrl.split('/');
    return parts[parts.length - 1].replace('.git', '');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">📁 저장된 스캔 결과</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {scanDetails && (
            <>
              <Button
                variant="outlined"
                startIcon={<TableChartIcon />}
                onClick={handleExportCSV}
                color="primary"
              >
                CSV 내보내기
              </Button>
              <Button
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={handleExportJSON}
                color="secondary"
              >
                JSON 보고서
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadScanHistory}
            disabled={isLoading}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {scanHistory.length === 0 ? (
        <Alert severity="info">저장된 스캔 결과가 없습니다.</Alert>
      ) : (
        <Box>
          {/* 스캔 선택 드롭다운 */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>스캔 결과 선택</InputLabel>
            <Select
              value={selectedScan?.filename || ''}
              onChange={(e) => {
                const selected = scanHistory.find(scan => scan.filename === e.target.value);
                setSelectedScan(selected || null);
              }}
              label="스캔 결과 선택"
            >
              {scanHistory.map((scan) => (
                <MenuItem key={scan.filename} value={scan.filename}>
                  <Box>
                    <Typography variant="body1">
                      {getRepoName(scan.repoUrl)} ({scan.stats.findings}개 문제)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(scan.timestamp, scan.filename)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 선택된 스캔 결과 표시 */}
          {selectedScan && scanDetails && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" gutterBottom>
                      {getRepoName(scanDetails.repoUrl)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(scanDetails.timestamp, selectedScan?.filename)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Chip 
                        label={`파일: ${scanDetails.stats?.filesScanned}개`} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`문제: ${scanDetails.stats?.findings}개`} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    </Box>
                  </Grid>
                </Grid>

                {/* 통계 정보 */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    📊 스캔 통계
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="h6" color="primary">
                        {scanDetails.stats?.filesScanned || 0}
                      </Typography>
                      <Typography variant="caption">스캔된 파일</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="h6" color="error">
                        {scanDetails.findings?.filter((f: any) => f.severity === 'critical').length || 0}
                      </Typography>
                      <Typography variant="caption">Critical</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="h6" color="warning.main">
                        {scanDetails.findings?.filter((f: any) => f.severity === 'high').length || 0}
                      </Typography>
                      <Typography variant="caption">High</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="h6" color="info.main">
                        {(scanDetails.findings?.filter((f: any) => f.severity === 'medium').length || 0) + 
                         (scanDetails.findings?.filter((f: any) => f.severity === 'low').length || 0)}
                      </Typography>
                      <Typography variant="caption">Medium/Low</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* 로딩 상태 */}
                {isLoadingDetails ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {/* 발견된 문제들 */}
                    {scanDetails.findings && scanDetails.findings.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          🔍 발견된 보안 문제
                        </Typography>
                        {Object.entries(groupFindingsByRule(scanDetails.findings)).map(([ruleId, findings]) => (
                          <Accordion key={ruleId} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <span>{getSeverityEmoji(findings[0].severity || 'unknown')}</span>
                                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                  {ruleId} ({findings.length}개 발견)
                                </Typography>
                                <Chip 
                                  label={(findings[0].severity || 'unknown').toUpperCase()} 
                                  size="small" 
                                  color={getSeverityColor(findings[0].severity || 'unknown') as any}
                                />
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography variant="body2" sx={{ mb: 2 }}>
                                {findings[0].description || '보안 위험이 발견되었습니다.'}
                              </Typography>
                              
                              {findings.map((finding, idx) => (
                                <Box key={idx} sx={{ mb: 2 }}>
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
                                    {finding.matchedText}
                                  </Paper>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <FileOpenIcon fontSize="small" />
                                    <Typography variant="caption" color="text.secondary">
                                      파일: {finding.filePath} (라인 {finding.lineNumber})
                                    </Typography>
                                  </Box>
                                  
                                  {idx < findings.length - 1 && <Divider sx={{ mt: 2 }} />}
                                </Box>
                              ))}
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </Box>
                    ) : (
                      <Alert severity="success" icon={false}>
                        🎉 보안 문제가 발견되지 않았습니다!
                      </Alert>
                    )}

                    {/* 다운로드 버튼 */}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadResult(scanDetails)}
                      >
                        JSON 다운로드
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ScanResults;
