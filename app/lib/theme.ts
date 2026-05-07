// Design tokens centralizados. Cada pantalla y componente lee de aquí para
// mantener una identidad visual consistente.

export const colors = {
  // Marca
  primary: "#5b6cff",
  primaryDark: "#4754d6",
  primarySoft: "#eef0ff",

  // Superficies
  background: "#ffffff",
  surface: "#f8fafc",
  surfaceElevated: "#ffffff",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",

  // Texto
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  textOnPrimary: "#ffffff",

  // Estados
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  success: "#10b981",
  warning: "#f59e0b",

  // Acentos para snippets de búsqueda
  highlight: "#fef3c7",
  highlightStrong: "#facc15",
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const font = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const shadow = {
  // Sombra suave para cards en iOS y Android
  card: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Sombra más marcada para FAB / dropdowns
  elevated: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};
