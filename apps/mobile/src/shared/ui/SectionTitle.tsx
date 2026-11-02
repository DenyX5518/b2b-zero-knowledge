import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/theme";

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.action}>{action}</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  action: { color: colors.teal, fontSize: 14, fontWeight: "700" }
});
