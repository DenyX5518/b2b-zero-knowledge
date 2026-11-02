import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/theme";

type Variant = "primary" | "secondary" | "dark" | "danger";

const palette: Record<Variant, { background: string; border: string; text: string }> = {
  primary: { background: colors.lime, border: "#A6DC4F", text: colors.dark },
  secondary: { background: colors.surface, border: colors.line, text: colors.ink },
  dark: { background: colors.dark, border: colors.dark, text: colors.surface },
  danger: { background: colors.dangerSoft, border: "#F1D2CE", text: colors.danger }
};

export function Button({ label, onPress, variant = "secondary", icon, disabled = false, loading = false, compact = false }: { label: string; onPress: () => void; variant?: Variant; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; loading?: boolean; compact?: boolean }) {
  const tone = palette[variant];
  return <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    style={({ pressed }) => [styles.button, compact && styles.compact, { backgroundColor: tone.background, borderColor: tone.border }, (disabled || loading) && styles.disabled, pressed && styles.pressed]}
  >
    {loading ? <ActivityIndicator size="small" color={tone.text} /> : icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={tone.text} /> : null}
    <Text style={[styles.label, compact && styles.compactLabel, { color: tone.text }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, borderWidth: 1, borderRadius: 15 },
  compact: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12 },
  label: { fontSize: 15, fontWeight: "700" },
  compactLabel: { fontSize: 13 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] }
});
