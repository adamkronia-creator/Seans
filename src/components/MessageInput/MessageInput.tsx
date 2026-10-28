import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { EmojiPanel } from './EmojiPanel';
import { IconClose, IconReply } from '../ChatParts/ChatIcons';
import { IconAttach, IconEmoji, IconMicrophone, IconSend } from '../icons';
import { IconPenNew } from '../GroupUi/GroupIcons';
import './MessageInput.css';

interface MessageInputProps {
  /** false — отправка не принята (например, текст не помещается в выбранную сеть): текст остаётся в поле */
  onSend: (text: string) => boolean | void;
  /** Высота панели поменялась (открылась панель эмодзи): ленту нужно удержать внизу */
  onLayoutChange?: () => void;
  /** Сообщение, на которое пишется ответ; с edit — сообщение, которое правится (плашка «Редактирование») */
  reply?: { name: string; text: string; edit?: boolean };
  onCancelReply?: () => void;
  /** Правка: текст сообщения встаёт в поле, отправка заменяет его (key меняется — поле заполняется заново; пропал — поле очищается) */
  edit?: { key: string; text: string };
  /** Подпись пустого поля и название поля для экранных читалок */
  placeholder?: string;
  /** Кнопки «Прикрепить» и «Голосовое сообщение»: у поля заметки их нет, а кнопка «Отправить» стоит всегда и ждёт текста */
  extras?: boolean;
  /** Страница с полем сейчас на экране: на компьютере (с мышью) курсор сразу встаёт в поле, на телефоне — нет, чтобы не выезжала клавиатура */
  active?: boolean;
  /** Выбраны файлы кнопкой «Прикрепить» */
  onAttach?: (files: File[]) => void;
  /** Кнопки «Прикрепить» нет (в группе запрещены фото и файлы); микрофон остаётся */
  noAttach?: boolean;
  /** Писать нельзя: вместо поля стоит эта строка («Отключить звук» у подписчика канала, «Медленный режим: 0:24») */
  bar?: ReactNode;
  /** Свой элемент в начале капсулы: у комментария — фото, от чьего имени он будет написан */
  lead?: ReactNode;
  /** Полоса над капсулой (под плашкой ответа), которой нужен набранный текст: в канале — «Также в Telegram, ВК» и предупреждение о длине */
  above?: (draft: string) => ReactNode;
}

/**
 * Круглая кнопка справа в поле ввода. Микрофон сменяется на «Отправить», как только появился текст, и наоборот: кнопка, что появилась
 * после показа поля, выскакивает с пружинкой (класс ставится один раз при её создании), а показанная вместе с полем стоит как стояла.
 */
function RoundButton({ settled, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { settled: boolean }) {
  const [pop] = useState(settled);
  return <button type="button" className={`${className}${pop ? ' composer__round--pop' : ''}`} {...props} />;
}

export function MessageInput({ onSend, onLayoutChange, reply, onCancelReply, edit, placeholder = 'Сообщение', extras = true, active = false, onAttach, noAttach = false, bar, lead, above }: MessageInputProps) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
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

  // Правка сообщения: его текст встаёт в поле с курсором в конце; когда правку закрыли, поле снова пустое
  const editing = useRef(false);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (edit) {
      editing.current = true;
      el.textContent = edit.text;
      setText(edit.text);
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedRange.current = range.cloneRange();
      requestAnimationFrame(() => onLayoutChange?.());
    } else if (editing.current) {
      editing.current = false;
      el.textContent = '';
      setText('');
    }
  }, [edit?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Вместо поля побывала строка-подсказка или панель действий: поле создаётся заново пустым, а набранный текст хранится в состоянии — возвращаем его
  useEffect(() => {
    const el = inputRef.current;
    if (!bar && el && text && el.textContent !== text) el.textContent = text;
  }, [bar]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (onSend(text.trim()) === false) return;
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

  if (bar) {
    return (
      <div ref={wrapRef} className="composer-wrap">
        <div className="composer composer--bar">{bar}</div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`composer-wrap${emojiOpen ? ' composer-wrap--panel' : ''}`}>
      {reply && (
        <div className="reply-bar">
          {reply.edit ? <IconPenNew className="reply-bar__icon" /> : <IconReply className="reply-bar__icon" />}
          <div className="reply-bar__text">
            <span className="reply-bar__name">{reply.edit ? `Редактирование${reply.name ? ` · ${reply.name}` : ''}` : `Ответ: ${reply.name}`}</span>
            <span className="reply-bar__quote">{reply.text}</span>
          </div>
          <button type="button" className="reply-bar__close" aria-label={reply.edit ? 'Отменить правку' : 'Отменить ответ'} onClick={onCancelReply}>
            <IconClose />
          </button>
        </div>
      )}
      {above?.(text)}
      {/* Не <form> и не <input>: иначе телефон предлагает пароли, карты и адреса */}
      <div className="composer">
        {lead}
        {extras && !noAttach && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length) onAttach?.(files);
              }}
            />
            <button type="button" className="composer__round" aria-label="Прикрепить файл" onClick={() => fileRef.current?.click()}>
              <IconAttach />
            </button>
          </>
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
          <RoundButton
            key="send"
            settled={settled.current}
            className="composer__round composer__round--send"
            aria-label="Отправить"
            disabled={!hasText}
            onClick={submit}
            onMouseDown={(e) => e.preventDefault()}
          >
            <IconSend />
          </RoundButton>
        ) : (
          <RoundButton key="mic" settled={settled.current} className="composer__round" aria-label="Голосовое сообщение">
            <IconMicrophone />
          </RoundButton>
        )}
      </div>

      {emojiOpen && <EmojiPanel onPick={insertEmoji} />}
    </div>
  );
}
