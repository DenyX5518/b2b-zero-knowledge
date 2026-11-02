import type { Ionicons } from "@expo/vector-icons";
import type { DocumentItem } from "../model/demoData";

export const documentIcons: Record<DocumentItem["kind"], keyof typeof Ionicons.glyphMap> = {
  doc: "document-text-outline",
  sheet: "grid-outline",
  pdf: "reader-outline"
};
