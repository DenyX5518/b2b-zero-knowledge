import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { runtimeEnvelopePreview, useMobileStore } from "../../../app/model/useMobileStore";
import { colors, radii } from "../../../shared/theme/theme";
import { SubHeader } from "../../../shared/ui/SubHeader";

const facts = [["Payload", "Ciphertext"], ["Vault", "XChaCha20"], ["Сообщения", "XChaCha20"]] as const;

export function ServerViewPage() {
  const goBack = useMobileStore((state) => state.goBack);
  const messages = useMobileStore((state) => state.messages);
  const [envelope, setEnvelope] = useState<string>("Ciphertext ещё не создан. Разблокируйте контур, чтобы сформировать envelope.");

  useEffect(() => {
    void runtimeEnvelopePreview().then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ciphertext: string };
      setEnvelope(JSON.stringify({ ...parsed, ciphertext: `${parsed.ciphertext.slice(0, 220)}…` }, null, 2));
    });
  }, [messages.length]);

  return <View style={styles.root}>
    <SubHeader title="Что видит сервер" subtitle="Envelope из хранилища — без ключа и plaintext" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.cipher}><Text selectable style={styles.cipherText}>{envelope}</Text></View>
      <View style={styles.facts}>{facts.map(([label, value]) => <View key={label} style={styles.fact}><Text style={styles.factLabel}>{label.toUpperCase()}</Text><Text style={styles.factValue}>{value}</Text></View>)}</View>
      <Text style={styles.note}>Backend получает такие же envelope для сообщений: UUID комнаты, nonce, AAD и ciphertext. Ключ организации и текст остаются на устройствах.</Text>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  cipher: { padding: 16, backgroundColor: "#111A17", borderColor: "#25352E", borderWidth: 1, borderRadius: radii.md },
  cipherText: { color: "#BAD6C8", fontSize: 12, lineHeight: 19, fontFamily: "Menlo" },
  facts: { flexDirection: "row", gap: 8, marginTop: 14 },
  fact: { flex: 1, padding: 12, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 14 },
  factLabel: { color: colors.subtle, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  factValue: { marginTop: 4, color: colors.ink, fontSize: 14, fontWeight: "700" },
  note: { marginTop: 16, color: colors.muted, fontSize: 13, lineHeight: 19 }
});
