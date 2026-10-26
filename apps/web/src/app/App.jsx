import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useKonturStore } from "./model/useKonturStore.js";
import { UnlockModal } from "../features/unlock-vault/ui/UnlockModal.jsx";
import { NewDocumentModal } from "../features/manage-document/ui/NewDocumentModal.jsx";
import { DocumentViewer } from "../features/manage-document/ui/DocumentViewer.jsx";
import { ServerViewModal } from "../features/inspect-ciphertext/ui/ServerViewModal.jsx";
import { AccessPage } from "../pages/access/ui/AccessPage.jsx";
import { AuditPage } from "../pages/audit/ui/AuditPage.jsx";
import { ChatsPage } from "../pages/chats/ui/ChatsPage.jsx";
import { CryptoPage } from "../pages/crypto/ui/CryptoPage.jsx";
import { DocumentsPage } from "../pages/documents/ui/DocumentsPage.jsx";
import { HowToPage } from "../pages/how-to/ui/HowToPage.jsx";
import { InfrastructurePage } from "../pages/infrastructure/ui/InfrastructurePage.jsx";
import { OverviewPage } from "../pages/overview/ui/OverviewPage.jsx";
import { TeamPage } from "../pages/team/ui/TeamPage.jsx";
import { useAppRoute } from "../shared/lib/router.js";
import { Toasts } from "../shared/ui/Toasts.jsx";
import { Sidebar } from "../widgets/app-shell/ui/Sidebar.jsx";
import { Topbar } from "../widgets/app-shell/ui/Topbar.jsx";

export default function App() {
  const [route, navigate] = useAppRoute();
  const state = useKonturStore(useShallow((store) => ({
    unlocked: store.unlocked,
    messages: store.messages,
    documents: store.documents,
    audit: store.audit,
    selectedRoom: store.selectedRoom,
    approvals: store.approvals,
    backendStatus: store.backendStatus,
    backendSession: store.backendSession,
    realtimeState: store.realtimeState,
    toasts: store.toasts,
    modal: store.modal,
    mobileOpen: store.mobileOpen
  })));
  const actions = useKonturStore(useShallow((store) => ({
    setMobileOpen: store.setMobileOpen,
    setSelectedRoom: store.setSelectedRoom,
    openModal: store.openModal,
    closeModal: store.closeModal,
    unlock: store.unlock,
    lock: store.lock,
    sendMessage: store.sendMessage,
    createDocument: store.createDocument,
    openDocument: store.openDocument,
    verifyAudit: store.verifyAudit,
    toggleApproval: store.toggleApproval,
    recoverKey: store.recoverKey,
    checkBackend: store.checkBackend,
    demoLogin: store.demoLogin,
    passkeyLogin: store.passkeyLogin,
    rotateSession: store.rotateSession,
    logout: store.logout,
    toast: store.toast
  })));

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") { actions.closeModal(); actions.setMobileOpen(false); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); navigate("how-to"); }
    };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, [actions, navigate]);

  const openUnlock = () => actions.openModal("unlock");
  const openServerView = () => actions.openModal("server");

  let page;
  if (route === "overview") page = <OverviewPage unlocked={state.unlocked} onUnlock={openUnlock} onServerView={openServerView} />;
  else if (route === "chats") page = <ChatsPage unlocked={state.unlocked} onUnlock={openUnlock} messages={state.messages} selectedRoom={state.selectedRoom} setSelectedRoom={actions.setSelectedRoom} sendMessage={actions.sendMessage} realtimeState={state.realtimeState} />;
  else if (route === "documents") page = <DocumentsPage unlocked={state.unlocked} onUnlock={openUnlock} documents={state.documents} onOpen={actions.openDocument} onNew={() => actions.openModal("new-document")} />;
  else if (route === "team") page = <TeamPage onDevices={() => actions.toast("Device registry", state.backendSession ? "Откройте backend API /devices для live registry." : "Сначала откройте backend-сессию.")} />;
  else if (route === "access") page = <AccessPage />;
  else if (route === "audit") page = <AuditPage audit={state.audit} onVerify={actions.verifyAudit} />;
  else if (route === "crypto") page = <CryptoPage unlocked={state.unlocked} onUnlock={openUnlock} approvals={state.approvals} onApprove={actions.toggleApproval} onRecover={actions.recoverKey} />;
  else if (route === "infrastructure") page = <InfrastructurePage status={state.backendStatus} session={state.backendSession} realtimeState={state.realtimeState} onCheck={actions.checkBackend} onLogin={actions.demoLogin} onPasskey={actions.passkeyLogin} onRotate={actions.rotateSession} onLogout={actions.logout} navigate={navigate} />;
  else page = <HowToPage navigate={navigate} />;

  return <>
    <div className="app-shell">
      <Sidebar route={route} navigate={navigate} mobileOpen={state.mobileOpen} setMobileOpen={actions.setMobileOpen} onServerView={openServerView} />
      <section className="workspace">
        <Topbar route={route} unlocked={state.unlocked} onVault={state.unlocked ? actions.lock : openUnlock} onMenu={() => actions.setMobileOpen(true)} onHelp={() => navigate("how-to")} />
        <main className="content" tabIndex="-1">{page}</main>
      </section>
    </div>
    {state.mobileOpen && <div className="mobile-backdrop show" onClick={() => actions.setMobileOpen(false)} />}
    {state.modal?.type === "unlock" && <UnlockModal onClose={actions.closeModal} onUnlock={actions.unlock} />}
    {state.modal?.type === "server" && <ServerViewModal onClose={actions.closeModal} />}
    {state.modal?.type === "new-document" && <NewDocumentModal onClose={actions.closeModal} onCreate={actions.createDocument} />}
    {state.modal?.type === "document" && <DocumentViewer document={state.modal.document} onClose={actions.closeModal} />}
    <Toasts items={state.toasts} />
  </>;
}
