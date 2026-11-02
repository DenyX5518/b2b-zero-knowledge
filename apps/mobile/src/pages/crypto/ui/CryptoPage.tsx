import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { keyHierarchy, recoveryHolders } from "../../../shared/model/demoData";
import { colors, radii } from "../../../shared/theme/theme";
import { Avatar } from "../../../shared/ui/Avatar";
import { Button } from "../../../shared/ui/Button";
import { LockedGate } from "../../../shared/ui/LockedGate";
import { SubHeader } from "../../../shared/ui/SubHeader";

export function CryptoPage() {
  const unlocked = useMobileStore((state) => state.unlocked);
  const approvals = useMobileStore((state) => state.approvals);
  const toggleApproval = useMobileStore((state) => state.toggleApproval);
  const recoverKey = useMobileStore((state) => state.recoverKey);
  const goBack = useMobileStore((state) => state.goBack);
  const [busy, setBusy] = useState(false);
  const ready = approvals.length >= 2;

  const recover = async () => { setBusy(true); try { await recoverKey(); } finally { setBusy(false); } };

  return <View style={styles.root}>
    <SubHeader title="Криптоконтур" subtitle="Ключи принадлежат организации" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {!unlocked ? <LockedGate feature="Ключи" /> : <>
        <Text style={styles.sectionTitle}>Иерархия ключей</Text>
        <Text style={styles.sectionCopy}>Каждый объект имеет отдельный DEK и контекст AEAD.</Text>
        <View style={styles.rootNode}>
          <View style={styles.rootIcon}><Ionicons name="key" size={19} color={colors.lime} /></View>
          <View style={styles.nodeCopy}><Text style={styles.rootTitle}>Organization Root Key</Text><Text style={styles.rootNote}>Только в RAM доверенного клиента</Text></View>
          <Text style={styles.rootState}>ВНЕ СЕРВЕРА</Text>
        </View>
        <View style={styles.branch}>{keyHierarchy.map((node) => <View key={node.title} style={styles.node}>
          <View style={styles.nodeIcon}><Ionicons name={node.icon} size={18} color={colors.teal} /></View>
          <View style={styles.nodeCopy}><Text style={styles.nodeTitle}>{node.title}</Text><Text style={styles.nodeNote}>{node.note}</Text></View>
          <Text style={styles.nodeState}>ACTIVE</Text>
        </View>)}</View>

        <Text style={[styles.sectionTitle, styles.spaced]}>Восстановление 2 из 3</Text>
        <Text style={styles.sectionCopy}>Выберите двух независимых держателей — секрет соберётся из реальных Shamir shares.</Text>
        <View style={styles.holders}>{recoveryHolders.map((holder) => {
          const approved = approvals.includes(holder.id);
          return <View key={holder.id} style={[styles.holder, approved && styles.holderApproved]}>
            <Avatar initials={holder.initials} tone={approved ? "lime" : "green"} size={40} />
            <View style={styles.nodeCopy}><Text style={styles.nodeTitle}>{holder.name}</Text><Text style={styles.nodeNote}>{holder.role}</Text></View>
            <Button compact label={approved ? "Получен" : "Запросить"} icon={approved ? "checkmark" : undefined} variant={approved ? "primary" : "secondary"} disabled={approved || (ready && !approved)} onPress={() => toggleApproval(holder.id)} />
          </View>;
        })}</View>
        <View style={[styles.approval, ready && styles.approvalReady]}>
          <Text style={[styles.approvalText, ready && styles.approvalTextReady]}>{ready ? "Кворум достигнут" : `Подтверждений: ${approvals.length} из 2`}</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(approvals.length, 2) * 50}%` }]} /></View>
          {ready ? <View style={styles.recoverButton}><Button label="Проверить восстановление" variant="primary" icon="refresh-outline" loading={busy} onPress={recover} /></View> : null}
        </View>
        <View style={styles.note}><Ionicons name="information-circle-outline" size={18} color={colors.amber} /><Text style={styles.noteText}>Backend координирует ceremony, но получает только зашифрованные share envelopes.</Text></View>
      </>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  spaced: { marginTop: 28 },
  sectionCopy: { marginTop: 4, marginBottom: 14, color: colors.muted, fontSize: 14, lineHeight: 20 },
  rootNode: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, backgroundColor: colors.dark, borderRadius: radii.md },
  rootIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.darkRaised, borderRadius: 12 },
  rootTitle: { color: colors.surface, fontSize: 15, fontWeight: "700" },
  rootNote: { marginTop: 2, color: colors.darkMuted, fontSize: 12 },
  rootState: { color: colors.lime, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  branch: { marginLeft: 22, paddingLeft: 16, paddingTop: 10, gap: 9, borderLeftColor: "#B9C5BF", borderLeftWidth: 1, borderStyle: "dashed" },
  node: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14 },
  nodeIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft, borderRadius: 11 },
  nodeCopy: { flex: 1 },
  nodeTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  nodeNote: { marginTop: 2, color: colors.muted, fontSize: 12 },
  nodeState: { color: colors.teal, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  holders: { gap: 9 },
  holder: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16 },
  holderApproved: { backgroundColor: colors.limeSoft, borderColor: "#D5E9B6" },
  approval: { marginTop: 14, padding: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16 },
  approvalReady: { backgroundColor: colors.limeSoft, borderColor: "#D5E9B6" },
  approvalText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  approvalTextReady: { color: "#2F5D37" },
  progressTrack: { height: 6, marginTop: 10, overflow: "hidden", backgroundColor: "#DFE5E1", borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: "#6EAA4F", borderRadius: 3 },
  recoverButton: { marginTop: 14 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 14, padding: 14, backgroundColor: colors.amberSoft, borderRadius: 14 },
  noteText: { flex: 1, color: "#7A5A1F", fontSize: 13, lineHeight: 18 }
});
