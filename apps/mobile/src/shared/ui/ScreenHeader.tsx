import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/theme";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  right?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, subtitle, actionIcon, onAction, right }: Props) {
  return <View style={styles.header}>
    <View style={styles.copy}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {right}
    {actionIcon ? <Pressable onPress={onAction} hitSlop={6} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={actionIcon} size={21} color={colors.ink} />
    </Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 20 },
  copy: { flex: 1 },
  eyebrow: { marginBottom: 5, color: colors.teal, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, lineHeight: 35 },
  subtitle: { marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 20 },
  action: { width: 44, height: 44, marginTop: 4, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] }
});
