// constants/theme.js
import { ms, s, vs } from "@/utils/responsive";

export const theme = {
  colors: {
    primary: "#25D366", // Premium Bolt Emerald
    primaryDark: "#059669",
    secondary: "#0084FF", // Modern action blue
    background: "#F5F5F5", // Slate-50 background
    surface: "#FFFFFF",
    text: "#0F172A", // Deep Slate-900
    textSecondary: "#64748B", // Slate-500
    border: "#E2E8F0",
    error: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    black: "#061E29",
    red: "#ED3500",
    standardNotification: "#ff00f2",
    successNotification: "#10B981",
    errorNotification: "#ff0000",
    warningNotification: "#ffff00",
  },
  shadows: {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: vs(1) },
      shadowOpacity: 0.05,
      shadowRadius: ms(2),
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: vs(4) },
      shadowOpacity: 0.1,
      shadowRadius: ms(6),
      elevation: 4,
    },
    lg: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: vs(10) },
      shadowOpacity: 0.15,
      shadowRadius: ms(12),
      elevation: 8,
    },
  },
  spacing: {
    xs: s(4),
    sm: s(8),
    md: s(16),
    lg: s(24),
    xl: s(32),
    xxl: s(48),
  },
  borderRadius: {
    sm: ms(8),
    md: ms(12),
    lg: ms(16),
    xl: ms(24),
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: ms(28),
      fontWeight: "800",
      lineHeight: vs(36),
    },
    h2: {
      fontSize: ms(24),
      fontWeight: "700",
      lineHeight: vs(32),
    },
    h3: {
      fontSize: ms(20),
      fontWeight: "700",
      lineHeight: vs(28),
    },
    body: {
      fontSize: ms(16),
      fontWeight: "500",
      lineHeight: vs(24),
    },
    bodySmall: {
      fontSize: ms(14),
      fontWeight: "400",
      lineHeight: vs(20),
    },
    caption: {
      fontSize: ms(12),
      fontWeight: "600",
      lineHeight: vs(16),
    },
  },
};
