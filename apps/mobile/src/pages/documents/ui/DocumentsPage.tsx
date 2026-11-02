import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { colors, radii, tones } from "../../../shared/theme/theme";
import { documentIcons } from "../../../shared/ui/documentIcons";
import { LockedGate } from "../../../shared/ui/LockedGate";
import { ScreenHeader } from "../../../shared/ui/ScreenHeader";

export function DocumentsPage() {
  const unlocked = useMobileStore((state) => state.unlocked);
  const documents = useMobileStore((state) => state.documents);
  const openDocument = useMobileStore((state) => state.openDocument);
  const openRoute = useMobileStore((state) => state.openRoute);
  const requireUnlock = useMobileStore((state) => state.requireUnlock);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const visible = documents.filter((document) => !needle || document.title.toLowerCase().includes(needle) || document.owner.toLowerCase().includes(needle));
  const onApproval = documents.filter((document) => document.status === "На согласовании").length;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <ScreenHeader eyebrow="ЗАЩИЩЁННОЕ ХРАНИЛИЩЕ" title="Документы" subtitle="Файлы расшифровываются только на устройстве" actionIcon="add" onAction={() => { if (requireUnlock()) openRoute({ name: "new-document" }); }} />
    {!unlocked ? <LockedGate feature="Документы" /> : <>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.subtle} /><TextInput value={query} onChangeText={setQuery} placeholder="Название или владелец" placeholderTextColor={colors.subtle} style={styles.searchInput} clearButtonMode="while-editing" returnKeyType="search" /></View>
      <View style={styles.summary}>
        <View style={styles.summaryItem}><Text style={styles.summaryLabel}>ВСЕГО</Text><Text style={styles.summaryValue}>{documents.length}</Text></View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}><Text style={styles.summaryLabel}>СОГЛАСОВАНИЕ</Text><Text style={styles.summaryValue}>{onApproval}</Text></View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}><Text style={styles.summaryLabel}>ЗАЩИЩЕНО</Text><Text style={styles.summaryValue}>100%</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Недавние</Text>
      {visible.length ? <View style={styles.list}>{visible.map((document, index) => {
        const [background, foreground] = tones[document.statusTone];
        return <Pressable key={document.id} onPress={() => openDocument(document.id)} style={({ pressed }) => [styles.document, index < visible.length - 1 && styles.border, pressed && styles.pressed]}>
          <View style={[styles.docIcon, { backgroundColor: background }]}><Ionicons name={documentIcons[document.kind]} size={21} color={foreground} /></View>
          <View style={styles.copy}>
            <Text numberOfLines={2} style={styles.title}>{document.title}</Text>
            <Text numberOfLines={1} style={styles.meta}>{document.owner} · {document.updated}</Text>
            <View style={styles.statusRow}><View style={[styles.status, { backgroundColor: background }]}><View style={[styles.statusDot, { backgroundColor: foreground }]} /><Text style={[styles.statusText, { color: foreground }]}>{document.status}</Text></View><Ionicons name={document.syncedVersion === document.version ? "cloud-done-outline" : "cloud-upload-outline"} size={16} color={document.syncedVersion === document.version ? colors.teal : colors.subtle} /></View>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
        </Pressable>;
      })}</View> : <View style={styles.empty}><Text style={styles.emptyText}>Документы не найдены</Text></View>}
      <View style={styles.protected}><View style={styles.protectedIcon}><Ionicons name="lock-closed" size={17} color={colors.teal} /></View><View style={styles.protectedCopy}><Text style={styles.protectedTitle}>Локальная расшифровка</Text><Text style={styles.protectedText}>Содержимое не передаётся инфраструктуре в открытом виде.</Text></View></View>
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  search: { height: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16 },
  searchInput: { flex: 1, height: 48, color: colors.ink, fontSize: 15 },
  summary: { flexDirection: "row", alignItems: "center", marginTop: 14, paddingHorizontal: 8, paddingVertical: 17, backgroundColor: colors.dark, borderRadius: radii.md },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { color: "#7D9488", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  summaryValue: { marginTop: 4, color: colors.surface, fontSize: 22, fontWeight: "800" },
  divider: { width: 1, height: 34, backgroundColor: "#30443B" },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  list: { paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  document: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 14 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.65 },
  docIcon: { width: 48, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  copy: { flex: 1 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "700", letterSpacing: -0.15 },
  meta: { marginTop: 4, color: colors.subtle, fontSize: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  status: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", padding: 28, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  emptyText: { color: colors.muted, fontSize: 14 },
  protected: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, padding: 15, backgroundColor: colors.tealSoft, borderRadius: 16 },
  protectedIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderRadius: 12 },
  protectedCopy: { flex: 1 },
  protectedTitle: { color: colors.teal, fontSize: 14, fontWeight: "700" },
  protectedText: { marginTop: 3, color: colors.muted, fontSize: 13, lineHeight: 18 }
});
