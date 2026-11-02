import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { formatDateTime, plural } from "../../../shared/lib/format";
import { colors, radii } from "../../../shared/theme/theme";
import { Button } from "../../../shared/ui/Button";
import { SubHeader } from "../../../shared/ui/SubHeader";

export function AuditPage() {
  const audit = useMobileStore((state) => state.audit);
  const verifyAudit = useMobileStore((state) => state.verifyAudit);
  const goBack = useMobileStore((state) => state.goBack);
  const head = audit.at(-1)?.hash ?? "GENESIS";

  return <View style={styles.root}>
    <SubHeader title="Журнал аудита" subtitle="Append-only события без plaintext" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.integrity}>
        <Ionicons name="shield-checkmark-outline" size={22} color="#2F5A36" />
        <View style={styles.integrityCopy}><Text style={styles.integrityTitle}>Hash chain · SHA-256</Text><Text style={styles.integrityText}>{plural(audit.length, ["событие", "события", "событий"])} · содержимое сообщений не логируется</Text><Text numberOfLines={1} style={styles.hash}>{head}</Text></View>
      </View>
      <Button label="Проверить цепочку" variant="primary" icon="checkmark-done-outline" onPress={() => { void verifyAudit(); }} disabled={!audit.length} />
      <View style={styles.list}>{[...audit].reverse().map((event, index) => <View key={event.id} style={[styles.event, index < audit.length - 1 && styles.border]}>
        <View style={styles.eventIcon}><Ionicons name="pulse-outline" size={16} color={colors.teal} /></View>
        <View style={styles.eventCopy}>
          <View style={styles.eventLine}><Text numberOfLines={1} style={styles.eventTitle}>{event.action}</Text><Text style={styles.eventTime}>{formatDateTime(event.at)}</Text></View>
          <Text numberOfLines={1} style={styles.eventTarget}>{event.target}</Text>
          <Text numberOfLines={1} style={styles.eventHash}>{event.hash}</Text>
        </View>
      </View>)}</View>
      {!audit.length ? <Text style={styles.empty}>Событий пока нет — разблокируйте контур.</Text> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  integrity: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, backgroundColor: colors.limeSoft, borderColor: "#D6EAB6", borderWidth: 1, borderRadius: radii.md },
  integrityCopy: { flex: 1 },
  integrityTitle: { color: "#2F5A36", fontSize: 15, fontWeight: "700" },
  integrityText: { marginTop: 3, color: "#5C735A", fontSize: 13 },
  hash: { marginTop: 8, color: "#4F6A52", fontSize: 11, fontFamily: "Menlo" },
  list: { paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  event: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  eventIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft, borderRadius: 10 },
  eventCopy: { flex: 1 },
  eventLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventTitle: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "700" },
  eventTime: { color: colors.subtle, fontSize: 11 },
  eventTarget: { marginTop: 3, color: colors.muted, fontSize: 12 },
  eventHash: { marginTop: 4, color: colors.subtle, fontSize: 10, fontFamily: "Menlo" },
  empty: { color: colors.muted, fontSize: 14, textAlign: "center" }
});
