import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';

interface Settings {
  notifications: {
    browserEnabled: boolean;
  };
  ui: {
    itemsPerPage: number;
  };
}

const defaultSettings: Settings = {
  notifications: {
    browserEnabled: true,
  },
  ui: {
    itemsPerPage: 10,
  },
};

const SettingsPage: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // 로컬 스토리지에서 설정 로드
    const savedSettings = localStorage.getItem('kubee_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        // 저장된 설정을 즉시 적용
        applySettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    } else {
      // 기본 설정 적용
      applySettings(defaultSettings);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // 로컬 스토리지에 설정 저장
      localStorage.setItem('kubee_settings', JSON.stringify(settings));
      
      // 실제 기능 적용
      applySettings(settings);
      
      showSuccess('설정이 성공적으로 저장되고 적용되었습니다!');
    } catch (error) {
      showError('설정 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const applySettings = (newSettings: Settings) => {
    // 알림 설정 적용
    if (newSettings.notifications.browserEnabled) {
      // 브라우저 알림 권한 요청
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('브라우저 알림이 활성화되었습니다.');
          }
        });
      }
    }


    // 페이지당 항목 수 설정을 전역 상태로 저장
    localStorage.setItem('kubee_items_per_page', newSettings.ui.itemsPerPage.toString());
    
    // 알림 설정을 전역 상태로 저장
    localStorage.setItem('kubee_notification_settings', JSON.stringify(newSettings.notifications));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('kubee_settings');
    // 기본 설정 적용
    applySettings(defaultSettings);
    showSuccess('설정이 초기화되었습니다.');
  };

  const handleSettingChange = (category: keyof Settings, key: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    };
    
    setSettings(newSettings);
    
    // 설정 저장
    saveSettingsWithData(newSettings);
  };

  const saveSettingsWithData = async (settingsToSave: Settings) => {
    setIsLoading(true);
    try {
      // 로컬 스토리지에 설정 저장
      localStorage.setItem('kubee_settings', JSON.stringify(settingsToSave));
      
      // 실제 기능 적용
      applySettings(settingsToSave);
      
      showSuccess('설정이 성공적으로 저장되고 적용되었습니다!');
    } catch (error) {
      showError('설정 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">⚙️ 설정</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={resetSettings}
          disabled={isLoading}
        >
          초기화
        </Button>
      </Box>

      <Card>
        <CardContent>
          {/* 알림 설정 */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotificationsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">알림 설정</Typography>
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications.browserEnabled}
                  onChange={(e) => handleSettingChange('notifications', 'browserEnabled', e.target.checked)}
                />
              }
              label="브라우저 알림 활성화"
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              스캔 완료 시 브라우저 알림을 표시합니다.
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

                 {/* UI 설정 */}
                 <Box sx={{ mb: 3 }}>
                   <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                     <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                     <Typography variant="h6">UI 설정</Typography>
                   </Box>
                   
                   <Box>
                     <Typography gutterBottom>
                       페이지당 항목 수: {settings.ui.itemsPerPage}
                     </Typography>
                     <Slider
                       value={settings.ui.itemsPerPage}
                       onChange={(_, value) => handleSettingChange('ui', 'itemsPerPage', value)}
                       min={5}
                       max={50}
                       step={5}
                       marks={[
                         { value: 5, label: '5' },
                         { value: 10, label: '10' },
                         { value: 25, label: '25' },
                         { value: 50, label: '50' },
                       ]}
                       valueLabelDisplay="auto"
                     />
                   </Box>
                 </Box>
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mt: 3 }}>
        설정이 자동으로 저장되고 즉시 적용됩니다.
      </Alert>
    </Box>
  );
};

export default SettingsPage;
