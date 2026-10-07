import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { EMOJI } from '../../data/emoji';
import { IconClose, IconReply } from '../ChatParts/ChatIcons';
import { IconAttach, IconEmoji, IconMicrophone, IconSend } from '../icons';
import './MessageInput.css';

interface MessageInputProps {
  onSend: (text: string) => void;
  /** Высота панели поменялась (открылась панель эмодзи): ленту нужно удержать внизу */
  onLayoutChange?: () => void;
  /** Сообщение, на которое пишется ответ */
  reply?: { name: string; text: string };
  onCancelReply?: () => void;
}

export function MessageInput({ onSend, onLayoutChange, reply, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  // Последняя позиция курсора в поле: нужна, чтобы вставить эмодзи, когда поле не в фокусе
  const savedRange = useRef<Range | null>(null);

  const hasText = text.trim().length > 0;

  // Выбран ответ: фокус в поле, ленту удерживаем внизу после появления плашки
  useEffect(() => {
    if (!reply) return;
    inputRef.current?.focus();
    requestAnimationFrame(() => onLayoutChange?.());
  }, [reply]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPanel = (open: boolean) => {
    setEmojiOpen(open);
    // Лента подстраивается под новую высоту после перерисовки
    requestAnimationFrame(() => onLayoutChange?.());
  };

  const saveRange = () => {
    const sel = window.getSelection();
    const el = inputRef.current;
    if (sel && sel.rangeCount > 0 && el?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const readText = () => (inputRef.current?.innerText ?? '').replace(/\u00a0/g, ' ').replace(/\n$/, '');

  const submit = () => {
    if (!hasText) return;
    onSend(text.trim());
    setText('');
    savedRange.current = null;
    if (inputRef.current) inputRef.current.textContent = '';
    // Фокус остаётся в поле, чтобы можно было сразу писать дальше
    inputRef.current?.focus();
    if (emojiOpen) setPanel(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Enter отправляет, Shift+Enter переносит строку
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Вставляем только текст, переносы строк сохраняются
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
    document.execCommand('insertText', false, plain);
  };

  // Эмодзи вставляется в место курсора (в конец, если курсора ещё не было)
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) return;
    const range = savedRange.current ?? (() => {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      return r;
    })();
    range.deleteContents();
    const node = document.createTextNode(emoji);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    savedRange.current = range;
    setText(readText());
  };

  const toggleEmoji = () => {
    if (!emojiOpen) inputRef.current?.blur(); // на телефоне прячет клавиатуру
    setPanel(!emojiOpen);
  };

  return (
    <div className="composer-wrap">
      {reply && (
        <div className="reply-bar">
          <IconReply className="reply-bar__icon" />
          <div className="reply-bar__text">
            <span className="reply-bar__name">Ответ: {reply.name}</span>
            <span className="reply-bar__quote">{reply.text}</span>
          </div>
          <button type="button" className="reply-bar__close" aria-label="Отменить ответ" onClick={onCancelReply}>
            <IconClose />
          </button>
        </div>
      )}
      {/* Не <form> и не <input>: иначе телефон предлагает пароли, карты и адреса */}
      <div className={`composer${emojiOpen ? ' composer--panel' : ''}`}>
        <button type="button" className="composer__round" aria-label="Прикрепить">
          <IconAttach />
        </button>

        <div className="composer__field">
          <div
            ref={inputRef}
            className="composer__input"
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            role="textbox"
            aria-label="Сообщение"
            aria-multiline="true"
            data-placeholder="Написать сообщение..."
            inputMode="text"
            enterKeyHint="send"
            autoCapitalize="sentences"
            spellCheck
            onInput={(e) => {
              if (!e.currentTarget.textContent) e.currentTarget.innerHTML = '';
              setText(readText());
              saveRange();
              // Поле выросло или уменьшилось: ленту нужно удержать внизу
              requestAnimationFrame(() => onLayoutChange?.());
            }}
            onKeyDown={onKeyDown}
            onKeyUp={saveRange}
            onPointerUp={saveRange}
            onBlur={saveRange}
            onPaste={onPaste}
            onFocus={() => emojiOpen && setPanel(false)}
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
        </div>

        {hasText ? (
          <button type="button" className="composer__round composer__round--send" aria-label="Отправить" onClick={submit} onMouseDown={(e) => e.preventDefault()}>
            <IconSend />
          </button>
        ) : (
          <button type="button" className="composer__round" aria-label="Голосовое сообщение">
            <IconMicrophone />
          </button>
        )}
      </div>

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
