import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useColorScheme } from 'react-native'

const base = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999, full: 9999 },
  typography: {
    fontFamily: {
      body: 'System',
      heading: 'System',
    },
    sizes: {
      xs: 12,
      sm: 13,
      base: 15,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      display: 32,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    opacity: {
      primary: 1,
      secondary: 0.75,
      meta: 0.65,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
    },
  },
}

export const lightTheme = {
  mode: 'light',
  colors: {
    // Primary brand color
    bondedPurple: '#8B5CF6', // slightly deeper for better contrast
    purple: '#8B5CF6',
    
    // Modern neutral palette
    white: '#FFFFFF',
    black: '#000000',
    charcoal: '#0F172A',
    softBlack: '#1F2937',
    darkGray: '#111827',
    gray: '#6B7280',
    lightGray: '#D1D5DB',
    offWhite: '#F6F7FB',
    
    // Semantic colors
    error: '#ED4956',
    success: '#00BA7C',
    warning: '#FFD23F',
    info: '#0095F6',
    
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F6F7FB',
    backgroundTertiary: '#EEF0F5',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    // Text
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textTertiary: '#9CA3AF',
    
    // Borders
    border: '#D1D5DB',
    borderSecondary: '#E5E7EB',
    
    // Accent
    accent: '#8B5CF6',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.65)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
  // Event type colors
  eventColors: {
    personal: '#A45CFF',
    org: '#34C759',
    campus: '#007AFF',
    public: '#FF9500',
    task: '#808080',
  },
  // Forum tag colors (for post tags like QUESTION, CONFESSION, etc.)
  tagColors: {
    QUESTION: '#007AFF',
    CONFESSION: '#FF6B6B',
    CRUSH: '#FF69B4',
    'DM ME': '#00CED1',
    EVENT: '#FF9500',
    PSA: '#FF3B30',
    SHOUTOUT: '#34C759',
    DUB: '#FFD700',
    RIP: '#808080',
    MEME: '#A45CFF',
    'LOST & FOUND': '#D2691E',
    // Forum category tags (subtle colors)
    Housing: { bg: '#F0F9F4', text: '#166534', border: '#22C55E' },
    STEM: { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' },
    'Need Help': { bg: '#FFF7ED', text: '#9A3412', border: '#F97316' },
    'Lost & Found': { bg: '#FAF5FF', text: '#6B21A8', border: '#A855F7' },
    'Roommate Match': { bg: '#F0F9FF', text: '#0C4A6E', border: '#0EA5E9' },
    Events: { bg: '#FDF2F8', text: '#9F1239', border: '#EC4899' },
    Advice: { bg: '#FEFCE8', text: '#713F12', border: '#EAB308' },
    Clubs: { bg: '#EEF2FF', text: '#3730A3', border: '#6366F1' },
    Random: { bg: '#F0FDF4', text: '#166534', border: '#22C55E' },
    Confessions: { bg: '#FFF1F2', text: '#991B1B', border: '#EF4444' },
    'Study Group': { bg: '#F0FDFA', text: '#134E4A', border: '#14B8A6' },
    'Class Discussion': { bg: '#F5F3FF', text: '#5B21B6', border: '#8B5CF6' },
    'Campus Life': { bg: '#F0F9F4', text: '#14532D', border: '#22C55E' },
    Food: { bg: '#FFF7ED', text: '#9A3412', border: '#F97316' },
    Transportation: { bg: '#ECFEFF', text: '#164E63', border: '#06B6D4' },
    Jobs: { bg: '#EEF2FF', text: '#312E81', border: '#6366F1' },
    'Buy/Sell': { bg: '#FAF5FF', text: '#581C87', border: '#A855F7' },
  },
  // Status colors
  statusColors: {
    success: '#00BA7C',
    error: '#ED4956',
    warning: '#FFD23F',
    info: '#0095F6',
  },
  // Social media colors (static, no dark variant)
  socialColors: {
    instagram: '#E4405F',
    spotify: '#1DB954',
    tiktok: '#000000',
  },
  ...base,
}

export const darkTheme = {
  mode: 'dark',
  colors: {
    // Primary brand color
    bondedPurple: '#A78BFA', // softer accent
    purple: '#A78BFA',
    
    // Modern neutral palette
    white: '#FFFFFF',
    black: '#000000',
    charcoal: '#0F1218',
    softBlack: '#11141A',
    darkGray: '#161A22',
    gray: '#9CA3AF',
    lightGray: '#4B5563',
    offWhite: '#1A1F29',
    
    // Semantic colors
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
    
    // Backgrounds
    background: '#11141A',
    backgroundSecondary: '#1A1F29',
    backgroundTertiary: '#202736',
    surface: '#1A1F29',
    card: '#1E2431',
    
    // Text
    textPrimary: '#E9ECF5',
    textSecondary: '#C2C7D3',
    textTertiary: '#9CA3AF',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.16)',
    borderSecondary: 'rgba(255, 255, 255, 0.1)',
    
    // Accent
    accent: '#A78BFA',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.72)',
    overlayLight: 'rgba(0, 0, 0, 0.48)',
  },
  // Event type colors (slightly adjusted for dark mode)
  eventColors: {
    personal: '#B69CFF',
    org: '#34D399',
    campus: '#60A5FA',
    public: '#FBBF24',
    task: '#9CA3AF',
  },
  // Forum tag colors (adjusted for dark mode visibility)
  tagColors: {
    QUESTION: '#60A5FA',
    CONFESSION: '#F87171',
    CRUSH: '#F9A8D4',
    'DM ME': '#34D399',
    EVENT: '#FBBF24',
    PSA: '#F87171',
    SHOUTOUT: '#34D399',
    DUB: '#FDE68A',
    RIP: '#9CA3AF',
    MEME: '#B69CFF',
    'LOST & FOUND': '#E5B882',
    // Forum category tags (darker variants for dark mode)
    Housing: { bg: '#142017', text: '#34D399', border: '#22C55E' },
    STEM: { bg: '#131B29', text: '#60A5FA', border: '#3B82F6' },
    'Need Help': { bg: '#2A1F12', text: '#FBBF24', border: '#F59E0B' },
    'Lost & Found': { bg: '#1D1526', text: '#B69CFF', border: '#A855F7' },
    'Roommate Match': { bg: '#131B29', text: '#34D399', border: '#0EA5E9' },
    Events: { bg: '#241722', text: '#F9A8D4', border: '#EC4899' },
    Advice: { bg: '#242014', text: '#FDE68A', border: '#EAB308' },
    Clubs: { bg: '#18192A', text: '#C7D2FE', border: '#6366F1' },
    Random: { bg: '#142017', text: '#34D399', border: '#22C55E' },
    Confessions: { bg: '#241616', text: '#F87171', border: '#EF4444' },
    'Study Group': { bg: '#14211D', text: '#34D399', border: '#14B8A6' },
    'Class Discussion': { bg: '#1D1526', text: '#B69CFF', border: '#8B5CF6' },
    'Campus Life': { bg: '#142017', text: '#34D399', border: '#22C55E' },
    Food: { bg: '#251D13', text: '#FBBF24', border: '#F59E0B' },
    Transportation: { bg: '#111F29', text: '#34D399', border: '#06B6D4' },
    Jobs: { bg: '#18192A', text: '#C7D2FE', border: '#6366F1' },
    'Buy/Sell': { bg: '#1D1526', text: '#B69CFF', border: '#A855F7' },
  },
  // Status colors (adjusted for dark mode)
  statusColors: {
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
  // Social media colors (static, no dark variant)
  socialColors: {
    instagram: '#E4405F',
    spotify: '#1DB954',
    tiktok: '#FFFFFF',
  },
  ...base,
}

