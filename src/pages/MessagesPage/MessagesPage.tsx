import { useMemo, useState } from 'react';
import { markRead, useChats } from '../../data/chatStore';
import { Avatar } from '../../components/Avatar/Avatar';
import { ChatItem } from '../../components/ChatItem/ChatItem';
import { Chip } from '../../components/Chip/Chip';
import { IconBell, IconPlus } from '../../components/icons';
import { SearchField } from '../../components/SearchField/SearchField';
import {
  CATEGORIES,
  CURRENT_USER,
  type Chat,
  type ChatCategory,
} from '../../data/chats';
import { navigate } from '../../router';
import './MessagesPage.css';

type Filter = 'all' | ChatCategory;

export function MessagesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const chats = useChats();

  // Счётчик чипса = число непрочитанных ЧАТОВ в нём (не сообщений).
  // «Все» считает и «Избранное»; категории — только свои чаты. При нуле кружок скрыт.
  const countOf = (id: Filter) =>
    chats.filter((c) => c.unread > 0 && (id === 'all' || (!c.favorites && c.category === id)))
      .length;

  // Открытие чата помечает его прочитанным и ведёт в переписку
  const openChat = (chat: Chat) => {
    markRead(chat.id);
    navigate(`/chat/${chat.id}`);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((chat) => {
      if (filter !== 'all' && (chat.favorites || chat.category !== filter)) {
        return false;
      }
      if (!q) return true;
      return (
        chat.name.toLowerCase().includes(q) ||
        chat.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [chats, query, filter]);

  return (
    <section className="messages">
      <header className="messages__header">
        <div className="messages__top">
          <button type="button" className="messages__profile" aria-label="Профиль">
            <Avatar src={CURRENT_USER.avatar} size={40} />
          </button>
          <h1 className="messages__title">Сообщения</h1>
          <button
            type="button"
            className="messages__bell"
            aria-label="События"
            onClick={() => navigate('/events')}
          >
            <IconBell />
          </button>
        </div>

        <SearchField value={query} onChange={setQuery} placeholder="Поиск диалогов..." />

        <div className="messages__chips" role="group" aria-label="Фильтр диалогов">
          <Chip iconOnly ariaLabel="Добавить категорию">
            <IconPlus />
          </Chip>
          <Chip active={filter === 'all'} count={countOf('all')} onClick={() => setFilter('all')}>
            Все
          </Chip>
          {CATEGORIES.map(({ id, label }) => (
            <Chip
              key={id}
              active={filter === id}
              count={countOf(id)}
              onClick={() => setFilter(id)}
            >
              {label}
            </Chip>
          ))}
        </div>
      </header>

      {visible.length > 0 ? (
        <ul className="messages__list">
          {visible.map((chat) => (
            <ChatItem key={chat.id} chat={chat} onClick={openChat} />
          ))}
        </ul>
      ) : (
        <p className="messages__empty">Ничего не найдено</p>
      )}

      <button type="button" className="messages__fab" aria-label="Новый диалог">
        <IconPlus />
      </button>
    </section>
  );
}
