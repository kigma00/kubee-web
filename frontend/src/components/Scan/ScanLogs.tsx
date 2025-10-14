import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { scanAPI, logAPI } from '../../services/api';
import { ScanLog } from '../../types';

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

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  data: any;
}

const ScanLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [logDetailsOpen, setLogDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isConverting, setIsConverting] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 스캔 히스토리 관련 상태 (기존 기능 유지)
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(null);
  const [scanDetails, setScanDetails] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 실제 로그 데이터 로드
      const logsResponse = await logAPI.getLogs({
        category: selectedCategory || undefined,
        limit: 1000 // 더 많은 로그를 가져와서 페이지네이션 효과 확인
      });
      setLogs(logsResponse.data.logs || []);
      
      // 스캔 히스토리도 함께 로드 (기존 기능 유지)
      const historyResponse = await scanAPI.getScanHistory();
      setScanHistory(historyResponse.data.scans || []);
      
      // 로그 로딩 후 첫 페이지로 이동
      setCurrentPage(1);
      
    } catch (err: any) {
      setError('로그를 불러오는데 실패했습니다.');
      console.error('Failed to load logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await logAPI.getLogCategories();
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const convertScanHistory = async () => {
    setIsConverting(true);
    try {
      const response = await logAPI.convertScanHistory();
      alert(response.data.message);
      // 변환 후 로그 다시 로드
      await loadLogs();
    } catch (err: any) {
      alert('스캔 히스토리 변환에 실패했습니다: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsConverting(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await logAPI.getLogStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadScanDetails = async (filename: string) => {
    try {
      const response = await scanAPI.getScanResult(filename);
      setScanDetails(response.data);
      setDetailsOpen(true);
    } catch (err: any) {
      setError('스캔 결과를 불러오는데 실패했습니다.');
      console.error('Failed to load scan details:', err);
    }
  };

  useEffect(() => {
    // 설정에서 페이지당 항목 수 로드
    const savedItemsPerPage = localStorage.getItem('kubee_items_per_page');
    if (savedItemsPerPage) {
      setItemsPerPage(parseInt(savedItemsPerPage, 10));
    }
    
    loadLogs();
    loadCategories();
    loadStats();
  }, [selectedCategory]);

  useEffect(() => {
    // 페이지당 항목 수가 변경되면 첫 페이지로 이동
    setCurrentPage(1);
  }, [itemsPerPage]);

  // 페이지네이션 로직
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleItemsPerPageChange = (event: any) => {
    const newItemsPerPage = event.target.value;
    setItemsPerPage(newItemsPerPage);
    localStorage.setItem('kubee_items_per_page', newItemsPerPage.toString());
  };

  const getStatusChip = () => {
    return (
      <Chip
        label="완료"
        color="success"
        size="small"
        variant="outlined"
      />
    );
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
        <Typography variant="h5">📊 스캔 로그</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={convertScanHistory}
            disabled={isConverting}
            startIcon={isConverting ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            {isConverting ? '변환 중...' : '🔄 이전 스캔을 로그로 변환'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadLogs}
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

      {/* 통계 정보 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {scanHistory.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총 스캔 수
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {scanHistory.reduce((sum, log) => sum + log.stats.filesScanned, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총 스캔된 파일
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {scanHistory.reduce((sum, log) => sum + log.stats.findings, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총 발견된 문제
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {scanHistory.length === 0 ? (
        <Alert severity="info">스캔 히스토리가 없습니다.</Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>저장소</TableCell>
                <TableCell>URL</TableCell>
                <TableCell align="center">파일 수</TableCell>
                <TableCell align="center">문제 수</TableCell>
                <TableCell>스캔 시간</TableCell>
                <TableCell align="center">상태</TableCell>
                <TableCell align="center">액션</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getPaginatedData(scanHistory).map((log, index) => (
                <TableRow key={log.filename || index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      📁 {getRepoName(log.repoUrl)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color="primary"
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {log.repoUrl}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {log.stats.filesScanned}개
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      variant="body2" 
                      color={log.stats.findings > 0 ? 'error.main' : 'text.secondary'}
                    >
                      {log.stats.findings}개
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(log.timestamp, log.filename)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip()}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="결과 보기">
                      <IconButton 
                        size="small"
                        onClick={() => {
                          // 스캔 히스토리인 경우에만 상세 보기 가능
                          if ('filename' in log) {
                            loadScanDetails(log.filename);
                          } else {
                            // 시스템 로그인 경우 로그 상세 다이얼로그 열기
                            setSelectedLog(log);
                            setLogDetailsOpen(true);
                          }
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="다운로드">
                      <IconButton 
                        size="small"
                        onClick={async () => {
                          // 스캔 히스토리인 경우에만 다운로드 가능
                          if ('filename' in log) {
                            try {
                              const response = await fetch(`http://localhost:8282/scan/${log.filename}`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                }
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = log.filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } else {
                                alert('다운로드에 실패했습니다.');
                              }
                            } catch (error) {
                              console.error('Download error:', error);
                              alert('다운로드 중 오류가 발생했습니다.');
                            }
                          } else {
                            // 시스템 로그인 경우 다운로드 불가
                            alert('시스템 로그는 다운로드할 수 없습니다. 스캔 히스토리에서 다운로드해주세요.');
                          }
                        }}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 페이지네이션 */}
        {scanHistory.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                페이지당 항목 수:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  displayEmpty
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary">
                총 {scanHistory.length}개 항목
              </Typography>
            </Box>
            <Pagination
              count={getTotalPages(scanHistory)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
        </>
      )}

      {/* 실제 로그 뷰어 섹션 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          📊 시스템 로그
        </Typography>
        
        {/* 카테고리 필터 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            카테고리 필터:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant={selectedCategory === '' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSelectedCategory('')}
            >
              전체
            </Button>
            {categories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* 로그 목록 */}
        {logs.length === 0 ? (
          <Alert severity="info">로그가 없습니다.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>시간</TableCell>
                  <TableCell>레벨</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>메시지</TableCell>
                  <TableCell align="center">액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getPaginatedData(logs).map((log, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(log.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level}
                        color={log.level === 'ERROR' ? 'error' : log.level === 'WARNING' ? 'warning' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          maxWidth: 300, 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {log.message}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="상세 보기">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedLog(log);
                            setLogDetailsOpen(true);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 시스템 로그 페이지네이션 */}
        {logs.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                총 {logs.length}개 항목 중 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, logs.length)}개 표시
              </Typography>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <InputLabel>페이지당</InputLabel>
                <Select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  label="페이지당"
                >
                  <MenuItem value={5}>5개</MenuItem>
                  <MenuItem value={10}>10개</MenuItem>
                  <MenuItem value={25}>25개</MenuItem>
                  <MenuItem value={50}>50개</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Pagination
              count={getTotalPages(logs)}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>

      {/* 스캔 결과 상세 다이얼로그 */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          스캔 결과 상세
        </DialogTitle>
        <DialogContent>
          {scanDetails && (
            <Box>
              <Typography variant="h6" gutterBottom>
                저장소: {scanDetails.repoUrl}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                스캔 시간: {formatTimestamp(scanDetails.timestamp, selectedScan?.filename)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                스캔된 파일: {scanDetails.stats?.filesScanned}개
              </Typography>
              <Typography variant="body2" gutterBottom>
                발견된 문제: {scanDetails.stats?.findings}개
              </Typography>
              
              {scanDetails.findings && scanDetails.findings.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    발견된 문제들:
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {scanDetails.findings.slice(0, 50).map((finding: any, index: number) => (
                      <Card key={index} sx={{ mb: 1, p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {finding.ruleId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          파일: {finding.filePath}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          라인: {finding.lineNumber}
                        </Typography>
                        <Typography variant="body2">
                          {finding.description || finding.matchedText}
                        </Typography>
                      </Card>
                    ))}
                    {scanDetails.findings.length > 50 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        ... 및 {scanDetails.findings.length - 50}개 더
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 로그 상세 다이얼로그 */}
      <Dialog 
        open={logDetailsOpen} 
        onClose={() => setLogDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          로그 상세 정보
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedLog.message}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                시간: {new Date(selectedLog.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                레벨: {selectedLog.level}
              </Typography>
              <Typography variant="body2" gutterBottom>
                카테고리: {selectedLog.category}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  상세 데이터:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {JSON.stringify(selectedLog.data, null, 2)}
                  </pre>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDetailsOpen(false)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScanLogs;
