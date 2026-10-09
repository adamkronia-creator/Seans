import type { Chat } from '../../data/chats';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { IconFavorites } from '../icons';
import './ChatItem.css';

// Размер аватара в списке чатов (см. --size-avatar-lg в tokens.css)
const AVATAR_SIZE = 48;

interface ChatItemProps {
  chat: Chat;
  onClick?: (chat: Chat) => void;
}

export function ChatItem({ chat, onClick }: ChatItemProps) {
  return (
    <li className={`chat-item${chat.unread > 0 ? ' chat-item--unread' : ''}`}>
      <button type="button" className="chat-item__button" onClick={() => onClick?.(chat)}>
        {chat.favorites ? (
          <Avatar icon={<IconFavorites />} size={AVATAR_SIZE} />
        ) : (
          <Avatar src={chat.avatar} alt="" online={chat.online} size={AVATAR_SIZE} />
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
