import { useRef, useState, type FormEvent } from 'react';
import { EMOJI } from '../../data/emoji';
import { IconAttach, IconEmoji, IconMicrophone, IconSend } from '../icons';
import './MessageInput.css';

interface MessageInputProps {
  onSend: (text: string) => void;
  /** Высота панели поменялась (открылась панель эмодзи): ленту нужно удержать внизу */
  onLayoutChange?: () => void;
}

export function MessageInput({ onSend, onLayoutChange }: MessageInputProps) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasText = text.trim().length > 0;

  const setPanel = (open: boolean) => {
    setEmojiOpen(open);
    // Лента подстраивается под новую высоту после перерисовки
    requestAnimationFrame(() => onLayoutChange?.());
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!hasText) return;
    onSend(text);
    setText('');
    // Фокус остаётся в поле, чтобы можно было сразу писать дальше
    inputRef.current?.focus();
    if (emojiOpen) setPanel(false);
  };

  // Эмодзи вставляется в место курсора (позиция сохраняется, даже когда поле не в фокусе)
  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      const pos = start + emoji.length;
      input?.setSelectionRange(pos, pos);
    });
  };

  const toggleEmoji = () => {
    if (!emojiOpen) inputRef.current?.blur(); // на телефоне прячет клавиатуру
    setPanel(!emojiOpen);
  };

  return (
    <div className="composer-wrap">
      <form
        className={`composer${emojiOpen ? ' composer--panel' : ''}`}
        onSubmit={submit}
        autoComplete="off"
        // Подсказки менеджеров паролей и автозаполнения не нужны в чате
        data-form-type="other"
      >
        <button type="button" className="composer__round" aria-label="Прикрепить">
          <IconAttach />
        </button>

        <label className="composer__field">
          <input
            ref={inputRef}
            className="composer__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => emojiOpen && setPanel(false)}
            placeholder="Написать сообщение..."
            type="text"
            name="chat-message"
            id="chat-message"
            inputMode="text"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            aria-label="Сообщение"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
          />
          <button
            type="button"
            className={`composer__emoji${emojiOpen ? ' composer__emoji--active' : ''}`}
            aria-label="Эмодзи"
            aria-expanded={emojiOpen}
            onClick={toggleEmoji}
          >
            <IconEmoji />
          </button>
        </label>

        {hasText ? (
          <button type="submit" className="composer__round composer__round--send" aria-label="Отправить">
            <IconSend />
          </button>
        ) : (
          <button type="button" className="composer__round" aria-label="Голосовое сообщение">
            <IconMicrophone />
          </button>
        )}
      </form>

      {emojiOpen && (
        <div className="emoji-panel" role="group" aria-label="Эмодзи">
          {EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-panel__item"
              onClick={() => insertEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
