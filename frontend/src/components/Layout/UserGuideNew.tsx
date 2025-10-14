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

const UserGuideNew: React.FC<UserGuideProps> = ({ userRole }) => {
  const isAdmin = userRole === 'admin';
  const isSecurity = userRole === 'security';
  const { t } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      label: '시스템 접속',
      description: 'Kubee Web에 로그인하여 대시보드에 접속합니다.',
      icon: <DashboardIcon />,
    },
    {
      label: '저장소 스캔',
      description: 'GitHub 저장소 URL을 입력하여 보안 스캔을 실행합니다.',
      icon: <CodeIcon />,
    },
    {
      label: '결과 분석',
      description: '스캔 결과를 확인하고 발견된 보안 문제를 분석합니다.',
      icon: <BugIcon />,
    },
    {
      label: 'AI 분석',
      description: 'AI를 활용하여 추가 분석 및 권장사항을 받습니다.',
      icon: <AnalyticsIcon />,
    },
  ];

  const getRoleBasedFeatures = () => {
    if (isAdmin) {
      return [
        { name: '👥 사용자 관리', description: '사용자 계정 및 권한 관리', icon: <SecurityIcon /> },
        { name: '⚙️ 시스템 설정', description: '전체 시스템 설정 관리', icon: <SettingsIcon /> },
        { name: '📊 전체 통계', description: '모든 사용자의 스캔 통계 확인', icon: <AnalyticsIcon /> },
      ];
    } else if (isSecurity) {
      return [
        { name: '📊 로그 관리', description: '보안 로그 및 스캔 히스토리 관리', icon: <SecurityIcon /> },
        { name: '🔍 전체 스캔', description: '모든 사용자의 스캔 결과 확인', icon: <BugIcon /> },
        { name: '📈 보안 대시보드', description: '전체 보안 현황 모니터링', icon: <DashboardIcon /> },
      ];
    } else {
      return [
        { name: '🔍 개인 스캔', description: '내가 실행한 스캔 결과 확인', icon: <BugIcon /> },
        { name: '📊 개인 통계', description: '내 스캔 통계 및 현황', icon: <AnalyticsIcon /> },
        { name: '⚙️ 개인 설정', description: '개인 환경 설정', icon: <SettingsIcon /> },
      ];
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📖 Kubee Web 사용 가이드
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isAdmin ? '관리자' : isSecurity ? '보안 담당자' : '사용자'} 권한으로 접속하셨습니다.
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {/* 빠른 시작 가이드 */}
          <Typography variant="h6" gutterBottom color="primary.main">
            🚀 빠른 시작 가이드
          </Typography>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box sx={{ color: activeStep >= index ? 'primary.main' : 'grey.400' }}>
                      {step.icon}
                    </Box>
                  )}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(activeStep + 1)}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={activeStep === steps.length - 1}
                    >
                      다음
                    </Button>
                    <Button
                      disabled={activeStep === 0}
                      onClick={() => setActiveStep(activeStep - 1)}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      이전
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ my: 3 }} />

          {/* 권한별 기능 */}
          <Typography variant="h6" gutterBottom color="primary.main">
            {isAdmin ? '👑 관리자 전용 기능' : isSecurity ? '🔒 보안 담당자 전용 기능' : '👤 사용자 기능'}
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {getRoleBasedFeatures().map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ color: 'primary.main', mr: 1 }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {feature.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* 상세 기능 가이드 */}
          <Typography variant="h6" gutterBottom color="primary.main">
            📋 상세 기능 가이드
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">🔍 스캔 기능</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="GitHub 저장소 URL 입력" 
                    secondary="https://github.com/username/repository 형식으로 입력"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="스캔 실행" 
                    secondary="스캔 버튼 클릭 후 완료까지 대기"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="결과 확인" 
                    secondary="발견된 보안 문제 및 심각도 확인"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">🤖 AI 분석 기능</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                <ListItem>
                  <ListItemIcon><ChatIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="AI 채팅" 
                    secondary="자연어로 질문하여 AI와 대화"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AnalyticsIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="스캔 결과 분석" 
                    secondary="AI가 스캔 결과를 분석하여 상세한 설명 제공"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><BugIcon color="warning" /></ListItemIcon>
                  <ListItemText 
                    primary="익스플로잇 시나리오" 
                    secondary="발견된 취약점의 공격 시나리오 생성"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SecurityIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="보안 권장사항" 
                    secondary="구체적인 보안 개선 방안 제시"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">📊 대시보드 기능</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                <ListItem>
                  <ListItemIcon><DashboardIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="실시간 통계" 
                    secondary="30초마다 자동으로 업데이트되는 통계"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><AnalyticsIcon color="primary" /></ListItemIcon>
                  <ListItemText 
                    primary="심각도별 분포" 
                    secondary="Critical, High, Medium, Low 문제 분포"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                  <ListItemText 
                    primary="최근 스캔" 
                    secondary="최근 실행된 스캔 결과 목록"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 3 }} />

          {/* 주의사항 및 팁 */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              💡 사용 팁
            </Typography>
            <Typography variant="body2">
              • AI 채팅에서 "스캔 결과를 분석해줘", "보안 권장사항을 알려줘" 등의 자연어로 질문하세요<br/>
              • 스캔 결과를 선택하면 더 정확한 AI 분석을 받을 수 있습니다<br/>
              • 대시보드는 30초마다 자동으로 업데이트됩니다<br/>
              • 설정에서 테마와 언어를 변경할 수 있습니다
            </Typography>
          </Alert>

          <Alert severity="warning">
            <Typography variant="subtitle2" gutterBottom>
              ⚠️ 주의사항
            </Typography>
            <Typography variant="body2">
              • 공개 GitHub 저장소만 스캔 가능합니다<br/>
              • 스캔 시간은 저장소 크기에 따라 달라집니다<br/>
              • AI 분석 결과는 참고용이며, 전문가 검토가 필요할 수 있습니다<br/>
              • 민감한 정보가 포함된 저장소는 스캔하지 마세요
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserGuideNew;
