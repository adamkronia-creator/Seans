import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useChats } from '../../data/chatStore';
import { roleOf } from '../../data/roles';
import { useBackHandler } from '../../utils/backHandler';
import { Avatar } from '../Avatar/Avatar';
import { IconBackMk, IconBookmarkMk, IconSearchMk } from '../ChatItem/ChatIcons';
import './ForwardSheet.css';

interface ForwardSheetProps {
  /** Чаты, куда переслать, выбраны: кнопка «Отправить» */
  onSend: (chatIds: string[]) => void;
  onClose: () => void;
}

/** «Переслать…»: отдельный экран, как в Telegram. Вверху «назад» и поиск, ниже чаты с выбором (можно отметить несколько), внизу «Отправить» */
export function ForwardSheet({ onSend, onClose }: ForwardSheetProps) {
  const all = useChats().filter((c) => !c.archived);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  useBackHandler(true, onClose);
  const q = query.trim().toLowerCase();
  const chats = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
  const toggle = (id: string) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return createPortal(
    <div className="fwd-page" data-pm role="dialog" aria-modal="true" aria-label="Переслать">
      <header className="fwd-page__header">
        <button type="button" className="fwd-page__back" aria-label="Назад" onClick={onClose}>
          <IconBackMk />
        </button>
        <h2 className="fwd-page__title">Переслать…</h2>
      </header>
      <label className="fwd-page__search">
        <IconSearchMk aria-hidden="true" />
        <input type="search" placeholder="Поиск чатов" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Поиск чатов" autoComplete="off" />
      </label>
      <ul className="fwd-page__list" role="group" aria-label="Кому переслать">
        {chats.map((chat) => {
          const on = picked.includes(chat.id);
          return (
            <li key={chat.id}>
              <button type="button" role="checkbox" aria-checked={on} className="fwd__row" onClick={() => toggle(chat.id)}>
                {chat.favorites ? <Avatar icon={<IconBookmarkMk />} size={48} /> : <Avatar src={chat.avatar} alt="" size={48} />}
                <span className="fwd__text">
                  <span className="fwd__name">{chat.favorites ? 'Избранное' : chat.name}</span>
                  <span className="fwd__role">{chat.favorites ? 'Сохранить на память' : roleOf(chat)}</span>
                </span>
                <span className={`fwd__mark${on ? ' fwd__mark--on' : ''}`} aria-hidden="true" />
              </button>
            </li>
          );
        })}
        {chats.length === 0 && <li className="fwd-page__empty">Ничего не найдено</li>}
      </ul>
      {picked.length > 0 && (
        <div className="fwd-page__bar">
          <button type="button" className="fwd-page__send" onClick={() => onSend(picked)}>
            Отправить ({picked.length})
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
