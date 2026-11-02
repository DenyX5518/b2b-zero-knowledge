import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { realtimeLabels } from "../../../shared/lib/status";
import { rooms, type ChatMessage, type Room } from "../../../shared/model/demoData";
import { colors, radii } from "../../../shared/theme/theme";
import { Avatar } from "../../../shared/ui/Avatar";
import { LockedGate } from "../../../shared/ui/LockedGate";
import { ScreenHeader } from "../../../shared/ui/ScreenHeader";
import { StatusPill } from "../../../shared/ui/StatusPill";

type Filter = "all" | "unread" | "groups";
const filters: [Filter, string][] = [["all", "Все"], ["unread", "Непрочитанные"], ["groups", "Группы"]];

function preview(room: Room, last?: ChatMessage) {
  if (!last) return "Сообщений пока нет";
  if (last.self) return `Вы: ${last.text}`;
  return room.group ? `${last.author.split(" ")[0]}: ${last.text}` : last.text;
}

export function ChatsPage() {
  const unlocked = useMobileStore((state) => state.unlocked);
  const messages = useMobileStore((state) => state.messages);
  const unread = useMobileStore((state) => state.unread);
  const realtimeState = useMobileStore((state) => state.realtimeState);
  const openChat = useMobileStore((state) => state.openChat);
  const openRoute = useMobileStore((state) => state.openRoute);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [syncLabel, syncTone] = realtimeLabels[realtimeState];

  const needle = query.trim().toLowerCase();
  const list = rooms
    .map((room) => ({ room, last: messages.filter((message) => message.room === room.id).at(-1) }))
    .filter(({ room }) => filter === "all" || (filter === "groups" ? room.group : (unread[room.id] ?? 0) > 0))
    .filter(({ room }) => !needle || room.title.toLowerCase().includes(needle) || messages.some((message) => message.room === room.id && message.text.toLowerCase().includes(needle)));

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <ScreenHeader eyebrow="E2EE КОММУНИКАЦИИ" title="Сообщения" subtitle="Все комнаты защищены сквозным шифрованием" actionIcon="sync-outline" onAction={() => openRoute({ name: "infrastructure" })} />
    {!unlocked ? <LockedGate feature="Сообщения" /> : <>
      <View style={styles.statusRow}><StatusPill label={syncLabel} tone={syncTone} /><Text style={styles.statusHint}>{realtimeState === "connected" ? "Сообщения с компьютера приходят сразу" : "Отправленное уйдёт после подключения"}</Text></View>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.subtle} /><TextInput value={query} onChangeText={setQuery} placeholder="Поиск по комнатам и сообщениям" placeholderTextColor={colors.subtle} style={styles.searchInput} clearButtonMode="while-editing" returnKeyType="search" /></View>
      <View style={styles.filterRow}>{filters.map(([id, label]) => <Pressable key={id} onPress={() => setFilter(id)} style={[styles.filter, filter === id && styles.filterActive]}><Text style={[styles.filterText, filter === id && styles.filterActiveText]}>{label}</Text></Pressable>)}</View>
      {list.length ? <View style={styles.list}>{list.map(({ room, last }, index) => <Pressable key={room.id} onPress={() => openChat(room.id)} style={({ pressed }) => [styles.row, index < list.length - 1 && styles.border, pressed && styles.pressed]}>
        <Avatar initials={room.initials} tone={room.tone} size={52} square={room.group} />
        <View style={styles.copy}>
          <View style={styles.titleLine}><Text numberOfLines={1} style={styles.title}>{room.title}</Text><Text style={styles.time}>{last?.time ?? ""}</Text></View>
          <View style={styles.previewLine}>
            {last?.self ? <Ionicons name={last.pending ? "time-outline" : "checkmark-done"} size={14} color={last.pending ? colors.amber : colors.teal} /> : <Ionicons name="lock-closed" size={11} color={colors.teal} />}
            <Text numberOfLines={1} style={styles.preview}>{preview(room, last)}</Text>
            {unread[room.id] ? <View style={styles.unread}><Text style={styles.unreadText}>{unread[room.id]}</Text></View> : null}
          </View>
        </View>
      </Pressable>)}</View> : <View style={styles.empty}><Text style={styles.emptyText}>{filter === "unread" ? "Непрочитанных сообщений нет" : "Ничего не найдено"}</Text></View>}
      <View style={styles.note}><Ionicons name="shield-checkmark-outline" size={22} color={colors.teal} /><View style={styles.noteCopy}><Text style={styles.noteTitle}>Метаданные минимизированы</Text><Text style={styles.noteText}>Сервер видит только UUID комнаты и ciphertext — не тексты и не ключи.</Text></View></View>
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  statusHint: { flex: 1, color: colors.muted, fontSize: 12 },
  search: { height: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16 },
  searchInput: { flex: 1, height: 48, color: colors.ink, fontSize: 15 },
  filterRow: { flexDirection: "row", gap: 8, marginVertical: 14 },
  filter: { paddingHorizontal: 15, paddingVertical: 9, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.pill },
  filterActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  filterActiveText: { color: colors.surface, fontWeight: "700" },
  list: { paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  row: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 13 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.65 },
  copy: { flex: 1 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  time: { color: colors.subtle, fontSize: 12 },
  previewLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  preview: { flex: 1, color: colors.muted, fontSize: 14 },
  unread: { minWidth: 22, height: 22, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal, borderRadius: 11 },
  unreadText: { color: colors.surface, fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", padding: 28, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  emptyText: { color: colors.muted, fontSize: 14 },
  note: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, padding: 16, backgroundColor: colors.tealSoft, borderRadius: 16 },
  noteCopy: { flex: 1 },
  noteTitle: { color: colors.teal, fontSize: 14, fontWeight: "700" },
  noteText: { marginTop: 3, color: colors.muted, fontSize: 13, lineHeight: 18 }
});
