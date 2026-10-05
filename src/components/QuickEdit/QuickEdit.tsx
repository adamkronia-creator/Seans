import { useLayoutEffect, useRef, useState, type ClipboardEvent, type ElementType, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { domToText } from '../../utils/richText';
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
    const text = commit ? domToText(el, separator) : '';
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
