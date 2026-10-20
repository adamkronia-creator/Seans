import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { EmojiPanel } from './EmojiPanel';
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
  /** Подпись пустого поля и название поля для экранных читалок */
  placeholder?: string;
  /** Кнопки «Прикрепить» и «Голосовое сообщение»: у поля заметки их нет, а кнопка «Отправить» стоит всегда и ждёт текста */
  extras?: boolean;
  /** Страница с полем сейчас на экране: на компьютере (с мышью) курсор сразу встаёт в поле, на телефоне — нет, чтобы не выезжала клавиатура */
  active?: boolean;
}

export function MessageInput({ onSend, onLayoutChange, reply, onCancelReply, placeholder = 'Сообщение', extras = true, active = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  // Последняя позиция курсора в поле: нужна, чтобы вставить эмодзи, когда поле не в фокусе
  const savedRange = useRef<Range | null>(null);
  // Обработчик меняется при каждой перерисовке чата: наблюдатель ниже держит свежий, а сам не пересоздаётся
  const layoutRef = useRef(onLayoutChange);
  useEffect(() => {
    layoutRef.current = onLayoutChange;
  });

  const hasText = text.trim().length > 0;

  // Панель лежит поверх страницы, поэтому сообщает ей свою высоту: --page-bottom — сколько снизу оставить ленте (панель и промежуток над ней).
  // Высота меняется, когда поле растёт на несколько строк, появляется плашка ответа или открывается панель эмодзи
  useEffect(() => {
    const wrap = wrapRef.current;
    const page = wrap?.closest<HTMLElement>('.swipe-pager__page');
    if (!wrap || !page) return;
    let last = -1;
    const apply = () => {
      const height = Math.round(wrap.getBoundingClientRect().height);
      if (height === last) return;
      const first = last < 0;
      last = height;
      page.style.setProperty('--page-bottom', `calc(${height}px + var(--space-2))`);
      page.style.setProperty('--down-gap', 'var(--space-2)'); // кнопке «в конец страницы» до 16 над капсулой не хватает 8
      // Лента подстраивается под новый отступ после перерисовки; при первом замере её ставит на место сам чат
      if (!first) layoutRef.current?.();
    };
    const observer = new ResizeObserver(apply);
    observer.observe(wrap);
    apply();
    return () => {
      observer.disconnect();
      page.style.removeProperty('--page-bottom');
      page.style.removeProperty('--down-gap');
    };
  }, []);

  // Страница открылась: на компьютере писать можно сразу, не нажимая на поле
  useEffect(() => {
    if (active && window.matchMedia('(hover: hover) and (pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
  }, [active]);

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

  // Заметка на телефоне — это несколько абзацев, а Shift на экранной клавиатуре нет: там Enter переносит строку, отправляет кнопка
  const enterSends = () => extras || window.matchMedia('(pointer: fine)').matches;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Enter отправляет, Shift+Enter переносит строку
    if (e.key === 'Enter' && !e.shiftKey && enterSends()) {
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
    <div ref={wrapRef} className={`composer-wrap${emojiOpen ? ' composer-wrap--panel' : ''}`}>
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
      <div className="composer">
        {extras && (
          <button type="button" className="composer__round" aria-label="Прикрепить">
            <IconAttach />
          </button>
        )}

        <div className="composer__field">
          <div
            ref={inputRef}
            className="composer__input"
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            role="textbox"
            aria-label={placeholder}
            aria-multiline="true"
            data-placeholder={placeholder}
            inputMode="text"
            enterKeyHint={extras ? 'send' : 'enter'}
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

        {hasText || !extras ? (
          <button
            type="button"
            className="composer__round composer__round--send"
            aria-label="Отправить"
            disabled={!hasText}
            onClick={submit}
            onMouseDown={(e) => e.preventDefault()}
          >
            <IconSend />
          </button>
        ) : (
          <button type="button" className="composer__round" aria-label="Голосовое сообщение">
            <IconMicrophone />
          </button>
        )}
      </div>

      {emojiOpen && <EmojiPanel onPick={insertEmoji} />}
    </div>
  );
}
