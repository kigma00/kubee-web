import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNotification } from '../../contexts/NotificationContext';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'analysis' | 'scenario' | 'recommendation';
}

interface AIChatProps {
  selectedScan?: any;
  onAnalysisComplete?: (analysis: string) => void;
  onScenarioComplete?: (scenario: string) => void;
  onRecommendationComplete?: (recommendation: string) => void;
}

const AIChat: React.FC<AIChatProps> = ({
  selectedScan,
  onAnalysisComplete,
  onScenarioComplete,
  onRecommendationComplete,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showError } = useNotification();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 초기 환영 메시지
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: '안녕하세요! Kubernetes 보안 분석 AI입니다. 무엇을 도와드릴까요?',
        isUser: false,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // AI 응답 생성
      const response = await fetch('http://localhost:8282/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: inputMessage,
          scan_results: selectedScan,
          context: {
            has_scan: !!selectedScan,
            scan_id: selectedScan?.id,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response || '죄송합니다. 응답을 생성할 수 없습니다.',
        isUser: false,
        timestamp: new Date(),
        type: data.type || 'text',
      };

      setMessages(prev => [...prev, aiMessage]);

      // 특별한 타입의 응답인 경우 콜백 호출
      if (data.type === 'analysis' && onAnalysisComplete) {
        onAnalysisComplete(data.response);
      } else if (data.type === 'scenario' && onScenarioComplete) {
        onScenarioComplete(data.response);
      } else if (data.type === 'recommendation' && onRecommendationComplete) {
        onRecommendationComplete(data.response);
      }

    } catch (error) {
      console.error('Chat error:', error);
      showError('AI 채팅 서비스에 연결할 수 없습니다.');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        isUser: false,
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const getMessageTypeChip = (type?: string) => {
    switch (type) {
      case 'analysis':
        return <Chip label="분석" size="small" color="primary" variant="outlined" />;
      case 'scenario':
        return <Chip label="시나리오" size="small" color="warning" variant="outlined" />;
      case 'recommendation':
        return <Chip label="권장사항" size="small" color="success" variant="outlined" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 채팅 메시지 영역 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          maxHeight: '500px',
          minHeight: '300px',
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              justifyContent: message.isUser ? 'flex-end' : 'flex-start',
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                maxWidth: '80%',
                flexDirection: message.isUser ? 'row-reverse' : 'row',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.isUser ? 'primary.main' : 'secondary.main',
                  width: 32,
                  height: 32,
                  mx: 1,
                }}
              >
                {message.isUser ? <PersonIcon /> : <BotIcon />}
              </Avatar>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: message.isUser ? 'primary.main' : 'grey.100',
                  color: message.isUser ? 'white' : 'text.primary',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {getMessageTypeChip(message.type)}
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.content}
                </Typography>
              </Paper>
            </Box>
          </Box>
        ))}
        
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                maxWidth: '80%',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'secondary.main',
                  width: 32,
                  height: 32,
                  mx: 1,
                }}
              >
                <BotIcon />
              </Avatar>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  AI가 응답을 생성하고 있습니다...
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* 입력 영역 */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="AI에게 질문하세요... (예: '스캔 결과를 분석해줘', '보안 권장사항을 알려줘')"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
            size="small"
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            sx={{ alignSelf: 'flex-end' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        
        {selectedScan && (
          <Alert severity="info" sx={{ mt: 1 }}>
            현재 선택된 스캔: {selectedScan.repository_name || selectedScan.repository_url}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default AIChat;
