import { useState } from "react";
import { MessageBubble } from "../../../entities/message/ui/MessageBubble.jsx";
import { rooms } from "../../../shared/model/demo-data.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { LockedGate } from "../../../shared/ui/LockedGate.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

export function ChatsPage({ unlocked, onUnlock, messages, selectedRoom, setSelectedRoom, sendMessage, realtimeState }) {
  const [draft, setDraft] = useState("");
  if (!unlocked) return <div className="view"><PageHeading eyebrow="ЗАЩИЩЁННЫЕ КОММУНИКАЦИИ" title="Сообщения" description="Сервер маршрутизирует только ciphertext." /><LockedGate feature="Сообщения" onUnlock={onUnlock} /></div>;
  const active = rooms.find((room) => room.id === selectedRoom) || rooms[0];
  const submit = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  };
  return <div className="view chat-view">
    <PageHeading eyebrow="ЗАЩИЩЁННЫЕ КОММУНИКАЦИИ" title="Сообщения" description="Plaintext существует только на доверенных устройствах участников." />
    <section className="chat-shell">
      <aside className="room-list"><div className="room-list-head"><strong>Комнаты</strong><button className="icon-button"><Icon name="plus" /></button></div>{rooms.map((room) => <button className={`room-item ${room.id === selectedRoom ? "active" : ""}`} onClick={() => setSelectedRoom(room.id)} key={room.id}><span className="room-avatar">{room.initials}</span><span className="room-copy"><strong>{room.name}</strong><small>{room.preview}</small></span><span className="room-meta"><time>{room.time}</time>{room.unread > 0 && <b>{room.unread}</b>}</span></button>)}</aside>
      <section className="conversation"><header className="conversation-head"><div><strong>{active.name}</strong><small>{active.members} участников · ключ эпохи 4</small></div><span className={`status-pill ${realtimeState === "connected" ? "green" : "gray"}`}>{realtimeState}</span></header><div className="message-scroll"><div className="date-separator">Сегодня</div>{messages.filter((message) => message.room === active.id).map((message) => <MessageBubble message={message} key={message.id} />)}</div><form className="composer" onSubmit={submit}><textarea rows="1" maxLength="2000" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Напишите защищённое сообщение…" /><button className="send-button" type="submit"><Icon name="send" /></button></form></section>
      <aside className="chat-details"><h3 className="details-title">О комнате</h3><div className="crypto-badge"><div className="crypto-badge-head"><Icon name="shield" /> Сквозное шифрование</div><p>Ключ комнаты доступен только доверенным устройствам участников.</p></div></aside>
    </section>
  </div>;
}
