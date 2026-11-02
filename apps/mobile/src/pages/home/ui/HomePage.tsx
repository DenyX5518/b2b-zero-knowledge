import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { DEMO_ACCOUNT, ORG_NAME } from "../../../shared/config/constants";
import { greeting } from "../../../shared/lib/format";
import { realtimeLabels } from "../../../shared/lib/status";
import { rooms } from "../../../shared/model/demoData";
import { colors, radii, shadow } from "../../../shared/theme/theme";
import { Avatar } from "../../../shared/ui/Avatar";
import { Button } from "../../../shared/ui/Button";
import { ScreenHeader } from "../../../shared/ui/ScreenHeader";
import { SectionTitle } from "../../../shared/ui/SectionTitle";

export function HomePage() {
  const unlocked = useMobileStore((state) => state.unlocked);
  const messages = useMobileStore((state) => state.messages);
  const documents = useMobileStore((state) => state.documents);
  const unread = useMobileStore((state) => state.unread);
  const realtimeState = useMobileStore((state) => state.realtimeState);
  const setActiveTab = useMobileStore((state) => state.setActiveTab);
  const openRoute = useMobileStore((state) => state.openRoute);
  const openChat = useMobileStore((state) => state.openChat);
  const requireUnlock = useMobileStore((state) => state.requireUnlock);
  const setUnlockSheetOpen = useMobileStore((state) => state.setUnlockSheetOpen);

  const [syncLabel] = realtimeLabels[realtimeState];
  const unreadTotal = Object.values(unread).reduce((sum, count) => sum + (count ?? 0), 0);
  const onApproval = documents.filter((document) => document.status === "На согласовании").length;
  const recent = rooms
    .map((room) => ({ room, last: messages.filter((message) => message.room === room.id).at(-1) }))
    .filter((entry) => entry.last)
    .sort((a, b) => (b.last?.sentAt ?? "").localeCompare(a.last?.sentAt ?? ""))
    .slice(0, 3);

  const quickActions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
    { icon: "chatbubble-ellipses-outline", label: "Написать", onPress: () => setActiveTab("chats") },
    { icon: "document-text-outline", label: "Документ", onPress: () => { if (requireUnlock()) openRoute({ name: "new-document" }); } },
    { icon: "server-outline", label: "Backend", onPress: () => openRoute({ name: "infrastructure" }) }
  ];

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.brandRow}>
      <View style={styles.brand}><View style={styles.brandMark}><View style={styles.brandCore} /></View><View><Text style={styles.brandName}>Контур</Text><Text style={styles.brandCaption}>{ORG_NAME.toUpperCase()}</Text></View></View>
      <Pressable onPress={() => setActiveTab("security")} hitSlop={6}><Avatar initials={DEMO_ACCOUNT.initials} tone="lime" size={44} /></Pressable>
    </View>
    <ScreenHeader eyebrow={greeting()} title={DEMO_ACCOUNT.name} subtitle="Ваша защищённая рабочая область" />

    <View style={styles.securityCard}>
      <View style={styles.securityGlow} />
      <View style={styles.securityTop}>
        <View style={[styles.shield, !unlocked && styles.shieldLocked]}><Ionicons name={unlocked ? "shield-checkmark" : "lock-closed"} size={23} color={colors.dark} /></View>
        <View style={styles.live}><View style={[styles.liveDot, !unlocked && styles.liveDotOff]} /><Text style={styles.liveText}>{unlocked ? "ЗАЩИЩЕНО" : "ЗАБЛОКИРОВАНО"}</Text></View>
      </View>
      <Text style={styles.securityTitle}>{unlocked ? "Контур активен" : "Контур заблокирован"}</Text>
      <Text style={styles.securityCopy}>{unlocked ? "Ключ организации находится только в памяти этого доверенного устройства." : "Разблокируйте контур, чтобы расшифровать сообщения и документы на iPhone."}</Text>
      {unlocked ? <View style={styles.securityMeta}>
        <View><Text style={styles.metaLabel}>ШИФРОВАНИЕ</Text><Text style={styles.metaValue}>XChaCha20</Text></View>
        <View style={styles.metaDivider} />
        <View style={styles.metaFlex}><Text style={styles.metaLabel}>СИНХРОНИЗАЦИЯ</Text><Text style={styles.metaValue}>{syncLabel}</Text></View>
      </View> : <View style={styles.unlockButton}><Button label="Разблокировать" variant="primary" icon="lock-open-outline" onPress={() => setUnlockSheetOpen(true)} /></View>}
    </View>

    <View style={styles.quickRow}>{quickActions.map((action) => <Pressable key={action.label} onPress={action.onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}><View style={styles.quickIcon}><Ionicons name={action.icon} size={21} color={colors.teal} /></View><Text style={styles.quickText}>{action.label}</Text></Pressable>)}</View>

    <SectionTitle title="Сегодня" />
    <View style={styles.metrics}>
      <Pressable style={({ pressed }) => [styles.metric, pressed && styles.pressed]} onPress={() => setActiveTab("chats")}><Text style={styles.metricValue}>{unlocked ? unreadTotal : "—"}</Text><Text style={styles.metricLabel}>Непрочитанных сообщений</Text><View style={[styles.metricAccent, { backgroundColor: colors.lime }]} /></Pressable>
      <Pressable style={({ pressed }) => [styles.metric, pressed && styles.pressed]} onPress={() => setActiveTab("documents")}><Text style={styles.metricValue}>{unlocked ? onApproval : "—"}</Text><Text style={styles.metricLabel}>На согласовании</Text><View style={[styles.metricAccent, { backgroundColor: colors.amber }]} /></Pressable>
    </View>

    <SectionTitle title="Последние сообщения" action="Все" onAction={() => setActiveTab("chats")} />
    {unlocked ? <View style={styles.list}>{recent.map(({ room, last }, index) => <Pressable key={room.id} onPress={() => openChat(room.id)} style={({ pressed }) => [styles.chat, index < recent.length - 1 && styles.withBorder, pressed && styles.pressed]}>
      <Avatar initials={room.initials} tone={room.tone} size={46} square={room.group} />
      <View style={styles.chatCopy}><View style={styles.chatLine}><Text numberOfLines={1} style={styles.chatTitle}>{room.title}</Text><Text style={styles.chatTime}>{last?.time}</Text></View><Text numberOfLines={1} style={styles.chatPreview}>{last?.self ? "Вы: " : ""}{last?.text}</Text></View>
      {unread[room.id] ? <View style={styles.unread}><Text style={styles.unreadText}>{unread[room.id]}</Text></View> : null}
    </Pressable>)}</View> : <View style={styles.placeholder}><Ionicons name="lock-closed-outline" size={18} color={colors.subtle} /><Text style={styles.placeholderText}>Сообщения появятся после разблокировки</Text></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: { width: 30, height: 30, alignItems: "center", justifyContent: "center", backgroundColor: colors.dark, borderRadius: 9, transform: [{ rotate: "45deg" }] },
  brandCore: { width: 9, height: 9, backgroundColor: colors.lime, borderRadius: 2 },
  brandName: { color: colors.ink, fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  brandCaption: { marginTop: 1, color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  securityCard: { marginBottom: 14, padding: 22, overflow: "hidden", backgroundColor: colors.dark, borderRadius: radii.lg },
  securityGlow: { position: "absolute", right: -40, top: -60, width: 180, height: 180, backgroundColor: "#294037", borderRadius: 90, opacity: 0.7 },
  securityTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shield: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderRadius: 15 },
  shieldLocked: { backgroundColor: "#F2B8A9" },
  live: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.darkRaised, borderRadius: radii.pill },
  liveDot: { width: 7, height: 7, backgroundColor: colors.lime, borderRadius: 4 },
  liveDotOff: { backgroundColor: "#E58D74" },
  liveText: { color: "#CDE0D6", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  securityTitle: { marginTop: 24, color: colors.surface, fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  securityCopy: { marginTop: 8, color: colors.darkMuted, fontSize: 14, lineHeight: 20 },
  securityMeta: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 22 },
  metaFlex: { flex: 1 },
  metaLabel: { color: "#7D9488", fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
  metaValue: { marginTop: 4, color: "#E6EEE9", fontSize: 15, fontWeight: "700" },
  metaDivider: { width: 1, height: 32, backgroundColor: "#30443B" },
  unlockButton: { marginTop: 20 },
  quickRow: { flexDirection: "row", gap: 10 },
  quickAction: { flex: 1, alignItems: "center", paddingVertical: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md, ...shadow },
  quickIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginBottom: 8, backgroundColor: colors.tealSoft, borderRadius: 13 },
  quickText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, overflow: "hidden", padding: 17, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  metricValue: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  metricLabel: { marginTop: 4, color: colors.muted, fontSize: 13 },
  metricAccent: { position: "absolute", right: 15, top: 17, width: 9, height: 9, borderRadius: 5 },
  list: { paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  chat: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12 },
  withBorder: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  chatCopy: { flex: 1 },
  chatLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatTitle: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: "700" },
  chatTime: { color: colors.subtle, fontSize: 12 },
  chatPreview: { marginTop: 4, color: colors.muted, fontSize: 13 },
  unread: { minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal, borderRadius: 11 },
  unreadText: { color: colors.surface, fontSize: 12, fontWeight: "800" },
  placeholder: { flexDirection: "row", alignItems: "center", gap: 10, padding: 18, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  placeholderText: { color: colors.muted, fontSize: 14 }
});
