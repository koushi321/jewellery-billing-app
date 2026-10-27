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

// Gold shop background: your shop photo at /public/shop-bg.jpg,
// a soft overlay so text stays readable, and a gold-brown gradient
// that shows if the photo is missing.
export const getShopBackground = (isDark) => {
  const overlay = isDark
    ? 'linear-gradient(rgba(12,9,4,0.82), rgba(12,9,4,0.88))'
    : 'linear-gradient(rgba(255,248,232,0.84), rgba(255,243,215,0.90))'
  const fallback = isDark
    ? 'linear-gradient(135deg, #1a1205, #0a0a0f)'
    : 'linear-gradient(135deg, #fff3d6, #f6e3b0)'
  return `${overlay}, url(/shop-bg.jpg) center / cover no-repeat, ${fallback}`
}
