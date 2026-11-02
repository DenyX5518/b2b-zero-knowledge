import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { DEMO_PASSPHRASE } from "../../../shared/config/constants";
import { colors, radii } from "../../../shared/theme/theme";
import { Button } from "../../../shared/ui/Button";

export function UnlockSheet() {
  const open = useMobileStore((state) => state.unlockSheetOpen);
  const unlocking = useMobileStore((state) => state.unlocking);
  const progress = useMobileStore((state) => state.unlockProgress);
  const hasDeviceKey = useMobileStore((state) => state.hasDeviceKey);
  const setOpen = useMobileStore((state) => state.setUnlockSheetOpen);
  const unlock = useMobileStore((state) => state.unlock);
  const insets = useSafeAreaInsets();
  const [passphrase, setPassphrase] = useState(DEMO_PASSPHRASE);
  const [error, setError] = useState("");
  const [usePassphrase, setUsePassphrase] = useState(!hasDeviceKey);

  useEffect(() => { if (open) { setError(""); setUsePassphrase(!hasDeviceKey); } }, [open, hasDeviceKey]);

  const run = async (value?: string) => {
    setError("");
    try { await unlock(value); } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось вывести ключ"); }
  };
  const close = () => { if (!unlocking) setOpen(false); };

  return <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={styles.layer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.handle} />
        <View style={styles.icon}><Ionicons name="lock-closed" size={28} color={colors.dark} /></View>
        <Text style={styles.eyebrow}>ЛОКАЛЬНЫЙ VAULT</Text>
        <Text style={styles.title}>Разблокировать контур</Text>
        <Text style={styles.copy}>{usePassphrase ? "Ключ выводится Argon2id (64 MiB, 3 прохода) прямо на iPhone — тот же ключ, что и в веб-клиенте." : "На этом iPhone сохранён ключ доверенного устройства. Он хранится в iOS Keychain и не покидает устройство."}</Text>

        {usePassphrase ? <>
          <Text style={styles.label}>Кодовая фраза организации</Text>
          <TextInput value={passphrase} onChangeText={setPassphrase} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!unlocking} returnKeyType="go" onSubmitEditing={() => run(passphrase)} style={styles.input} placeholderTextColor={colors.subtle} placeholder="Кодовая фраза" />
          <Text style={styles.hint}>Демо-фраза: <Text style={styles.code}>{DEMO_PASSPHRASE}</Text></Text>
          {unlocking ? <View style={styles.progressWrap}>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(4, Math.round(progress * 100))}%` }]} /></View>
            <Text style={styles.progressText}>Argon2id выполняется… {Math.round(progress * 100)}% · первый раз это занимает до минуты</Text>
          </View> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label={unlocking ? "Выводим ключ…" : "Вывести ключ и открыть"} variant="primary" icon="key-outline" loading={unlocking} onPress={() => run(passphrase)} />
            {hasDeviceKey && !unlocking ? <Button label="Использовать ключ устройства" icon="phone-portrait-outline" onPress={() => setUsePassphrase(false)} /> : null}
          </View>
        </> : <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button label="Разблокировать" variant="primary" icon="lock-open-outline" loading={unlocking} onPress={() => run()} />
            <Button label="Ввести кодовую фразу" icon="create-outline" disabled={unlocking} onPress={() => setUsePassphrase(true)} />
          </View>
        </>}
        <View style={styles.warning}><Ionicons name="warning-outline" size={16} color={colors.amber} /><Text style={styles.warningText}>Публичная демо-фраза не подходит для реальных секретов.</Text></View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 18, 14, 0.5)" },
  sheet: { paddingHorizontal: 22, paddingTop: 10, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { alignSelf: "center", width: 40, height: 5, marginBottom: 18, backgroundColor: colors.line, borderRadius: 3 },
  icon: { width: 60, height: 60, marginBottom: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderRadius: 19, transform: [{ rotate: "-3deg" }] },
  eyebrow: { color: colors.teal, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: 4, color: colors.ink, fontSize: 25, fontWeight: "800", letterSpacing: -0.6 },
  copy: { marginTop: 8, marginBottom: 18, color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { marginBottom: 7, color: colors.muted, fontSize: 13, fontWeight: "700" },
  input: { height: 52, paddingHorizontal: 15, color: colors.ink, backgroundColor: colors.surfaceMuted, borderColor: colors.line, borderWidth: 1, borderRadius: 14, fontSize: 16 },
  hint: { marginTop: 9, color: colors.subtle, fontSize: 13 },
  code: { color: colors.teal, fontWeight: "700" },
  progressWrap: { marginTop: 16 },
  progressTrack: { height: 8, overflow: "hidden", backgroundColor: colors.surfaceMuted, borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: colors.teal, borderRadius: 4 },
  progressText: { marginTop: 8, color: colors.muted, fontSize: 12 },
  error: { marginTop: 14, color: colors.danger, fontSize: 13, fontWeight: "600" },
  actions: { gap: 10, marginTop: 20 },
  warning: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, padding: 12, backgroundColor: colors.amberSoft, borderRadius: radii.sm },
  warningText: { flex: 1, color: "#7A5A1F", fontSize: 12, lineHeight: 17 }
});
