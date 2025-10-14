import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import ScanForm from '../Scan/ScanForm';
import ScanResults from '../Scan/ScanResults';
import ScanLogs from '../Scan/ScanLogs';
import UserManagement from '../Admin/UserManagement';
import Settings from '../Admin/Settings';
import AIAnalysisNew from '../AI/AIAnalysisNew';
import UserGuideNew from './UserGuideNew';
import DashboardStats from '../Dashboard/DashboardStats';
import SettingsPage from '../Settings/SettingsPage';
import StatisticsTab from '../Statistics/StatisticsTab';

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
      id={`main-tabpanel-${index}`}
      aria-labelledby={`main-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const getRoleChip = (role: string) => {
    const roleConfig = {
      admin: { color: 'error' as const, label: '관리자' },
      security: { color: 'warning' as const, label: '보안' },
      user: { color: 'success' as const, label: '사용자' },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;

    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="filled"
        sx={{
          fontWeight: 'bold',
          color: 'white',
          '&.MuiChip-colorSuccess': {
            backgroundColor: '#4caf50',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: '#ff9800',
          },
          '&.MuiChip-colorError': {
            backgroundColor: '#f44336',
          }
        }}
      />
    );
  };

  const isAdmin = user?.role === 'admin';
  const isSecurity = user?.role === 'security' || isAdmin;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <SecurityIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kubernetes 보안 스캔 시스템
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              {user?.username}
            </Typography>
            {getRoleChip(user?.role || 'user')}
            
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircleIcon />
            </IconButton>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                로그아웃
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="📊 대시보드" />
          <Tab label="🔍 스캔" />
          <Tab label="🤖 AI 분석" />
          <Tab label="📁 결과" />
          <Tab label="📈 통계" />
          {isSecurity && <Tab label="📊 로그" />}
          {isAdmin && <Tab label="👥 사용자 관리" />}
          <Tab label="⚙️ 설정" />
          <Tab label="📖 사용 가이드" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <DashboardStats />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <ScanForm onScanComplete={() => {}} />
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <AIAnalysisNew />
      </TabPanel>
      
      <TabPanel value={tabValue} index={3}>
        <ScanResults />
      </TabPanel>
      
      <TabPanel value={tabValue} index={4}>
        <StatisticsTab />
      </TabPanel>
      
      {isSecurity && (
        <TabPanel value={tabValue} index={5}>
          <ScanLogs />
        </TabPanel>
      )}
      
      {isAdmin && (
        <TabPanel value={tabValue} index={isSecurity ? 6 : 5}>
          <UserManagement />
        </TabPanel>
      )}
      
      <TabPanel value={tabValue} index={isAdmin ? (isSecurity ? 7 : 6) : (isSecurity ? 6 : 5)}>
        <SettingsPage />
      </TabPanel>
      
      <TabPanel value={tabValue} index={isAdmin ? (isSecurity ? 8 : 7) : (isSecurity ? 7 : 6)}>
        <UserGuideNew userRole={user?.role || 'user'} />
      </TabPanel>
    </Box>
  );
};

export default MainLayout;
