import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useMobileStore } from "../../app/model/useMobileStore";
import { colors, radii } from "../theme/theme";
import { Button } from "./Button";

export function LockedGate({ feature }: { feature: string }) {
  const setUnlockSheetOpen = useMobileStore((state) => state.setUnlockSheetOpen);
  return <View style={styles.gate}>
    <View style={styles.icon}><Ionicons name="lock-closed" size={30} color={colors.teal} /></View>
    <Text style={styles.title}>{feature} зашифрованы</Text>
    <Text style={styles.copy}>Расшифровка выполняется на этом iPhone. Провайдер не получает ключ организации и plaintext.</Text>
    <Button label="Разблокировать контур" icon="lock-open-outline" variant="primary" onPress={() => setUnlockSheetOpen(true)} />
  </View>;
}

const styles = StyleSheet.create({
  gate: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 36, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderStyle: "dashed", borderRadius: radii.md },
  icon: { width: 72, height: 72, marginBottom: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.limeSoft, borderRadius: 22 },
  title: { color: colors.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.4, textAlign: "center" },
  copy: { marginTop: 8, marginBottom: 22, color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }
});
