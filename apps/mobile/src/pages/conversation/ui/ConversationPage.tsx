import { Ionicons } from "@expo/vector-icons";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import type { RoomId } from "../../../shared/config/constants";
import { realtimeLabels } from "../../../shared/lib/status";
import { rooms } from "../../../shared/model/demoData";
import { colors, radii } from "../../../shared/theme/theme";
import { Avatar } from "../../../shared/ui/Avatar";
import { SubHeader } from "../../../shared/ui/SubHeader";

export function ConversationPage({ roomId }: { roomId: RoomId }) {
  const messages = useMobileStore((state) => state.messages);
  const realtimeState = useMobileStore((state) => state.realtimeState);
  const goBack = useMobileStore((state) => state.goBack);
  const sendMessage = useMobileStore((state) => state.sendMessage);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const room = rooms.find((entry) => entry.id === roomId) ?? rooms[0]!;
  const roomMessages = messages.filter((message) => message.room === room.id);
  const [syncLabel, syncTone] = realtimeLabels[realtimeState];

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [roomMessages.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void sendMessage(room.id, text);
  };

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <SubHeader
      onBack={goBack}
      left={<Avatar initials={room.initials} tone={room.tone} size={40} square={room.group} />}
      title={room.title}
      subtitle={<View style={styles.secureLine}><View style={[styles.syncDot, { backgroundColor: syncTone === "green" ? colors.teal : syncTone === "red" ? colors.danger : colors.amber }]} /><Text style={styles.secureText}>{room.members} участников · {syncLabel.toLowerCase()}</Text></View>}
    />
    <View style={styles.encryptionBanner}><Ionicons name="shield-checkmark-outline" size={15} color={colors.teal} /><Text style={styles.encryptionText}>Сквозное шифрование · ключи только на устройствах</Text></View>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false} keyboardDismissMode="interactive" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
      <View style={styles.date}><Text style={styles.dateText}>СЕГОДНЯ</Text></View>
      {roomMessages.map((message) => <View key={message.id} style={[styles.messageRow, message.self && styles.selfRow]}>
        {!message.self ? <Avatar initials={message.initials} tone="green" size={32} /> : null}
        <View style={[styles.messageBlock, message.self && styles.selfBlock]}>
          {!message.self && room.group ? <Text style={styles.author}>{message.author}</Text> : null}
          <View style={[styles.bubble, message.self ? styles.selfBubble : styles.otherBubble]}><Text style={[styles.messageText, message.self && styles.selfText]}>{message.text}</Text></View>
          <View style={[styles.messageMeta, message.self && styles.selfMeta]}>
            <Ionicons name="lock-closed" size={10} color={colors.subtle} />
            <Text style={styles.time}>{message.time}</Text>
            {message.self ? <Ionicons name={message.pending ? "time-outline" : "checkmark-done"} size={14} color={message.pending ? colors.amber : colors.teal} /> : null}
          </View>
        </View>
      </View>)}
      {!roomMessages.length ? <Text style={styles.empty}>Напишите первое сообщение — оно будет зашифровано на этом iPhone.</Text> : null}
    </ScrollView>
    <View style={styles.composer}>
      <View style={styles.inputWrap}><TextInput value={draft} onChangeText={setDraft} placeholder="Защищённое сообщение" placeholderTextColor={colors.subtle} style={styles.input} multiline maxLength={2000} /></View>
      <Pressable onPress={send} disabled={!draft.trim()} accessibilityRole="button" accessibilityLabel="Отправить" style={({ pressed }) => [styles.send, !draft.trim() && styles.sendDisabled, pressed && styles.pressed]}><Ionicons name="arrow-up" size={21} color={colors.dark} /></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  secureLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  secureText: { color: colors.muted, fontSize: 12 },
  encryptionBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.tealSoft },
  encryptionText: { color: colors.teal, fontSize: 12, fontWeight: "600" },
  messages: { paddingHorizontal: 14, paddingVertical: 18, gap: 16 },
  date: { alignItems: "center" },
  dateText: { overflow: "hidden", paddingHorizontal: 11, paddingVertical: 5, color: colors.muted, backgroundColor: "#E5EAE7", borderRadius: radii.pill, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  selfRow: { justifyContent: "flex-end" },
  messageBlock: { maxWidth: "80%" },
  selfBlock: { alignItems: "flex-end" },
  author: { marginBottom: 5, marginLeft: 4, color: colors.muted, fontSize: 12, fontWeight: "700" },
  bubble: { paddingHorizontal: 15, paddingVertical: 11, borderRadius: 19 },
  otherBubble: { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  selfBubble: { backgroundColor: colors.dark, borderBottomRightRadius: 6 },
  messageText: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  selfText: { color: "#EFF5F1" },
  messageMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, marginLeft: 4 },
  selfMeta: { marginLeft: 0, marginRight: 4 },
  time: { color: colors.subtle, fontSize: 11 },
  empty: { marginTop: 40, paddingHorizontal: 30, color: colors.subtle, fontSize: 14, lineHeight: 20, textAlign: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth },
  inputWrap: { flex: 1, minHeight: 44, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.surfaceMuted, borderColor: colors.line, borderWidth: 1, borderRadius: 22 },
  input: { maxHeight: 110, paddingTop: 4, paddingBottom: 4, color: colors.ink, fontSize: 15 },
  send: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, borderRadius: 22 },
  sendDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 }
});
