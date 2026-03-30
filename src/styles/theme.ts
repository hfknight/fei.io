export const theme = {
  colors: {
    // primary: '#2563eb',
    // primaryHover: '#1d4ed8',
    // secondary: '#64748b',
    // accent: '#06b6d4',
    // background: '#ffffff',
    // surface: '#f8fafc',
    // text: '#1e293b',
    // textLight: '#64748b',
    // border: '#e2e8f0',
    // error: '#ef4444',
    // success: '#10b981',

    primary: '#fbbf24',        // Warm amber/yellow
    primaryHover: '#f59e0b',   // Deeper amber on hover
    secondary: '#78716c',      // Warm gray
    accent: '#fcd34d',         // Light golden yellow
    background: '#12102a',     // Deep indigo-purple, the exact Dawn gradient start
    surface: '#fefce8',        // Much lighter yellow surface (was #fef3c7)
    text: '#fff',
    border: '#fed7aa',         // Light orange border
    error: '#dc2626',          // Red error
    success: '#16a34a',        // Green success
  },
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
};

export type Theme = typeof theme;