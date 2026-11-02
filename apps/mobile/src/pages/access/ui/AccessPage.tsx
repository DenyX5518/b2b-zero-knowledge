import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { permissions, rolePermissions } from "../../../shared/model/demoData";
import { colors, radii } from "../../../shared/theme/theme";
import { Button } from "../../../shared/ui/Button";
import { SubHeader } from "../../../shared/ui/SubHeader";

export function AccessPage() {
  const goBack = useMobileStore((state) => state.goBack);
  const toast = useMobileStore((state) => state.toast);
  const appendAudit = useMobileStore((state) => state.appendAudit);
  const unlocked = useMobileStore((state) => state.unlocked);
  const [role, setRole] = useState("Руководитель");
  const [matrix, setMatrix] = useState(rolePermissions);
  const switches = matrix[role] ?? [];

  const toggle = (index: number) => setMatrix((current) => ({ ...current, [role]: (current[role] ?? []).map((value, position) => position === index ? !value : value) }));
  const save = async () => {
    if (unlocked) await appendAudit("Политика изменена", `role:${role}`);
    toast("Политика сохранена", `Роль «${role}» обновлена; backend повторно проверит каждое действие.`);
  };

  return <View style={styles.root}>
    <SubHeader title="Роли и доступы" subtitle="Изменения требуют step-up MFA" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roles}>{Object.keys(rolePermissions).map((name) => <Pressable key={name} onPress={() => setRole(name)} style={[styles.role, role === name && styles.roleActive]}><Text style={[styles.roleText, role === name && styles.roleTextActive]}>{name}</Text></Pressable>)}</ScrollView>
      <Text style={styles.counter}>{switches.filter(Boolean).length} из {permissions.length} разрешений включено</Text>
      <View style={styles.list}>{permissions.map((permission, index) => <View key={permission} style={[styles.row, index < permissions.length - 1 && styles.border]}>
        <View style={styles.copy}><Text style={styles.title}>{permission}</Text><Text style={styles.subtitle}>Проверяется серверной policy layer</Text></View>
        <Switch value={Boolean(switches[index])} onValueChange={() => toggle(index)} trackColor={{ true: "#5EA23F", false: "#CFD6D2" }} />
      </View>)}</View>
      <View style={styles.save}><Button label="Сохранить политику" variant="primary" icon="save-outline" onPress={() => { void save(); }} /></View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 18, paddingBottom: 40 },
  roles: { gap: 8, paddingHorizontal: 20 },
  role: { paddingHorizontal: 15, paddingVertical: 9, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.pill },
  roleActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  roleText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  roleTextActive: { color: colors.surface, fontWeight: "700" },
  counter: { marginTop: 16, marginBottom: 10, marginHorizontal: 20, color: colors.muted, fontSize: 13 },
  list: { marginHorizontal: 20, paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  subtitle: { marginTop: 2, color: colors.subtle, fontSize: 12 },
  save: { marginTop: 18, marginHorizontal: 20 }
});
