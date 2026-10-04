import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react';
import './QuickEdit.css';

interface Props {
  /** Включён ли режим быстрой правки */
  editing: boolean;
  /** Текущий текст: попадает в поле при входе в правку */
  value: string;
  /** Завершение: вызывается один раз с новым текстом (Esc отменяет, сюда не попадает) */
  onCommit: (text: string) => void;
  onCancel: () => void;
  className?: string;
  as?: ElementType;
  placeholder?: string;
  /** Обычное отображение, пока правка не включена */
  children: ReactNode;
}

/**
 * Быстрая правка текста на месте: блок остаётся тем же, появляется курсор, как в поле сообщения.
 * Сохраняется при потере фокуса; Esc отменяет; Enter — перенос строки.
 */
export function QuickEdit({ editing, value, onCommit, onCancel, className, as: Tag = 'div', placeholder, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const done = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!editing || !el) return;
    done.current = false;
    el.textContent = value;
    el.focus();
    // Курсор в конец текста
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Значение берём только при входе в правку
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) return <>{children}</>;

  const finish = (commit: boolean) => {
    const el = ref.current;
    if (done.current || !el) return;
    done.current = true;
    if (commit) onCommit(el.innerText.replace(/ /g, ' ').replace(/\n+$/, '').trim());
    else onCancel();
  };

  return (
    <Tag
      ref={ref}
      className={`${className ?? ''} quick-edit`}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
      onBlur={() => finish(true)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      }}
    />
  );
}
