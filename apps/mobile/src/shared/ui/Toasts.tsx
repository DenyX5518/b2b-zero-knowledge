import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileStore } from "../../app/model/useMobileStore";
import { colors } from "../theme/theme";

export function Toasts() {
  const toasts = useMobileStore((state) => state.toasts);
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return <View pointerEvents="none" style={[styles.region, { top: insets.top + 8 }]}>
    {toasts.map((toast) => <View key={toast.id} style={styles.toast}>
      <Ionicons name={toast.tone === "danger" ? "alert-circle" : "checkmark-circle"} size={20} color={toast.tone === "danger" ? "#F2917F" : colors.lime} />
      <View style={styles.copy}><Text style={styles.title}>{toast.title}</Text><Text style={styles.description}>{toast.description}</Text></View>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  region: { position: "absolute", left: 14, right: 14, gap: 8, zIndex: 50 },
  toast: { flexDirection: "row", alignItems: "flex-start", gap: 11, paddingHorizontal: 15, paddingVertical: 13, backgroundColor: colors.dark, borderColor: "#2B3A34", borderWidth: 1, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 },
  copy: { flex: 1 },
  title: { color: "#EEF5F0", fontSize: 14, fontWeight: "700" },
  description: { marginTop: 2, color: "#A2B3AB", fontSize: 13, lineHeight: 18 }
});
