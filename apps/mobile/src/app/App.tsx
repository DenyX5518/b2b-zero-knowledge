import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useMobileStore, type Route } from "./model/useMobileStore";
import { UnlockSheet } from "../features/unlock-vault/ui/UnlockSheet";
import { AccessPage } from "../pages/access/ui/AccessPage";
import { AuditPage } from "../pages/audit/ui/AuditPage";
import { ChatsPage } from "../pages/chats/ui/ChatsPage";
import { ConversationPage } from "../pages/conversation/ui/ConversationPage";
import { CryptoPage } from "../pages/crypto/ui/CryptoPage";
import { DocumentPage } from "../pages/document/ui/DocumentPage";
import { DocumentsPage } from "../pages/documents/ui/DocumentsPage";
import { HomePage } from "../pages/home/ui/HomePage";
import { InfrastructurePage } from "../pages/infrastructure/ui/InfrastructurePage";
import { NewDocumentPage } from "../pages/new-document/ui/NewDocumentPage";
import { SecurityPage } from "../pages/security/ui/SecurityPage";
import { ServerViewPage } from "../pages/server-view/ui/ServerViewPage";
import { TeamPage } from "../pages/team/ui/TeamPage";
import { colors } from "../shared/theme/theme";
import { Toasts } from "../shared/ui/Toasts";
import { BottomTabs } from "../widgets/bottom-tabs/ui/BottomTabs";

function RouteScreen({ route }: { route: Route }) {
  switch (route.name) {
    case "conversation": return <ConversationPage roomId={route.roomId} />;
    case "document": return <DocumentPage documentId={route.documentId} />;
    case "new-document": return <NewDocumentPage />;
    case "crypto": return <CryptoPage />;
    case "audit": return <AuditPage />;
    case "infrastructure": return <InfrastructurePage />;
    case "team": return <TeamPage />;
    case "access": return <AccessPage />;
    case "server": return <ServerViewPage />;
  }
}

function MobileShell() {
  const activeTab = useMobileStore((state) => state.activeTab);
  const route = useMobileStore((state) => state.route);

  if (route) return <SafeAreaView edges={["top", "bottom"]} style={styles.routeSafe}><RouteScreen route={route} /></SafeAreaView>;

  return <SafeAreaView edges={["top"]} style={styles.safe}>
    <View style={styles.page}>
      {activeTab === "home" && <HomePage />}
      {activeTab === "chats" && <ChatsPage />}
      {activeTab === "documents" && <DocumentsPage />}
      {activeTab === "security" && <SecurityPage />}
    </View>
    <BottomTabs />
  </SafeAreaView>;
}

export default function App() {
  useEffect(() => {
    void useMobileStore.getState().init();
    // iOS замораживает сокеты и таймеры в фоне: при возврате обновляем токен и догружаем сообщения.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void useMobileStore.getState().resume();
    });
    return () => subscription.remove();
  }, []);

  return <SafeAreaProvider>
    <StatusBar style="dark" />
    <MobileShell />
    <Toasts />
    <UnlockSheet />
  </SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  routeSafe: { flex: 1, backgroundColor: colors.surface },
  page: { flex: 1 }
});
