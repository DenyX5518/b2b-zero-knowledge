import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "../../../entities/message/ui/MessageBubble.jsx";
import { REALTIME_LABELS } from "../../../shared/config/constants.js";
import { rooms } from "../../../shared/model/demo-data.js";
import { Icon } from "../../../shared/ui/Icon.jsx";
import { LockedGate } from "../../../shared/ui/LockedGate.jsx";
import { PageHeading } from "../../../shared/ui/PageHeading.jsx";

function roomPreview(room, last) {
  if (!last) return "Сообщений пока нет";
  if (!room.group) return last.self ? `Вы: ${last.text}` : last.text;
  return `${last.self ? "Вы" : last.author.split(" ")[0]}: ${last.text}`;
}

export function ChatsPage({ unlocked, onUnlock, messages, unread, selectedRoom, setSelectedRoom, sendMessage, realtimeState }) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const scrollRef = useRef(null);
  const active = rooms.find((room) => room.id === selectedRoom) || rooms[0];
  const roomMessages = messages.filter((message) => message.room === active.id);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [roomMessages.length, active.id, unlocked]);

  if (!unlocked) return <div className="view"><PageHeading eyebrow="Защищённые коммуникации" title="Сообщения" description="Сервер маршрутизирует только ciphertext." /><LockedGate feature="Сообщения" onUnlock={onUnlock} /></div>;

  const needle = query.trim().toLowerCase();
  const summaries = rooms
    .map((room) => ({ ...room, last: messages.filter((message) => message.room === room.id).at(-1) }))
    .filter((room) => !needle || room.name.toLowerCase().includes(needle) || messages.some((message) => message.room === room.id && message.text.toLowerCase().includes(needle)));
  const [realtimeLabel, realtimeTone] = REALTIME_LABELS[realtimeState] || REALTIME_LABELS.offline;

  const submit = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
  };

  return <div className="view chat-view">
    <PageHeading eyebrow="Защищённые коммуникации" title="Сообщения" description="Plaintext существует только на доверенных устройствах участников." />
    <section className="chat-shell">
      <aside className="room-list">
        <div className="room-list-head">
          <strong>Комнаты</strong>
          <span className={`status-pill ${realtimeTone}`}><i className="pill-dot" />{realtimeLabel}</span>
        </div>
        <label className="room-search"><Icon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по комнатам и сообщениям" /></label>
        <div className="room-items">
          {summaries.map((room) => <button className={`room-item ${room.id === active.id ? "active" : ""}`} onClick={() => setSelectedRoom(room.id)} key={room.id}>
            <span className={`room-avatar ${room.group ? "" : "private"}`}>{room.initials}</span>
            <span className="room-copy"><strong>{room.name}</strong><small>{roomPreview(room, room.last)}</small></span>
            <span className="room-meta"><time>{room.last?.time || ""}</time>{unread[room.id] > 0 && room.id !== active.id ? <b className="unread">{unread[room.id]}</b> : <i />}</span>
          </button>)}
          {!summaries.length && <p className="room-empty">Ничего не найдено</p>}
        </div>
      </aside>
      <section className="conversation">
        <header className="conversation-head">
          <span className={`room-avatar ${active.group ? "" : "private"}`}>{active.initials}</span>
          <div><strong>{active.name}</strong><small>{active.members} участников · ключ эпохи 1 · XChaCha20-Poly1305</small></div>
        </header>
        <div className="message-scroll" ref={scrollRef}>
          <div className="date-separator">Сегодня</div>
          {roomMessages.map((message) => <MessageBubble message={message} key={message.id} />)}
          {!roomMessages.length && <p className="conversation-empty">Напишите первое сообщение — оно будет зашифровано на этом устройстве.</p>}
        </div>
        <form className="composer" onSubmit={submit}>
          <textarea rows="1" maxLength="2000" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder="Напишите защищённое сообщение…" />
          <button className="send-button" type="submit" disabled={!draft.trim()} aria-label="Отправить"><Icon name="send" /></button>
        </form>
      </section>
      <aside className="chat-details">
        <h3 className="details-title">О комнате</h3>
        <div className="crypto-badge"><div className="crypto-badge-head"><Icon name="shield" /> Сквозное шифрование</div><p>Ключ комнаты доступен только доверенным устройствам участников.</p></div>
        <dl className="details-list">
          <div><dt>Участники</dt><dd>{active.members}</dd></div>
          <div><dt>Сообщений</dt><dd>{roomMessages.length}</dd></div>
          <div><dt>Доставка</dt><dd>{realtimeLabel}</dd></div>
        </dl>
        <p className="details-note">{realtimeState === "connected" ? "Новые сообщения сразу уходят на backend и появляются на других устройствах, включая iPhone." : "Backend не подключён: сообщения копятся в зашифрованной очереди и отправятся автоматически после подключения."}</p>
      </aside>
    </section>
  </div>;
}
