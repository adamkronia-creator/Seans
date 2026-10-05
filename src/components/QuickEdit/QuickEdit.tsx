import { useLayoutEffect, useRef, useState, type ClipboardEvent, type ElementType, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { takeCaret } from './caret';
import './QuickEdit.css';

interface Props {
  /** Включён ли режим быстрой правки */
  editing: boolean;
  /** Новый текст; вызывается один раз при потере фокуса (Esc отменяет) */
  onCommit: (text: string) => void;
  onCancel: () => void;
  /** Чем склеивать абзацы при чтении текста: пустая строка или перенос */
  separator?: string;
  className?: string;
  as?: ElementType;
  /** Обычное отображение: те же элементы остаются и в режиме правки */
  children: ReactNode;
}

const BULLET = '• ';

/** Читает текст из редактируемого блока: абзацы и пункты списка, как они стоят на экране */
function readText(root: HTMLElement, separator: string): string {
  const hasBlocks = [...root.children].some((c) => /^(P|DIV|UL|OL|LI)$/.test(c.tagName));
  if (!hasBlocks) return root.innerText.replace(/ /g, ' ').replace(/\s*\n\s*/g, ' ').trim();
  const parts: string[] = [];
  const clean = (t: string) => t.replace(/ /g, ' ').replace(/\n+$/, '').trim();
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = clean(node.textContent ?? '');
      if (t) parts.push(t);
    } else if (node instanceof HTMLElement) {
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        const items = [...node.querySelectorAll('li')].map((li) => clean(li.innerText)).filter(Boolean);
        if (items.length) parts.push(items.map((i) => BULLET + i).join('\n'));
      } else {
        const t = clean(node.innerText);
        if (t) parts.push(t);
      }
    }
  });
  return parts.join(separator);
}

/**
 * Быстрая правка на месте. Блок — это те же элементы, что и при обычном показе: при двойном клике
 * им только включается редактирование, поэтому ничего не сдвигается. Текст сохраняется при потере
 * фокуса; Esc отменяет; Enter начинает новый абзац.
 */
export function QuickEdit({ editing, onCommit, onCancel, separator = '\n\n', className, as: Tag = 'div', children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const done = useRef(false);
  // Смена ключа пересоздаёт блок: после правки или отмены на экране снова ровно то, что в данных
  const [version, setVersion] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!editing || !el) return;
    done.current = false;
    el.focus({ preventScroll: true });
    // Курсор там, где нажали; если место не определилось — в конце текста
    let range = takeCaret();
    if (!range || !el.contains(range.startContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing, version]);

  const finish = (commit: boolean) => {
    const el = ref.current;
    if (done.current || !el) return;
    done.current = true;
    const text = commit ? readText(el, separator) : '';
    setVersion((v) => v + 1);
    if (commit) onCommit(text);
    else onCancel();
  };

  return (
    <Tag
      key={version}
      ref={ref}
      className={`${className ?? ''}${editing ? ' quick-edit' : ''}`}
      {...(editing
        ? {
            contentEditable: true,
            suppressContentEditableWarning: true,
            role: 'textbox',
            'aria-multiline': true,
            onBlur: () => finish(true),
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                finish(false);
              }
            },
            // Только простой текст: без жирного, вставки с форматированием и т.п.
            onBeforeInput: (e: FormEvent<HTMLElement>) => {
              if ((e.nativeEvent as InputEvent).inputType?.startsWith('format')) e.preventDefault();
            },
            onPaste: (e: ClipboardEvent) => {
              e.preventDefault();
              document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
            },
          }
        : {})}
    >
      {children}
    </Tag>
  );
}
