import { useState } from 'react';
import { useChats } from '../../data/chatStore';
import { roleOf } from '../../data/roles';
import { Avatar } from '../Avatar/Avatar';
import { IconBookmarkMk } from '../ChatItem/ChatIcons';
import { Frame } from '../Frame/Frame';
import './ForwardSheet.css';

interface ForwardSheetProps {
  /** Чаты, куда переслать, выбраны: кнопка «Отправить» */
  onSend: (chatIds: string[]) => void;
  onClose: () => void;
}

/** «Переслать»: список чатов с выбором адресатов, можно отметить несколько */
export function ForwardSheet({ onSend, onClose }: ForwardSheetProps) {
  const chats = useChats().filter((c) => !c.archived);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return (
    <Frame
      title="Переслать"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={picked.length === 0} onClick={() => onSend(picked)}>
            Отправить{picked.length > 0 ? ` (${picked.length})` : ''}
          </button>
        </>
      }
    >
      <section className="sheet__card fwd">
        <ul role="group" aria-label="Кому переслать">
          {chats.map((chat) => {
            const on = picked.includes(chat.id);
            return (
              <li key={chat.id}>
                <button type="button" role="checkbox" aria-checked={on} className="fwd__row" onClick={() => toggle(chat.id)}>
                  {chat.favorites ? <Avatar icon={<IconBookmarkMk />} size={40} /> : <Avatar src={chat.avatar} alt="" size={40} />}
                  <span className="fwd__text">
                    <span className="fwd__name">{chat.name}</span>
                    <span className="fwd__role">{chat.favorites ? 'Только для вас' : roleOf(chat)}</span>
                  </span>
                  <span className={`fwd__mark${on ? ' fwd__mark--on' : ''}`} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </Frame>
  );
}
