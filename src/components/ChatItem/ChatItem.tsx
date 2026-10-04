import type { Chat } from '../../data/chats';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { IconFavorites } from '../icons';
import './ChatItem.css';

interface ChatItemProps {
  chat: Chat;
  onClick?: (chat: Chat) => void;
}

export function ChatItem({ chat, onClick }: ChatItemProps) {
  return (
    <li className="chat-item">
      <button type="button" className="chat-item__button" onClick={() => onClick?.(chat)}>
        {chat.favorites ? (
          <Avatar icon={<IconFavorites />} />
        ) : (
          <Avatar src={chat.avatar} alt="" online={chat.online} />
        )}

        <span className="chat-item__body">
          <span className="chat-item__row">
            <span className="chat-item__name">{chat.name}</span>
            <span className="chat-item__time">{chat.time}</span>
          </span>
          <span className="chat-item__row">
            <span className="chat-item__preview">{chat.lastMessage}</span>
            <Badge count={chat.unread} />
          </span>
        </span>
      </button>
    </li>
  );
}
