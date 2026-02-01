// Fixed light theme for onboarding (always light mode, regardless of app theme)
export const ONBOARDING_THEME = {
  colors: {
    textPrimary: '#1A1A1A',
    textSecondary: '#8E8E8E',
    white: '#FFFFFF',
    bondedPurple: '#8B5CF6', // Actual purple to match app theme
    background: '#FFFFFF',
    backgroundSecondary: 'rgba(255, 255, 255, 0.2)',
    border: 'rgba(0, 0, 0, 0.1)',
    offWhite: 'rgba(0, 0, 0, 0.05)',
    softBlack: '#2A2A2A',
    charcoal: '#1A1A1A',
  },
  typography: {
    fontFamily: {
      heading: 'System',
      body: 'System',
    },
  },
  radius: {
    pill: 9999,
    full: 9999,
    md: 12,
    xl: 20,
  },
  shadows: {
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
}

