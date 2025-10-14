import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Code as CodeIcon,
  BugReport as BugIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserGuideProps {
  userRole: string;
}

const UserGuide: React.FC<UserGuideProps> = ({ userRole }) => {
  const isAdmin = userRole === 'admin';
  const isSecurity = userRole === 'security';

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📖 Kubee Web 사용 가이드
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            {/* 기본 기능 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" gutterBottom color="primary.main">
                🚀 기본 기능:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="📊 대시보드" 
                    secondary="시스템 현황 및 통계 확인"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="🔍 K8s 스캔" 
                    secondary="Kubernetes 설정 파일 보안 검사"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="📁 저장된 결과" 
                    secondary="이전 스캔 결과 확인 및 내보내기"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="🤖 AI 보안 분석" 
                    secondary="AI를 통한 보안 분석 및 권장사항"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="⚙️ 개인 설정" 
                    secondary="알림, UI, 보안 설정 관리"
                  />
                </ListItem>
              </List>
            </Grid>
            
            {/* 권한별 기능 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" gutterBottom color="secondary.main">
                {isAdmin ? "👑 관리자 전용 기능:" : isSecurity ? "🛡️ 보안 담당자 기능:" : "🔒 제한된 기능:"}
              </Typography>
              <List dense>
                {isSecurity && (
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon color="info" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="📊 스캔 로그 조회" 
                      secondary="모든 사용자의 스캔 활동 기록"
                    />
                  </ListItem>
                )}
                {isAdmin && (
                  <>
                    <ListItem>
                      <ListItemIcon>
                        <LockIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="👥 사용자 관리" 
                        secondary="사용자 등록, 삭제, 권한 관리"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <LockIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="📊 스캔 로그 조회" 
                        secondary="모든 사용자의 스캔 활동 기록"
                      />
                    </ListItem>
                  </>
                )}
                {!isAdmin && !isSecurity && (
                  <ListItem>
                    <ListItemIcon>
                      <LockIcon color="disabled" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="📊 스캔 로그 조회" 
                      secondary="보안 담당자 이상만 접근 가능"
                    />
                  </ListItem>
                )}
                {!isAdmin && (
                  <ListItem>
                    <ListItemIcon>
                      <LockIcon color="disabled" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="👥 사용자 관리" 
                      secondary="관리자만 접근 가능"
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
          </Grid>

          {/* 사용법 안내 */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom color="primary.main">
              💡 사용법 안내:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="1. 스캔 실행" 
                  secondary="Git 저장소 URL을 입력하고 스캔을 시작하세요"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="2. 결과 확인" 
                  secondary="스캔 완료 후 결과 탭에서 상세한 보안 문제를 확인하세요"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="3. 보고서 내보내기" 
                  secondary="CSV 또는 JSON 형식으로 스캔 결과를 다운로드하세요"
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="4. 설정 관리" 
                  secondary="개인 설정에서 알림, UI, 보안 옵션을 조정하세요"
                />
              </ListItem>
            </List>
          </Box>

          {/* 기본 계정 정보 */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom color="info.main">
              🔑 기본 계정 정보:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>관리자:</strong> admin / admin123 | 
              <strong> 보안담당자:</strong> security / security123 | 
              <strong> 일반사용자:</strong> user / user123
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserGuide;
