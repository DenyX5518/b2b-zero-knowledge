import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/theme";

// Шапка вложенного экрана: «назад», заголовок и необязательный элемент справа.
export function SubHeader({ title, subtitle, onBack, left, right }: { title: string; subtitle?: ReactNode; onBack: () => void; left?: ReactNode; right?: ReactNode }) {
  return <View style={styles.header}>
    <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Назад" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
      <Ionicons name="chevron-back" size={24} color={colors.ink} />
    </Pressable>
    {left}
    <View style={styles.copy}>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      {typeof subtitle === "string" ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : subtitle}
    </View>
    {right}
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  pressed: { backgroundColor: colors.surfaceMuted },
  copy: { flex: 1 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { marginTop: 2, color: colors.muted, fontSize: 12 }
});
