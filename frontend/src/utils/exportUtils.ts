// 보고서 내보내기 유틸리티 함수들

export const exportToJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // CSV에서 쉼표나 따옴표가 포함된 값은 따옴표로 감싸기
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportScanResultsToCSV = (scanResults: any) => {
  if (!scanResults.findings || scanResults.findings.length === 0) return;
  
  const csvData = scanResults.findings.map((finding: any, index: number) => ({
    '순번': index + 1,
    '규칙 ID': finding.ruleId || '',
    '심각도': finding.severity || '',
    '파일 경로': finding.filePath || '',
    '라인 번호': finding.lineNumber || '',
    '설명': finding.description || '',
    '매칭된 텍스트': finding.matchedText || '',
  }));
  
  exportToCSV(csvData, `scan_results_${scanResults.timestamp || 'unknown'}`);
};

export const generateScanReport = (scanResults: any) => {
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      scanTimestamp: scanResults.timestamp,
      repositoryUrl: scanResults.repoUrl,
      totalFilesScanned: scanResults.stats?.filesScanned || 0,
      totalFindings: scanResults.stats?.findings || 0,
    },
    summary: {
      critical: scanResults.findings?.filter((f: any) => f.severity === 'critical').length || 0,
      high: scanResults.findings?.filter((f: any) => f.severity === 'high').length || 0,
      medium: scanResults.findings?.filter((f: any) => f.severity === 'medium').length || 0,
      low: scanResults.findings?.filter((f: any) => f.severity === 'low').length || 0,
    },
    findings: scanResults.findings?.map((finding: any, index: number) => ({
      id: index + 1,
      ruleId: finding.ruleId,
      severity: finding.severity,
      description: finding.description,
      filePath: finding.filePath,
      lineNumber: finding.lineNumber,
      matchedText: finding.matchedText,
    })) || [],
  };
  
  return report;
};

export const exportScanReport = (scanResults: any) => {
  const report = generateScanReport(scanResults);
  const filename = `scan_report_${scanResults.timestamp || 'unknown'}`;
  exportToJSON(report, filename);
};
