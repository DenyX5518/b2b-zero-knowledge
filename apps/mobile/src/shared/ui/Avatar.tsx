import { StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/theme";

const backgrounds = {
  green: colors.tealSoft,
  blue: colors.blueSoft,
  amber: colors.amberSoft,
  dark: colors.dark,
  lime: colors.lime
} as const;

const foregrounds = {
  green: colors.teal,
  blue: colors.blue,
  amber: colors.amber,
  dark: colors.lime,
  lime: colors.dark
} as const;

export function Avatar({ initials, tone = "green", size = 48, square = false }: { initials: string; tone?: keyof typeof backgrounds; size?: number; square?: boolean }) {
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: square ? size * 0.3 : size / 2, backgroundColor: backgrounds[tone] }]}>
    <Text style={[styles.text, { color: foregrounds[tone], fontSize: Math.max(11, Math.round(size * 0.3)) }]}>{initials}</Text>
  </View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "800", letterSpacing: 0.2 }
});
