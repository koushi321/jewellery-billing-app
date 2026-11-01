export const getTheme = (isDark) => ({
  // Backgrounds
  pageBg    : isDark ? '#0a0908' : '#f6f1e6',
  cardBg    : isDark ? '#14110d' : '#ffffff',
  inputBg   : isDark ? '#0d0b09' : '#faf6ee',
  headerBg  : isDark ? '#1b1610' : '#f1e9d7',
  overlayBg : isDark ? '#14110d' : '#ffffff',

  // Text
  textPrimary  : isDark ? '#f4ecdc' : '#2b2220',
  textSecondary: isDark ? '#b3a68e' : '#6e6157',
  textMuted    : isDark ? '#7f7461' : '#9a8f80',

  // Borders
  border     : isDark ? 'rgba(201,164,92,0.2)'  : '#e8dfca',
  borderInput: isDark ? 'rgba(201,164,92,0.3)'  : '#e0d4ba',

  // Shadows
  shadow    : isDark
    ? '0 6px 28px rgba(0,0,0,0.5)'
    : '0 6px 24px rgba(120,90,30,0.08)',
  shadowSm  : isDark
    ? '0 2px 10px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(120,90,30,0.06)',
  shadowCard: isDark
    ? '0 12px 40px rgba(0,0,0,0.6)'
    : '0 12px 36px rgba(120,90,30,0.12)',

  // Accents
  accent : '#c9a45c',
  success: '#10b981',
  danger : '#ef4444',
  info   : '#3b82f6',
  purple : '#8b5cf6',
  primary: '#1d1812',
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
