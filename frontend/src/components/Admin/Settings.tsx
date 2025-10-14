import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        ⚙️ 설정
      </Typography>

      <Grid container spacing={3}>
        {/* Slack 알림 설정 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">🔔 Slack 알림 설정</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Slack 알림을 받으려면 환경변수를 설정하세요:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace' }}>
                <Typography variant="body2">
                  export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"<br />
                  export SLACK_CHANNEL="#k8s-security"
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* 스캔 결과 저장 위치 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1 }} />
                <Typography variant="h6">📁 스캔 결과 저장 위치</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                스캔 결과는 다음 디렉토리에 저장됩니다:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace' }}>
                <Typography variant="body2">
                  ./scan_results
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* 서비스 정보 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InfoIcon sx={{ mr: 1 }} />
                <Typography variant="h6">🔧 서비스 정보</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      8282
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Flask API 포트
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="secondary">
                      3000
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      React 포트
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 스캔 규칙 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">📋 스캔 규칙</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                현재 지원하는 Kubernetes 보안 스캔 규칙:
              </Typography>
              <List dense>
                {[
                  'privileged-containers: 권한 있는 컨테이너 사용',
                  'host-network: 호스트 네트워크 사용',
                  'host-pid: 호스트 PID 사용',
                  'host-ipc: 호스트 IPC 사용',
                  'run-as-root: root 사용자로 실행',
                  'read-only-root-fs: 읽기 전용 루트 파일시스템',
                  'allow-privilege-escalation: 권한 상승 허용',
                  'capabilities: 위험한 capabilities 사용',
                  'seccomp-profile: seccomp 프로파일 미설정',
                  'apparmor-profile: AppArmor 프로파일 미설정',
                ].map((rule, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={rule}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
