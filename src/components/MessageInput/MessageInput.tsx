import { useState } from 'react';
import { IconAttach, IconEmoji, IconMicrophone } from '../icons';
import './MessageInput.css';

export function MessageInput() {
  const [text, setText] = useState('');

  return (
    <form className="composer" onSubmit={(e) => e.preventDefault()}>
      <button type="button" className="composer__round" aria-label="Прикрепить">
        <IconAttach />
      </button>

      <label className="composer__field">
        <input
          className="composer__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать сообщение..."
        />
        <button type="button" className="composer__emoji" aria-label="Эмодзи">
          <IconEmoji />
        </button>
      </label>

      <button type="button" className="composer__round" aria-label="Голосовое сообщение">
        <IconMicrophone />
      </button>
    </form>
  );
}
