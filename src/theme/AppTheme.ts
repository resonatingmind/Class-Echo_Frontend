import { Platform } from "react-native";

export const AppTheme = {
  colors: {
    primary: "#1D8EF5",
    primaryDark: "#156FD6",
    primaryLight: "#EAF4FF",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E7EB",
    divider: "#EEF2F7",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    hint: "#9CA3AF",
    disabled: "#D1D5DB",
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
    giant: 48,
    colossal: 64,
  },
  radius: {
    small: 12, // small chips
    medium: 12, // buttons, inputs
    large: 16, // cards, dialogs
    xlarge: 20, // bottom sheets
    pill: 9999,
  },
  shadows: {
    card: {
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4, // Android fallback
    },
    subtle: {
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  typography: {
    family: {
      regular: "Inter_400Regular",
      medium: "Inter_500Medium",
      semibold: "Inter_600SemiBold",
      bold: "Inter_700Bold",
    },
    display: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    heading1: {
      fontSize: 30,
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
      lineHeight: 38,
      letterSpacing: -0.5,
    },
    heading2: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    heading3: {
      fontSize: 20,
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
      lineHeight: 28,
    },
    bodyLarge: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      fontWeight: "400" as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      fontWeight: "400" as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      fontWeight: "500" as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
    },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      fontWeight: "500" as const,
    },
  },
  animation: {
    focus: 200,
    press: 150,
    transition: 300,
    segment: 250,
  }
};
