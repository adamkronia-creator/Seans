import { Fragment, useEffect, useRef, useState } from 'react';
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
import { ChatHistory } from '../../components/ChatHistory/ChatHistory';
import { ChatCase } from '../../components/ChatCase/ChatCase';
import { ChatTasks, ChatTests } from '../../components/ChatTests/ChatTests';
import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { sendMessage, useChats, useMessages } from '../../data/chatStore';
import { TestSettings } from '../../components/TestSettings/TestSettings';
import { LIBRARY } from '../../data/library';
import { goBack, navigate } from '../../router';
import './ChatPage.css';

// Разделы карточки собеседника; открыт «Сообщения», остальные пока без экранов
type SectionId = 'sessions' | 'messages' | 'tests' | 'tasks' | 'notes' | 'library';

const SECTIONS: { id: SectionId; label: string; Icon: typeof IconTabSessions }[] = [
  { id: 'sessions', label: 'Сеансы', Icon: IconTabSessions },
  { id: 'messages', label: 'Сообщения', Icon: IconTabMessages },
  { id: 'tests', label: 'Тесты', Icon: IconTabTests },
  { id: 'tasks', label: 'Задания', Icon: IconTabPractices },
  { id: 'notes', label: 'Кейс', Icon: IconTabNotes },
  { id: 'library', label: 'Материалы', Icon: IconTabLibrary },
];

interface ChatPageProps {
  chatId: string;
  /** Открыта настройка этого теста (адрес /chat/<чат>/tests/<тест>) */
  testId?: string;
  /** Нажатие на кнопку нижней панели (панель видна на вкладках кроме «Сообщения») */
  onAppTabChange: (id: TabId) => void;
}

export function ChatPage({ chatId, testId, onAppTabChange }: ChatPageProps) {
  const [section, setSection] = useState<SectionId>('messages');
  // Тесты, задания и кейс пока есть только у Максима
  const hasClientData = chatId === 'maxim';
  const chat = useChats().find((c) => c.id === chatId);
  const groups = useMessages(chatId);
  const listRef = useRef<HTMLUListElement>(null);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Переписка открывается внизу, у последних сообщений; новое сообщение тоже прокручивает вниз
  const messageCount = groups.reduce((n, g) => n + g.messages.length, 0);
  useEffect(scrollToBottom, [chatId, messageCount, section]);

  if (!chat) {
    return (
      <section className="chat">
        <p className="chat__empty">Чат не найден</p>
      </section>
    );
  }

  // Настройка теста заменяет шапку и вкладки чата; снизу нижняя панель приложения, как у вкладки «Тесты»
  const settingsTest = testId ? LIBRARY.find((t) => t.id === testId) : undefined;
  if (settingsTest) {
    return (
      <section className="chat">
        <TestSettings test={settingsTest} chatId={chatId} onBack={() => goBack(`/chat/${chatId}`)} />
        <TabBar active="messages" onChange={onAppTabChange} />
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
              className={`chat__tab${id === section ? ' chat__tab--active' : ''}`}
              aria-label={label}
              aria-current={id === section ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon />
            </button>
          ))}
        </nav>
      </header>

      {section === 'messages' && (
        <>
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
        </>
      )}

      {section === 'tests' && (
        <>
          <ChatTests hasData={hasClientData} onOpenTest={(id) => navigate(`/chat/${chatId}/tests/${id}`)} />
          <TabBar active="messages" onChange={onAppTabChange} />
        </>
      )}

      {section === 'tasks' && (
        <>
          <ChatTasks hasData={hasClientData} />
          <TabBar active="messages" onChange={onAppTabChange} />
        </>
      )}

      {section === 'notes' && (
        <>
          <ChatCase hasData={hasClientData} clientId={chatId} />
          <TabBar active="messages" onChange={onAppTabChange} />
        </>
      )}

      {section === 'library' && (
        <>
          <ChatHistory hasData={hasClientData} />
          <TabBar active="messages" onChange={onAppTabChange} />
        </>
      )}

      {section === 'sessions' && (
        <>
          <p className="chat__empty chat__empty--grow">Раздел в разработке</p>
          <TabBar active="messages" onChange={onAppTabChange} />
        </>
      )}
    </section>
  );
}