// Component variant styles (functions that return style objects)
const createButtonVariants = (theme) => ({
  primary: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondary: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
})

const createCardVariants = (theme) => ({
  default: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  elevated: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },
  outlined: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  flat: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
})

const createInputVariants = (theme) => ({
  default: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filled: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
})

// Add component variants to themes
lightTheme.buttonVariants = createButtonVariants(lightTheme)
lightTheme.cardVariants = createCardVariants(lightTheme)
lightTheme.inputVariants = createInputVariants(lightTheme)
lightTheme.ui = {
  chip: {
    height: 34,
    paddingHorizontal: 12,
    radius: lightTheme.radius.pill,
    textSize: lightTheme.typography.sizes.sm,
  },
  fab: {
    size: 56,
    radius: 28,
  },
  text: {
    heading: { fontSize: lightTheme.typography.sizes.xl, fontWeight: '700', color: lightTheme.colors.textPrimary },
    title: { fontSize: lightTheme.typography.sizes.lg, fontWeight: '600', color: lightTheme.colors.textPrimary },
    body: { fontSize: lightTheme.typography.sizes.base, fontWeight: '500', color: lightTheme.colors.textPrimary },
    meta: { fontSize: lightTheme.typography.sizes.sm, fontWeight: '500', color: lightTheme.colors.textSecondary, opacity: lightTheme.typography.opacity.meta },
  },
}

darkTheme.buttonVariants = createButtonVariants(darkTheme)
darkTheme.cardVariants = createCardVariants(darkTheme)
darkTheme.inputVariants = createInputVariants(darkTheme)
darkTheme.ui = {
  chip: {
    height: 34,
    paddingHorizontal: 12,
    radius: darkTheme.radius.pill,
    textSize: darkTheme.typography.sizes.sm,
  },
  fab: {
    size: 56,
    radius: 28,
  },
  text: {
    heading: { fontSize: darkTheme.typography.sizes.xl, fontWeight: '700', color: darkTheme.colors.textPrimary },
    title: { fontSize: darkTheme.typography.sizes.lg, fontWeight: '600', color: darkTheme.colors.textPrimary },
    body: { fontSize: darkTheme.typography.sizes.base, fontWeight: '500', color: darkTheme.colors.textPrimary },
    meta: { fontSize: darkTheme.typography.sizes.sm, fontWeight: '500', color: darkTheme.colors.textSecondary, opacity: darkTheme.typography.opacity.meta },
  },
}

const ThemeContext = createContext({ theme: lightTheme, setMode: () => {} })

export const ThemeProvider = ({ children }) => {
  const scheme = useColorScheme()

  // Track if mode was manually set (to prevent auto-sync from overriding)
  const manuallySetRef = useRef(false)

  // Initialize with phone's color scheme
  const [mode, setMode] = useState(() => {
    return scheme === 'dark' ? 'dark' : 'light'
  })

  // Wrap setMode to track manual changes
  const setModeWithTracking = useCallback((newMode) => {
    manuallySetRef.current = true
    setMode(newMode)
    // Reset manual flag after a short delay to allow auto-sync again
    setTimeout(() => {
      manuallySetRef.current = false
    }, 500)
  }, [])

  // Only auto-sync with system scheme if mode wasn't manually set
  useEffect(() => {
    if (!manuallySetRef.current) {
      setMode(scheme === 'dark' ? 'dark' : 'light')
    }
  }, [scheme])

  const value = useMemo(() => {
    const theme = mode === 'dark' ? darkTheme : lightTheme
    return { theme, setMode: setModeWithTracking }
  }, [mode, setModeWithTracking])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider')
  return ctx.theme
}

export const useThemeMode = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider')
  return { mode: ctx.theme.mode, setMode: ctx.setMode }
}

// Default export to satisfy Expo Router expectations
export default ThemeProvider

