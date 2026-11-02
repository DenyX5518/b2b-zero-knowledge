import { StyleSheet, Text, View } from "react-native";
import { tones, type ToneName } from "../theme/theme";

export function StatusPill({ label, tone = "gray" }: { label: string; tone?: ToneName }) {
  const [background, foreground] = tones[tone];
  return <View style={[styles.pill, { backgroundColor: background }]}>
    <View style={[styles.dot, { backgroundColor: foreground }]} />
    <Text numberOfLines={1} style={[styles.text, { color: foreground }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "700" }
});
