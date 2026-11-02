export const colors = {
  canvas: "#F2F5F1",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F8F5",
  ink: "#12201B",
  muted: "#5F6D66",
  subtle: "#8E9A94",
  line: "#E1E8E3",
  dark: "#14221D",
  darkRaised: "#1E2E27",
  darkMuted: "#A3B4AC",
  lime: "#B9F45B",
  limeSoft: "#EDF9DA",
  teal: "#176B55",
  tealSoft: "#E4F2EC",
  amber: "#A86B1C",
  amberSoft: "#FFF2DD",
  blue: "#3E6B86",
  blueSoft: "#E7F1F8",
  danger: "#A74A42",
  dangerSoft: "#FBEAE8"
} as const;

export const radii = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

export const shadow = {
  shadowColor: "#0C1A14",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 18,
  elevation: 3
} as const;

// Пары «фон / основной цвет» для иконок, статусов и аватаров.
export const tones = {
  green: [colors.tealSoft, colors.teal],
  amber: [colors.amberSoft, colors.amber],
  blue: [colors.blueSoft, colors.blue],
  dark: ["#E5EAE7", colors.dark],
  red: [colors.dangerSoft, colors.danger],
  gray: ["#EDF0EE", colors.muted]
} as const;

export type ToneName = keyof typeof tones;
