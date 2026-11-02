import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileStore, type Route } from "../../../app/model/useMobileStore";
import { DEMO_ACCOUNT, DEMO_DEVICE } from "../../../shared/config/constants";
import { plural } from "../../../shared/lib/format";
import { backendLabels, realtimeLabels } from "../../../shared/lib/status";
import { colors, radii, tones, type ToneName } from "../../../shared/theme/theme";
import { Avatar } from "../../../shared/ui/Avatar";
import { Button } from "../../../shared/ui/Button";
import { ScreenHeader } from "../../../shared/ui/ScreenHeader";
import { StatusPill } from "../../../shared/ui/StatusPill";

type Item = { route: Route["name"]; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; tone: ToneName };

export function SecurityPage() {
  const unlocked = useMobileStore((state) => state.unlocked);
  const audit = useMobileStore((state) => state.audit);
  const realtimeState = useMobileStore((state) => state.realtimeState);
  const backendStatus = useMobileStore((state) => state.backendStatus);
  const hasDeviceKey = useMobileStore((state) => state.hasDeviceKey);
  const openRoute = useMobileStore((state) => state.openRoute);
  const lock = useMobileStore((state) => state.lock);
  const forgetDeviceKey = useMobileStore((state) => state.forgetDeviceKey);
  const setUnlockSheetOpen = useMobileStore((state) => state.setUnlockSheetOpen);
  const [syncLabel, syncTone] = realtimeLabels[realtimeState];
  const [backendLabel, backendTone] = backendLabels[backendStatus];

  const score = (unlocked ? 60 : 30) + (realtimeState === "connected" ? 30 : 0) + (hasDeviceKey ? 8 : 0);
  const items: Item[] = [
    { route: "crypto", icon: "key-outline", title: "Криптоконтур", subtitle: "Иерархия ключей и recovery 2 из 3", tone: "green" },
    { route: "infrastructure", icon: "server-outline", title: "Инфраструктура", subtitle: `${backendLabel} · ${syncLabel.toLowerCase()}`, tone: "blue" },
    { route: "audit", icon: "pulse-outline", title: "Журнал аудита", subtitle: `${plural(audit.length, ["событие", "события", "событий"])} в hash chain`, tone: "amber" },
    { route: "team", icon: "people-outline", title: "Сотрудники и устройства", subtitle: "5 сотрудников · 2 доверенных устройства", tone: "dark" },
    { route: "access", icon: "options-outline", title: "Роли и доступы", subtitle: "Политики проверяются на сервере", tone: "green" },
    { route: "server", icon: "eye-outline", title: "Что видит сервер", subtitle: "Зашифрованный envelope без ключей", tone: "blue" }
  ];

  const confirmForget = () => Alert.alert("Удалить ключ устройства?", "Ключ будет удалён из Keychain, а для разблокировки понадобится кодовая фраза.", [
    { text: "Отмена", style: "cancel" },
    { text: "Удалить", style: "destructive", onPress: () => { void forgetDeviceKey(); } }
  ]);

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <ScreenHeader eyebrow="БЕЗОПАСНОСТЬ" title="Ваш контур" subtitle="Управление доступом и ключами организации" />
    <View style={styles.profile}>
      <Avatar initials={DEMO_ACCOUNT.initials} tone="lime" size={60} />
      <View style={styles.profileCopy}>
        <Text style={styles.name}>{DEMO_ACCOUNT.name}</Text>
        <Text style={styles.role}>{DEMO_ACCOUNT.role}</Text>
        <View style={styles.verified}><Ionicons name="checkmark-circle" size={14} color={colors.teal} /><Text style={styles.verifiedText}>{DEMO_ACCOUNT.email}</Text></View>
      </View>
    </View>
    <View style={styles.health}>
      <View style={styles.healthIcon}><Ionicons name={unlocked ? "shield-checkmark" : "lock-closed"} size={24} color={colors.dark} /></View>
      <View style={styles.healthCopy}><Text style={styles.healthTitle}>Состояние защиты</Text><Text style={styles.healthValue}>{unlocked ? realtimeState === "connected" ? "Все системы в норме" : "Работает локально" : "Контур заблокирован"}</Text></View>
      <View style={styles.score}><Text style={styles.scoreValue}>{score}</Text><Text style={styles.scoreCaption}>из 100</Text></View>
    </View>
    <View style={styles.pills}><StatusPill label={unlocked ? "Vault открыт" : "Vault закрыт"} tone={unlocked ? "green" : "red"} /><StatusPill label={syncLabel} tone={syncTone} /><StatusPill label={backendLabel} tone={backendTone} /></View>

    <Text style={styles.sectionTitle}>Управление</Text>
    <View style={styles.list}>{items.map((item, index) => {
      const [background, foreground] = tones[item.tone];
      return <Pressable key={item.route} onPress={() => openRoute({ name: item.route } as Route)} style={({ pressed }) => [styles.setting, index < items.length - 1 && styles.border, pressed && styles.pressed]}>
        <View style={[styles.settingIcon, { backgroundColor: background }]}><Ionicons name={item.icon} size={20} color={foreground} /></View>
        <View style={styles.settingCopy}><Text style={styles.settingTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.settingSubtitle}>{item.subtitle}</Text></View>
        <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
      </Pressable>;
    })}</View>

    <View style={styles.actions}>
      {unlocked ? <Button label="Заблокировать контур" icon="lock-closed-outline" variant="dark" onPress={() => lock()} /> : <Button label="Разблокировать контур" icon="lock-open-outline" variant="primary" onPress={() => setUnlockSheetOpen(true)} />}
      {hasDeviceKey ? <Button label="Удалить ключ устройства" icon="trash-outline" variant="danger" onPress={confirmForget} /> : null}
    </View>
    <Text style={styles.deviceId}>DEVICE · {DEMO_DEVICE.label} · {hasDeviceKey ? "TRUSTED" : "NOT ENROLLED"}</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  profile: { flexDirection: "row", alignItems: "center", gap: 14, padding: 17, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  profileCopy: { flex: 1 },
  name: { color: colors.ink, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  role: { marginTop: 3, color: colors.muted, fontSize: 13 },
  verified: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  verifiedText: { color: colors.teal, fontSize: 12, fontWeight: "600" },
  health: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 12, padding: 18, backgroundColor: colors.dark, borderRadius: radii.md },
  healthIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderRadius: 15 },
  healthCopy: { flex: 1 },
  healthTitle: { color: "#8CA096", fontSize: 12 },
  healthValue: { marginTop: 3, color: colors.surface, fontSize: 16, fontWeight: "700" },
  score: { alignItems: "flex-end" },
  scoreValue: { color: colors.lime, fontSize: 28, fontWeight: "800" },
  scoreCaption: { color: "#7D9488", fontSize: 11 },
  pills: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 12 },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  list: { paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  setting: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 13 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.65 },
  settingIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  settingCopy: { flex: 1 },
  settingTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  settingSubtitle: { marginTop: 3, color: colors.muted, fontSize: 13 },
  actions: { gap: 10, marginTop: 20 },
  deviceId: { marginTop: 20, color: colors.subtle, fontSize: 11, fontWeight: "700", letterSpacing: 1, textAlign: "center" }
});
