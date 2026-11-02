import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMobileStore } from "../../../app/model/useMobileStore";
import { employees } from "../../../shared/model/demoData";
import { colors, radii } from "../../../shared/theme/theme";
import { Avatar } from "../../../shared/ui/Avatar";
import { StatusPill } from "../../../shared/ui/StatusPill";
import { SubHeader } from "../../../shared/ui/SubHeader";

const summary = [["Всего", "248"], ["Активны сегодня", "192"], ["Требуют внимания", "1"]] as const;

export function TeamPage() {
  const goBack = useMobileStore((state) => state.goBack);
  return <View style={styles.root}>
    <SubHeader title="Сотрудники" subtitle="Учётные записи и доверенные устройства" onBack={goBack} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.summary}>{summary.map(([label, value]) => <View key={label} style={styles.summaryCard}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>)}</View>
      <View style={styles.list}>{employees.map((employee, index) => <View key={employee.email} style={[styles.row, index < employees.length - 1 && styles.border]}>
        <Avatar initials={employee.initials} tone={index === 0 ? "lime" : "green"} size={44} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>{employee.name}</Text>
          <Text numberOfLines={1} style={styles.meta}>{employee.role} · {employee.department}</Text>
          <Text numberOfLines={1} style={styles.devices}>{employee.devices}</Text>
        </View>
        <StatusPill label={employee.warn ? "Проверка" : "Активен"} tone={employee.warn ? "amber" : "green"} />
      </View>)}</View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  summary: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryCard: { flex: 1, padding: 14, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  summaryValue: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  summaryLabel: { marginTop: 3, color: colors.muted, fontSize: 12 },
  list: { paddingHorizontal: 15, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md },
  row: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  border: { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  meta: { marginTop: 3, color: colors.muted, fontSize: 13 },
  devices: { marginTop: 2, color: colors.subtle, fontSize: 12 }
});
