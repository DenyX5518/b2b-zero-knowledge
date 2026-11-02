import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type MobileTab, useMobileStore } from "../../../app/model/useMobileStore";
import { colors, shadow } from "../../../shared/theme/theme";

const tabs: { id: MobileTab; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: "home", icon: "grid-outline", activeIcon: "grid", label: "Главная" },
  { id: "chats", icon: "chatbubble-outline", activeIcon: "chatbubble", label: "Чаты" },
  { id: "documents", icon: "folder-outline", activeIcon: "folder", label: "Документы" },
  { id: "security", icon: "shield-outline", activeIcon: "shield", label: "Контур" }
];

export function BottomTabs() {
  const activeTab = useMobileStore((state) => state.activeTab);
  const setActiveTab = useMobileStore((state) => state.setActiveTab);
  const unreadTotal = useMobileStore((state) => Object.values(state.unread).reduce((sum, count) => sum + (count ?? 0), 0));
  const insets = useSafeAreaInsets();
  return <View style={[styles.shell, { bottom: Math.max(insets.bottom - 10, 8) }]}>
    <View style={styles.tabs}>{tabs.map((tab) => {
      const active = activeTab === tab.id;
      return <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
          <Ionicons name={active ? tab.activeIcon : tab.icon} size={20} color={active ? colors.dark : colors.subtle} />
          {tab.id === "chats" && unreadTotal > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadTotal}</Text></View> : null}
        </View>
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </Pressable>;
    })}</View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { position: "absolute", left: 14, right: 14 },
  tabs: { height: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 6, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 24, ...shadow },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  pressed: { opacity: 0.6 },
  iconWrap: { width: 44, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  iconWrapActive: { backgroundColor: colors.lime },
  badge: { position: "absolute", top: -4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal, borderColor: colors.surface, borderWidth: 2, borderRadius: 9 },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  label: { color: colors.subtle, fontSize: 11, fontWeight: "600" },
  labelActive: { color: colors.ink, fontWeight: "800" }
});
