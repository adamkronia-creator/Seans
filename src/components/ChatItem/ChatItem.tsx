import type { Chat } from '../../data/chats';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { IconFavorites } from '../icons';
import './ChatItem.css';

interface ChatItemProps {
  chat: Chat;
  onClick?: (chat: Chat) => void;
}

/**
 * Строка списка чатов (ChatListItem системы мессенджера): аватар с присутствием, имя, превью, время и счётчик.
 * Размер аватара, поля и высота строки заданы токенами сетки 4 в ChatItem.css.
 */
export function ChatItem({ chat, onClick }: ChatItemProps) {
  const pinned = chat.favorites === true;
  const cls = ['chat-item', chat.unread > 0 && 'chat-item--unread', pinned && 'chat-item--pinned'].filter(Boolean).join(' ');
  return (
    <li className={cls}>
      <button type="button" className="chat-item__button" onClick={() => onClick?.(chat)}>
        {pinned && <span className="visually-hidden">Закреплённый чат. </span>}
        {pinned ? (
          <Avatar icon={<IconFavorites />} />
        ) : (
          <Avatar src={chat.avatar} alt="" presence={chat.online ? 'online' : 'offline'} />
        )}

        <span className="chat-item__body">
          <span className="chat-item__row chat-item__row--top">
            <span className="chat-item__name">{chat.name}</span>
            <span className="chat-item__time">{chat.time}</span>
          </span>
          <span className="chat-item__row chat-item__row--bottom">
            <span className="chat-item__preview">{chat.lastMessage}</span>
            <Badge count={chat.unread} ariaLabel={`Непрочитанных: ${chat.unread}`} />
          </span>
        </span>
      </button>
    </li>
  );
}
