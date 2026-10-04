import { useMemo, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { ChatItem } from '../../components/ChatItem/ChatItem';
import { Chip } from '../../components/Chip/Chip';
import { IconBell, IconPlus } from '../../components/icons';
import { SearchField } from '../../components/SearchField/SearchField';
import {
  CATEGORIES,
  CHATS,
  CURRENT_USER,
  type ChatCategory,
} from '../../data/chats';
import './MessagesPage.css';

type Filter = 'all' | ChatCategory;

export function MessagesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Счётчики чипсов считаются по обычным чатам, «Избранное» не входит
  const regularChats = useMemo(() => CHATS.filter((c) => !c.favorites), []);
  const countOf = (id: Filter) =>
    id === 'all'
      ? regularChats.length
      : regularChats.filter((c) => c.category === id).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHATS.filter((chat) => {
      if (filter !== 'all' && (chat.favorites || chat.category !== filter)) {
        return false;
      }
      if (!q) return true;
      return (
        chat.name.toLowerCase().includes(q) ||
        chat.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [query, filter]);

  return (
    <section className="messages">
      <header className="messages__header">
        <div className="messages__top">
          <button type="button" className="messages__profile" aria-label="Профиль">
            <Avatar src={CURRENT_USER.avatar} size={34} />
          </button>
          <h1 className="messages__title">Сообщения</h1>
          <button type="button" className="messages__bell" aria-label="Уведомления">
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
            <ChatItem key={chat.id} chat={chat} />
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
