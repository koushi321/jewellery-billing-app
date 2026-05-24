export const getTheme = (isDark) => ({
  // Backgrounds
  pageBg  : isDark ? '#0f1117' : '#f4f6f9',
  cardBg  : isDark ? '#1a1d2e' : '#ffffff',
  inputBg : isDark ? '#0f1117' : '#ffffff',
  tableBg : isDark ? '#1a1d2e' : '#ffffff',
  headerBg: isDark ? '#13151f' : '#f8fafc',

  // Text
  textPrimary  : isDark ? '#e8e8e0' : '#333333',
  textSecondary: isDark ? '#9ca3af' : '#666666',
  textMuted    : isDark ? '#6b7280' : '#999999',

  // Borders
  border     : isDark ? '#2a2d3e' : '#eeeeee',
  borderInput: isDark ? '#2a2d3e' : '#dddddd',

  // Shadows
  shadow: isDark
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(0,0,0,0.08)',

  // Accents
  accent : '#f59e0b',
  success: '#16a34a',
  danger : '#dc2626',
  primary: isDark ? '#e8e8e0' : '#1a1a2e',
})