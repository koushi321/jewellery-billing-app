export const getTheme = (isDark) => ({
  // Backgrounds
  pageBg    : isDark ? '#0a0a0f' : '#f0f2f5',
  cardBg    : isDark ? '#1a1d2e' : '#ffffff',
  inputBg   : isDark ? '#0f1117' : '#f8f9fa',
  headerBg  : isDark ? '#13151f' : '#f8f9fa',
  overlayBg : isDark ? '#1a1d2e' : '#ffffff',

  // Text
  textPrimary  : isDark ? '#ffffff' : '#1a1a2e',
  textSecondary: isDark ? '#9ca3af' : '#64748b',
  textMuted    : isDark ? '#6b7280' : '#94a3b8',

  // Borders
  border     : isDark ? '#2a2d3e' : '#e8ecf0',
  borderInput: isDark ? '#2a2d3e' : '#e2e8f0',

  // Shadows
  shadow    : isDark
    ? '0 4px 24px rgba(0,0,0,0.4)'
    : '0 4px 24px rgba(0,0,0,0.06)',
  shadowSm  : isDark
    ? '0 2px 8px rgba(0,0,0,0.3)'
    : '0 2px 8px rgba(0,0,0,0.04)',
  shadowCard: isDark
    ? '0 8px 32px rgba(0,0,0,0.5)'
    : '0 8px 32px rgba(0,0,0,0.08)',

  // Accents
  accent : '#f59e0b',
  success: '#10b981',
  danger : '#ef4444',
  info   : '#3b82f6',
  purple : '#8b5cf6',
  primary: '#1a1a2e',
})