export const DarkTheme = {
  // Background gradient
  bgDark: '#0F0C29',
  bgMid: '#302B63',
  bgLight: '#24243E',

  // Glass cards
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassHover: 'rgba(255, 255, 255, 0.12)',

  // Accent colors
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#3B82F6',
  secondaryLight: '#93C5FD',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',

  // Text
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  // Misc
  inputBg: 'rgba(255, 255, 255, 0.06)',
  divider: 'rgba(255, 255, 255, 0.1)',
};

export const LightTheme = {
  // Background gradient
  bgDark: '#F8FAFC',
  bgMid: '#F1F5F9',
  bgLight: '#E2E8F0',

  // Glass cards (White glass)
  glass: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  glassHover: 'rgba(255, 255, 255, 0.9)',

  // Accent colors (Slightly more saturated)
  primary: '#6D28D9',
  primaryLight: '#8B5CF6',
  secondary: '#2563EB',
  secondaryLight: '#60A5FA',

  // Status colors
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0891B2',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Misc
  inputBg: '#FFFFFF',
  divider: '#E2E8F0',
};

// Default export for backward compatibility during transition
export const Colors = DarkTheme;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 40,
};

export const GlassStyle = {
  backgroundColor: Colors.glass,
  borderWidth: 1,
  borderColor: Colors.glassBorder,
  borderRadius: BorderRadius.lg,
};
