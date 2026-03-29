const gold = "#C9A84C";
const tabInactive = "#5A5A6B";

export default {
  light: {
    text: "#FFFFFF",
    background: "#0A0A0B",
    tint: gold,
    tabIconDefault: tabInactive,
    tabIconSelected: gold,
  },
};

export const COLORS = {
  background: "#0A0A0B",
  card: "#141416",
  cardAlt: "#1A1A1F",
  primary: gold,
  primaryDim: "rgba(201, 168, 76, 0.15)",
  primaryBorder: "rgba(201, 168, 76, 0.3)",
  text: "#FFFFFF",
  textSecondary: "#A0A0B0",
  textMuted: "#5A5A6B",
  border: "#1E1E24",
  borderDim: "#111115",
  success: "#22C55E",
  successDim: "rgba(34, 197, 94, 0.15)",
  danger: "#EF4444",
  dangerDim: "rgba(239, 68, 68, 0.15)",
  blue: "#3B82F6",
  blueDim: "rgba(59, 130, 246, 0.15)",
  purple: "#A855F7",
  purpleDim: "rgba(168, 85, 247, 0.15)",
  green: "#22C55E",
  greenDim: "rgba(34, 197, 94, 0.15)",
  amber: "#F59E0B",
  amberDim: "rgba(245, 158, 11, 0.15)",
  tabActive: gold,
  tabInactive,
};

export const MEMBER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  gold: { bg: "rgba(201, 168, 76, 0.12)", border: "rgba(201, 168, 76, 0.3)", text: gold },
  blue: { bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.3)", text: "#3B82F6" },
  purple: { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.3)", text: "#A855F7" },
  green: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.3)", text: "#22C55E" },
  amber: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", text: "#F59E0B" },
};
