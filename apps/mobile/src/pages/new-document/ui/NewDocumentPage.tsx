import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { colors, radii } from "../../../shared/theme/theme";
import { Button } from "../../../shared/ui/Button";
import { SubHeader } from "../../../shared/ui/SubHeader";

export function NewDocumentPage() {
  const goBack = useMobileStore((state) => state.goBack);
  const createDocument = useMobileStore((state) => state.createDocument);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try { await createDocument({ title, content }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Не удалось создать документ"); setBusy(false); }
  };

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <SubHeader title="Новый документ" subtitle="Текст шифруется до сохранения" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Название</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="Например, служебная записка" placeholderTextColor={colors.subtle} style={styles.input} returnKeyType="next" />
      <Text style={[styles.label, styles.spaced]}>Текст документа</Text>
      <TextInput value={content} onChangeText={setContent} placeholder="Введите текст…" placeholderTextColor={colors.subtle} style={[styles.input, styles.textarea]} multiline textAlignVertical="top" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.note}><Ionicons name="lock-closed-outline" size={17} color={colors.teal} /><Text style={styles.noteText}>Документ сохраняется в зашифрованном vault на iPhone (XChaCha20-Poly1305). Загрузка DOCX/XLSX/PDF доступна в веб-клиенте.</Text></View>
      <Button label={busy ? "Шифрование…" : "Зашифровать и сохранить"} variant="primary" icon="lock-closed-outline" loading={busy} onPress={submit} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  label: { marginBottom: 7, color: colors.muted, fontSize: 13, fontWeight: "700" },
  spaced: { marginTop: 16 },
  input: { minHeight: 52, paddingHorizontal: 15, paddingVertical: 14, color: colors.ink, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14, fontSize: 16 },
  textarea: { minHeight: 220, lineHeight: 22 },
  error: { marginTop: 12, color: colors.danger, fontSize: 13, fontWeight: "600" },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginVertical: 18, padding: 14, backgroundColor: colors.tealSoft, borderRadius: radii.sm },
  noteText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 }
});
