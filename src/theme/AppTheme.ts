import { Platform } from "react-native";

export const AppTheme = {
  colors: {
    primary: "#1D8EF5",
    primaryDark: "#156FD6",
    primaryLight: "#EAF4FF",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceMuted: "#F4F3F3",
    surfaceSoft: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E5E7EB",
    divider: "#EEF2F7",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    textPrimary: "#111827",
    textSecondary: "#5F6672", // 4.5:1 or better on every light tint
    hint: "#6B7280", // 4.5:1 on white and the page background
    textPlaceholder: "#BFC7D4",
    disabled: "#D1D5DB",
    primarySoft: "#D1E4FF",
    primaryText: "#1366C9", // links and blue labels; primary itself is 3.4:1 on white

    // Status: text is the readable shade, Bg the light tint behind it,
    // Soft a stronger tint, Border for outlined chips and banners.
    successText: "#127A40",
    successStrong: "#047857",
    successBright: "#16A34A",
    successDeep: "#15803D",
    successBg: "#E8F7EE",
    successSoft: "#ECFDF3",
    successTint: "#DCFCE7",

    danger: "#DC2626",
    dangerText: "#B42318",
    dangerStrong: "#B91C1C",
    dangerDeep: "#991B1B",
    dangerBg: "#FFF1F1",
    dangerSoft: "#FEE2E2",
    dangerBorder: "#FECACA",
    dangerBorderStrong: "#FCA5A5",
    recording: "#E53935",

    info: "#0284C7",
    infoStrong: "#0369A1",
    infoBg: "#E0F2FE",
    infoSoft: "#F0F9FF",
    infoBorder: "#BAE6FD",

    warningText: "#B45309",
    warningStrong: "#92400E",
    warningDeep: "#854D0E",
    warningBg: "#FFF4E0",
    warningSoft: "#FEF3C7",
    warningTint: "#FFFBEB",
    warningBorder: "#FCD34D",

    orange: "#EA580C",
    orangeText: "#C2410C",
    orangeStrong: "#9A3412",
    orangeTint: "#FFF7ED",
    orangeSoft: "#FFEDD5",
    orangeBorder: "#FDBA74",

    purple: "#6B21A8",
    violet: "#7C3AED",
    purpleBg: "#F5F0FF",
    rose: "#9B1239",
    roseBg: "#FFE8EC",

    // Neutral scale for borders, muted text and quiet surfaces
    slate50: "#F8FAFC",
    slate100: "#F1F5F9",
    slate200: "#E2E8F0",
    slate300: "#CBD5E1",
    slate400: "#94A3B8",
    slate500: "#64748B",
    slate600: "#475569",
    slate700: "#334155",
    slate900: "#0F172A",
    gray50: "#F9FAFB",
    gray100: "#F3F4F6",
    gray700: "#374151",
    white: "#FFFFFF",
    black: "#000000",
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

