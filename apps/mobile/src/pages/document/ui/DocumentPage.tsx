import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { DEMO_ACCOUNT } from "../../../shared/config/constants";
import { documentStatuses, isEditable, type DocumentItem, type DocumentVersion } from "../../../shared/model/demoData";
import { colors, radii, tones } from "../../../shared/theme/theme";
import { Button } from "../../../shared/ui/Button";
import { documentIcons } from "../../../shared/ui/documentIcons";
import { StatusPill } from "../../../shared/ui/StatusPill";
import { SubHeader } from "../../../shared/ui/SubHeader";

type Draft = { title: string; content: string; status: string };
const draftOf = (document: DocumentItem): Draft => ({ title: document.title, content: document.content, status: document.status });

export function DocumentPage({ documentId }: { documentId: string }) {
  const document = useMobileStore((state) => state.documents.find((entry) => entry.id === documentId));
  const goBack = useMobileStore((state) => state.goBack);
  const updateDocument = useMobileStore((state) => state.updateDocument);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => document ? draftOf(document) : { title: "", content: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!document) return <View style={styles.root}><SubHeader title="Документ не найден" onBack={goBack} /></View>;
  const [background, foreground] = tones[document.statusTone];
  const editable = isEditable(document);
  const dirty = draft.title.trim() !== document.title || draft.content.trim() !== document.content || draft.status !== document.status;
  const history = [...(document.history ?? [])].reverse();

  const startEditing = () => { setDraft(draftOf(document)); setError(""); setEditing(true); };
  const cancelEditing = () => { setDraft(draftOf(document)); setError(""); setEditing(false); };
  const confirmDiscard = (onDiscard: () => void) => {
    if (!editing || !dirty) return onDiscard();
    Alert.alert("Отменить изменения?", "Несохранённый текст будет потерян.", [
      { text: "Продолжить правку", style: "cancel" },
      { text: "Отменить", style: "destructive", onPress: onDiscard }
    ]);
  };
  const save = async (changes: Draft = draft) => {
    setSaving(true);
    setError("");
    try {
      await updateDocument(document.id, changes);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить документ");
    } finally {
      setSaving(false);
    }
  };
  const restore = (version: DocumentVersion) => Alert.alert(`Восстановить v${version.version}?`, "Текущий текст сохранится в истории, а восстановленный станет новой версией.", [
    { text: "Отмена", style: "cancel" },
    { text: "Восстановить", onPress: () => { void save({ title: version.title, content: version.content, status: version.status }); } }
  ]);

  const editButton = editable && !editing ? <Pressable onPress={startEditing} hitSlop={6} accessibilityRole="button" accessibilityLabel="Редактировать" style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}><Ionicons name="create-outline" size={21} color={colors.dark} /></Pressable> : null;

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <SubHeader
      title={editing ? "Редактирование" : document.title}
      subtitle={editing ? `Сохранение создаст версию ${document.version + 1}` : `Версия ${document.version} · download=false · print=false`}
      onBack={() => confirmDiscard(goBack)}
      right={editButton}
    />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
      {editing ? <>
        <Text style={styles.label}>Название</Text>
        <TextInput value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} maxLength={160} style={styles.input} placeholderTextColor={colors.subtle} placeholder="Название документа" />
        <Text style={[styles.label, styles.spaced]}>Статус</Text>
        <View style={styles.statuses}>{documentStatuses.map((status) => {
          const active = draft.status === status.name;
          const [statusBackground, statusForeground] = tones[status.tone];
          return <Pressable key={status.name} onPress={() => setDraft({ ...draft, status: status.name })} style={[styles.status, active && { backgroundColor: statusBackground, borderColor: statusForeground }]}>
            <Text style={[styles.statusText, active && { color: statusForeground }]}>{status.name}</Text>
          </Pressable>;
        })}</View>
        <Text style={[styles.label, styles.spaced]}>Текст</Text>
        <View style={[styles.paper, styles.paperEditing]}>
          <TextInput value={draft.content} onChangeText={(content) => setDraft({ ...draft, content })} multiline textAlignVertical="top" scrollEnabled={false} autoFocus style={styles.paperInput} placeholder="Текст документа…" placeholderTextColor={colors.subtle} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </> : <>
        <View style={styles.metaRow}>
          <StatusPill label={document.status} tone={document.statusTone} />
          <StatusPill label="Локальная расшифровка" tone="green" />
        </View>
        <View style={styles.facts}>
          <View style={[styles.factIcon, { backgroundColor: background }]}><Ionicons name={documentIcons[document.kind]} size={22} color={foreground} /></View>
          <View style={styles.factCopy}>
            <Text style={styles.factLabel}>{document.editor ? "ПОСЛЕДНЯЯ ПРАВКА" : "ВЛАДЕЛЕЦ"}</Text>
            <Text style={styles.factValue}>{document.editor ?? document.owner}</Text>
            <Text style={styles.factMeta}>{document.classification} · {document.updated}</Text>
          </View>
        </View>
        <View style={styles.paper}>
          <Text selectable={false} style={styles.paperText}>{document.content}</Text>
          <View pointerEvents="none" style={styles.watermarkLayer}><Text style={styles.watermark}>{DEMO_ACCOUNT.name} · protected</Text></View>
        </View>
        {editable ? <View style={styles.editCta}><Button label="Редактировать" icon="create-outline" onPress={startEditing} /></View> : <View style={styles.note}><Ionicons name="lock-closed-outline" size={17} color={colors.teal} /><Text style={styles.noteText}>Документ утверждён и закрыт для изменений политикой организации.</Text></View>}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {history.length ? <>
          <Text style={styles.sectionTitle}>История версий</Text>
          <View style={styles.versions}>
            <View style={[styles.version, styles.versionCurrent]}>
              <Text style={styles.versionNumber}>v{document.version}</Text>
              <View style={styles.versionCopy}><Text numberOfLines={1} style={styles.versionTitle}>{document.title}</Text><Text numberOfLines={1} style={styles.versionMeta}>{document.status} · {document.updated}</Text></View>
              <Text style={styles.versionBadge}>ТЕКУЩАЯ</Text>
            </View>
            {history.map((version) => <View key={version.version} style={styles.version}>
              <Text style={styles.versionNumber}>v{version.version}</Text>
              <View style={styles.versionCopy}><Text numberOfLines={1} style={styles.versionTitle}>{version.title}</Text><Text numberOfLines={1} style={styles.versionMeta}>{version.status} · {version.updated} · {version.author}</Text></View>
              {editable ? <Pressable onPress={() => restore(version)} disabled={saving} hitSlop={6} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}><Ionicons name="arrow-undo-outline" size={17} color={colors.teal} /></Pressable> : null}
            </View>)}
          </View>
        </> : null}
        <View style={[styles.note, styles.auditNote]}><Ionicons name="information-circle-outline" size={18} color={colors.teal} /><Text style={styles.noteText}>Открытие и правки записываются в журнал аудита. Скачивание и печать запрещены политикой.</Text></View>
      </>}
    </ScrollView>
    {editing ? <View style={styles.actionBar}>
      <View style={styles.actionFlex}><Button label="Отмена" disabled={saving} onPress={() => confirmDiscard(cancelEditing)} /></View>
      <View style={styles.actionWide}><Button label={saving ? "Шифрование…" : `Сохранить v${document.version + 1}`} variant="primary" icon="lock-closed-outline" loading={saving} disabled={!dirty || !draft.content.trim()} onPress={() => { void save(); }} /></View>
    </View> : null}
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 18, paddingBottom: 40 },
  pressed: { opacity: 0.7 },
  editButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderRadius: 13 },
  label: { marginBottom: 7, color: colors.muted, fontSize: 13, fontWeight: "700" },
  spaced: { marginTop: 16 },
  input: { minHeight: 50, paddingHorizontal: 15, paddingVertical: 13, color: colors.ink, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14, fontSize: 16 },
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  status: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.pill },
  statusText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  facts: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 14, padding: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  factIcon: { width: 48, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  factCopy: { flex: 1 },
  factLabel: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
  factValue: { marginTop: 3, color: colors.ink, fontSize: 15, fontWeight: "700" },
  factMeta: { marginTop: 3, color: colors.muted, fontSize: 12 },
  paper: { minHeight: 300, marginTop: 14, overflow: "hidden", paddingHorizontal: 22, paddingVertical: 24, backgroundColor: colors.surface, borderRadius: 6, shadowColor: "#1C2822", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 3 },
  paperEditing: { marginTop: 0, borderColor: "#A6DC4F", borderWidth: 2 },
  paperText: { color: "#28312D", fontSize: 16, lineHeight: 27, fontFamily: "Georgia" },
  paperInput: { minHeight: 260, padding: 0, color: "#28312D", fontSize: 16, lineHeight: 27, fontFamily: "Georgia" },
  watermarkLayer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  watermark: { paddingHorizontal: 10, paddingVertical: 6, color: "rgba(75, 94, 84, 0.2)", borderColor: "rgba(75, 94, 84, 0.14)", borderWidth: 1, fontSize: 14, fontWeight: "800", letterSpacing: 0.5, transform: [{ rotate: "-24deg" }] },
  editCta: { marginTop: 14 },
  error: { marginTop: 12, color: colors.danger, fontSize: 13, fontWeight: "600" },
  sectionTitle: { marginTop: 26, marginBottom: 12, color: colors.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  versions: { gap: 8 },
  version: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14 },
  versionCurrent: { backgroundColor: colors.limeSoft, borderColor: "#D6EAB6" },
  versionNumber: { width: 34, color: colors.teal, fontSize: 14, fontWeight: "800", fontFamily: "Menlo" },
  versionCopy: { flex: 1 },
  versionTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  versionMeta: { marginTop: 2, color: colors.muted, fontSize: 12 },
  versionBadge: { color: colors.teal, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  restore: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealSoft, borderRadius: 11 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 14, padding: 14, backgroundColor: colors.tealSoft, borderRadius: 14 },
  auditNote: { marginTop: 18 },
  noteText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  actionBar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
  actionFlex: { flex: 1 },
  actionWide: { flex: 1.6 }
});
