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
    unread: store.unread,
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
    updateDocument: store.updateDocument,
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

  const unreadTotal = Object.values(state.unread).reduce((sum, count) => sum + count, 0);

  let page;
  if (route === "overview") page = <OverviewPage unlocked={state.unlocked} onUnlock={openUnlock} onServerView={openServerView} navigate={navigate} />;
  else if (route === "chats") page = <ChatsPage unlocked={state.unlocked} onUnlock={openUnlock} messages={state.messages} unread={state.unread} selectedRoom={state.selectedRoom} setSelectedRoom={actions.setSelectedRoom} sendMessage={actions.sendMessage} realtimeState={state.realtimeState} />;
  else if (route === "documents") page = <DocumentsPage unlocked={state.unlocked} onUnlock={openUnlock} documents={state.documents} onOpen={actions.openDocument} onNew={() => actions.openModal("new-document")} />;
  else if (route === "team") page = <TeamPage onDevices={() => actions.toast("Доверенные устройства", state.backendSession ? "Веб-браузер и iPhone одобрены администратором; реестр доступен в API /devices." : "Откройте backend-сессию, чтобы увидеть live-реестр устройств.")} onInvite={() => actions.toast("Приглашение подготовлено", "В пилоте сотрудник добавляется через IdP заказчика и одобрение устройства.")} />;
  else if (route === "access") page = <AccessPage onSave={(role) => actions.toast("Политика сохранена", `Роль «${role}» обновлена; изменение записано в audit log.`)} />;
  else if (route === "audit") page = <AuditPage audit={state.audit} onVerify={actions.verifyAudit} />;
  else if (route === "crypto") page = <CryptoPage unlocked={state.unlocked} onUnlock={openUnlock} approvals={state.approvals} onApprove={actions.toggleApproval} onRecover={actions.recoverKey} />;
  else if (route === "infrastructure") page = <InfrastructurePage status={state.backendStatus} session={state.backendSession} unlocked={state.unlocked} realtimeState={state.realtimeState} onCheck={() => actions.checkBackend()} onLogin={() => actions.demoLogin()} onPasskey={actions.passkeyLogin} onRotate={() => actions.rotateSession()} onLogout={actions.logout} navigate={navigate} />;
  else page = <HowToPage navigate={navigate} />;

  return <>
    <div className="app-shell">
      <Sidebar route={route} navigate={navigate} mobileOpen={state.mobileOpen} setMobileOpen={actions.setMobileOpen} onServerView={openServerView} unreadTotal={unreadTotal} unlocked={state.unlocked} />
      <section className="workspace">
        <Topbar route={route} unlocked={state.unlocked} realtimeState={state.realtimeState} onVault={state.unlocked ? actions.lock : openUnlock} onMenu={() => actions.setMobileOpen(true)} onHelp={() => navigate("how-to")} onSync={() => navigate("infrastructure")} />
        <main className="content" tabIndex="-1">{page}</main>
      </section>
    </div>
    {state.mobileOpen && <div className="mobile-backdrop show" onClick={() => actions.setMobileOpen(false)} />}
    {state.modal?.type === "unlock" && <UnlockModal onClose={actions.closeModal} onUnlock={actions.unlock} />}
    {state.modal?.type === "server" && <ServerViewModal onClose={actions.closeModal} />}
    {state.modal?.type === "new-document" && <NewDocumentModal onClose={actions.closeModal} onCreate={actions.createDocument} />}
    {state.modal?.type === "document" && <DocumentViewer key={state.modal.document.id} document={state.modal.document} onClose={actions.closeModal} onSave={actions.updateDocument} />}
    <Toasts items={state.toasts} />
  </>;
}
