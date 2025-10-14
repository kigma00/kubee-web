import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

const translations = {
  ko: {
    'dashboard.title': '📊 대시보드',
    'dashboard.subtitle': '시스템 현황 및 스캔 통계를 확인하세요',
    'scan.title': '🔍 스캔',
    'scan.subtitle': 'GitHub 저장소를 스캔하여 보안 취약점을 찾아보세요',
    'results.title': '📁 결과',
    'results.subtitle': '스캔 결과를 확인하고 분석하세요',
    'ai.title': '🤖 AI 분석',
    'ai.subtitle': 'AI를 활용한 보안 분석 및 권장사항',
    'logs.title': '📊 로그',
    'logs.subtitle': '시스템 로그 및 스캔 히스토리',
    'users.title': '👥 사용자 관리',
    'users.subtitle': '사용자 계정 및 권한 관리',
    'settings.title': '⚙️ 설정',
    'settings.subtitle': '시스템 설정 및 환경 구성',
    'guide.title': '📖 사용 가이드',
    'guide.subtitle': 'Kubee Web 사용 방법 안내',
    'scan.start': '🚀 스캔 시작',
    'scan.scanning': '스캔 중...',
    'scan.clear': '🗑️ 초기화',
    'scan.download': '📥 결과 다운로드',
    'ai.analyze': '🔍 스캔 결과 분석',
    'ai.scenario': '🎯 익스플로잇 시나리오',
    'ai.recommendations': '🛡️ 보안 권장사항',
    'ai.chat': '💬 AI 채팅',
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.success': '성공적으로 완료되었습니다',
    'common.cancel': '취소',
    'common.save': '저장',
    'common.delete': '삭제',
    'common.edit': '편집',
    'common.add': '추가',
    'common.refresh': '새로고침',
    'common.download': '다운로드',
    'common.view': '보기',
    'common.close': '닫기',
    'common.confirm': '확인',
    'common.yes': '예',
    'common.no': '아니오',
    'common.back': '뒤로',
    'common.next': '다음',
    'common.previous': '이전',
    'common.finish': '완료',
    'common.continue': '계속',
    'common.retry': '다시 시도',
    'common.open': '열기',
    'common.search': '검색',
    'common.filter': '필터',
    'common.sort': '정렬',
    'common.export': '내보내기',
    'common.import': '가져오기',
    'common.upload': '업로드',
    'common.select': '선택',
    'common.selectAll': '전체 선택',
    'common.clear': '지우기',
    'common.reset': '초기화',
    'common.apply': '적용',
    'common.ok': '확인',
  },
  en: {
    'dashboard.title': '📊 Dashboard',
    'dashboard.subtitle': 'Check system status and scan statistics',
    'scan.title': '🔍 Scan',
    'scan.subtitle': 'Scan GitHub repositories to find security vulnerabilities',
    'results.title': '📁 Results',
    'results.subtitle': 'View and analyze scan results',
    'ai.title': '🤖 AI Analysis',
    'ai.subtitle': 'AI-powered security analysis and recommendations',
    'logs.title': '📊 Logs',
    'logs.subtitle': 'System logs and scan history',
    'users.title': '👥 User Management',
    'users.subtitle': 'Manage user accounts and permissions',
    'settings.title': '⚙️ Settings',
    'settings.subtitle': 'System settings and environment configuration',
    'guide.title': '📖 User Guide',
    'guide.subtitle': 'Kubee Web usage guide',
    'scan.start': '🚀 Start Scan',
    'scan.scanning': 'Scanning...',
    'scan.clear': '🗑️ Clear',
    'scan.download': '📥 Download Results',
    'ai.analyze': '🔍 Analyze Scan Results',
    'ai.scenario': '🎯 Exploit Scenario',
    'ai.recommendations': '🛡️ Security Recommendations',
    'ai.chat': '💬 AI Chat',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Completed successfully',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.refresh': 'Refresh',
    'common.download': 'Download',
    'common.view': 'View',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.finish': 'Finish',
    'common.continue': 'Continue',
    'common.retry': 'Retry',
    'common.open': 'Open',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.upload': 'Upload',
    'common.select': 'Select',
    'common.selectAll': 'Select All',
    'common.clear': 'Clear',
    'common.reset': 'Reset',
    'common.apply': 'Apply',
    'common.ok': 'OK',
  },
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const language = 'ko'; // 고정된 한국어

  useEffect(() => {
    document.documentElement.lang = 'ko';
  }, []);

  const t = (key: string): string => {
    const currentTranslations = translations.ko;
    return currentTranslations[key as keyof typeof currentTranslations] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
