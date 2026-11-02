import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { DEMO_ACCOUNT, DEMO_DEVICE } from "../../../shared/config/constants";
import { backendLabels, realtimeLabels } from "../../../shared/lib/status";
import { infrastructureServices } from "../../../shared/model/demoData";
import { colors, radii, tones } from "../../../shared/theme/theme";
import { Button } from "../../../shared/ui/Button";
import { StatusPill } from "../../../shared/ui/StatusPill";
import { SubHeader } from "../../../shared/ui/SubHeader";

export function InfrastructurePage() {
  const apiOrigin = useMobileStore((state) => state.apiOrigin);
  const backendStatus = useMobileStore((state) => state.backendStatus);
  const backendSession = useMobileStore((state) => state.backendSession);
  const realtimeState = useMobileStore((state) => state.realtimeState);
  const unlocked = useMobileStore((state) => state.unlocked);
  const setApiOrigin = useMobileStore((state) => state.setApiOrigin);
  const demoLogin = useMobileStore((state) => state.demoLogin);
  const rotateSession = useMobileStore((state) => state.rotateSession);
  const logout = useMobileStore((state) => state.logout);
  const requireUnlock = useMobileStore((state) => state.requireUnlock);
  const goBack = useMobileStore((state) => state.goBack);
  const [draft, setDraft] = useState(apiOrigin);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendLabel, backendTone] = backendLabels[backendStatus];
  const [syncLabel, syncTone] = realtimeLabels[realtimeState];
  const [bannerBackground, bannerForeground] = tones[backendTone];

  useEffect(() => setDraft(apiOrigin), [apiOrigin]);

  const run = (name: string, action: () => Promise<unknown>) => async () => {
    setBusy(name);
    try { await action(); } finally { setBusy(null); }
  };
  const check = run("check", async () => { await setApiOrigin(draft); await useMobileStore.getState().checkBackend(); });
  const login = run("login", async () => { if (!requireUnlock()) return; await setApiOrigin(draft); await demoLogin(); });

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <SubHeader title="Инфраструктура" subtitle="Backend, сессия и синхронизация" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={[styles.banner, { backgroundColor: bannerBackground }]}>
        <View style={[styles.bannerDot, { backgroundColor: bannerForeground }]} />
        <View style={styles.bannerCopy}><Text style={[styles.bannerTitle, { color: bannerForeground }]}>{backendStatus === "ready" ? "Контур запущен" : backendLabel}</Text><Text numberOfLines={1} style={styles.bannerText}>{apiOrigin}/api/v1/health/ready</Text></View>
      </View>

      <Text style={styles.label}>Адрес backend (IP компьютера в Wi-Fi сети)</Text>
      <TextInput value={draft} onChangeText={setDraft} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.10:3001" placeholderTextColor={colors.subtle} style={styles.input} onSubmitEditing={check} returnKeyType="done" />
      <Text style={styles.hint}>Expo Go подставляет адрес компьютера с Metro автоматически. Телефон и компьютер должны быть в одной сети.</Text>
      <View style={styles.buttons}><Button label="Проверить backend" variant="primary" icon="pulse-outline" loading={busy === "check"} onPress={check} /></View>

      <Text style={styles.sectionTitle}>Сессия</Text>
      <View style={styles.card}>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Статус</Text><StatusPill label={backendSession ? "Открыта" : "Не открыта"} tone={backendSession ? "green" : "gray"} /></View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Realtime</Text><StatusPill label={syncLabel} tone={syncTone} /></View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Аккаунт</Text><Text numberOfLines={1} style={styles.cardValue}>{DEMO_ACCOUNT.email}</Text></View>
        <View style={[styles.cardRow, styles.lastRow]}><Text style={styles.cardLabel}>Устройство</Text><Text style={styles.cardValue}>{DEMO_DEVICE.id}</Text></View>
      </View>
      <View style={styles.buttons}>
        {backendSession ? <>
          <Button label="Ротировать refresh token" icon="refresh-outline" loading={busy === "rotate"} onPress={run("rotate", () => rotateSession())} />
          <Button label="Выйти из сессии" variant="danger" icon="log-out-outline" loading={busy === "logout"} onPress={run("logout", logout)} />
        </> : <Button label={unlocked ? "Войти и включить синхронизацию" : "Разблокировать и войти"} variant="dark" icon="log-in-outline" loading={busy === "login"} onPress={login} />}
      </View>

      <Text style={styles.sectionTitle}>Сервисы</Text>
      <View style={styles.services}>{infrastructureServices.map((service) => <View key={service.name} style={styles.service}>
        <View style={styles.serviceIcon}><Ionicons name={service.icon} size={19} color={colors.teal} /></View>
        <View style={styles.serviceCopy}><Text style={styles.serviceMode}>{service.mode.toUpperCase()}</Text><Text style={styles.serviceName}>{service.name}</Text><Text style={styles.serviceText}>{service.description}</Text></View>
      </View>)}</View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: radii.md },
  bannerDot: { width: 11, height: 11, borderRadius: 6 },
  bannerCopy: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: "700" },
  bannerText: { marginTop: 3, color: colors.muted, fontSize: 12, fontFamily: "Menlo" },
  label: { marginTop: 20, marginBottom: 7, color: colors.muted, fontSize: 13, fontWeight: "700" },
  input: { height: 52, paddingHorizontal: 15, color: colors.ink, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14, fontSize: 15, fontFamily: "Menlo" },
  hint: { marginTop: 8, color: colors.subtle, fontSize: 12, lineHeight: 17 },
  buttons: { gap: 10, marginTop: 14 },
  sectionTitle: { marginTop: 28, marginBottom: 12, color: colors.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  card: { paddingHorizontal: 16, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  cardRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  lastRow: { borderBottomWidth: 0 },
  cardLabel: { color: colors.muted, fontSize: 14 },
  cardValue: { flexShrink: 1, color: colors.ink, fontSize: 13, fontWeight: "600" },
  services: { gap: 10 },
  service: { flexDirection: "row", alignItems: "flex-start", gap: 13, padding: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  serviceIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft, borderRadius: 12 },
  serviceCopy: { flex: 1 },
  serviceMode: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  serviceName: { marginTop: 3, color: colors.ink, fontSize: 15, fontWeight: "700" },
  serviceText: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 18 }
});
