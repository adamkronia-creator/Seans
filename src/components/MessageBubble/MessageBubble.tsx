import type { Message } from '../../data/messages';
import { IconReadTicks } from '../icons';
import './MessageBubble.css';

function Meta({ message }: { message: Message }) {
  return (
    <>
      <span className="bubble__time">{message.time}</span>
      {message.from === 'me' && <IconReadTicks className="bubble__ticks" aria-hidden="true" />}
    </>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  return (
    <li className={`bubble bubble--${message.from === 'me' ? 'out' : 'in'}`}>
      {message.text}
      {/* Невидимая копия резервирует место под время в конце последней строки */}
      <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
        <Meta message={message} />
      </span>
      <span className="bubble__meta">
        <Meta message={message} />
      </span>
    </li>
  );
}
