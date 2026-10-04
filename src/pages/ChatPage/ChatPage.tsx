import { Fragment, useEffect, useRef } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import {
  IconBack,
  IconFavorites,
  IconSettings,
  IconTabLibrary,
  IconTabMessages,
  IconTabNotes,
  IconTabPractices,
  IconTabSessions,
  IconTabTests,
} from '../../components/icons';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { sendMessage, useChats, useMessages } from '../../data/chatStore';
import { goBack } from '../../router';
import './ChatPage.css';

// Разделы карточки собеседника; открыт «Сообщения», остальные пока без экранов
const SECTIONS = [
  { id: 'sessions', label: 'Сеансы', Icon: IconTabSessions },
  { id: 'messages', label: 'Сообщения', Icon: IconTabMessages },
  { id: 'tests', label: 'Тесты', Icon: IconTabTests },
  { id: 'practices', label: 'Практики', Icon: IconTabPractices },
  { id: 'notes', label: 'Заметки', Icon: IconTabNotes },
  { id: 'library', label: 'Материалы', Icon: IconTabLibrary },
];

export function ChatPage({ chatId }: { chatId: string }) {
  const chat = useChats().find((c) => c.id === chatId);
  const groups = useMessages(chatId);
  const listRef = useRef<HTMLUListElement>(null);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Переписка открывается внизу, у последних сообщений; новое сообщение тоже прокручивает вниз
  const messageCount = groups.reduce((n, g) => n + g.messages.length, 0);
  useEffect(scrollToBottom, [chatId, messageCount]);

  if (!chat) {
    return (
      <section className="chat">
        <p className="chat__empty">Чат не найден</p>
      </section>
    );
  }

  return (
    <section className="chat">
      <header className="chat__header">
        <div className="chat__top">
          <button type="button" className="chat__icon-button" aria-label="Назад" onClick={() => goBack()}>
            <IconBack />
          </button>
          <div className="chat__peer">
            {chat.favorites ? (
              <Avatar icon={<IconFavorites />} size={40} />
            ) : (
              <Avatar src={chat.avatar} alt="" size={40} online={chat.online} />
            )}
            <div className="chat__who">
              <h1 className="chat__name">{chat.name}</h1>
              {!chat.favorites && (
                <p className="chat__status">{chat.online ? 'в сети' : 'был(а) недавно'}</p>
              )}
            </div>
          </div>
          <button type="button" className="chat__icon-button" aria-label="Настройки чата">
            <IconSettings />
          </button>
        </div>

        <nav className="chat__tabs" aria-label="Разделы">
          {SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`chat__tab${id === 'messages' ? ' chat__tab--active' : ''}`}
              aria-label={label}
              aria-current={id === 'messages' ? 'page' : undefined}
            >
              <Icon />
            </button>
          ))}
        </nav>
      </header>

      <ul className="chat__messages" ref={listRef}>
        {groups.map((group) => (
          <Fragment key={group.label}>
            <li className="chat__day">
              <span>{group.label}</span>
            </li>
            {group.messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </Fragment>
        ))}
      </ul>

      <MessageInput onSend={(text) => sendMessage(chatId, text)} onLayoutChange={scrollToBottom} />
    </section>
  );
}
