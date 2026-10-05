import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ComponentType, type SVGProps } from 'react';
import {
  IconFmtBold,
  IconFmtBullets,
  IconFmtHighlight,
  IconFmtItalic,
  IconFmtNumbers,
  IconFmtQuote,
  IconFmtRedo,
  IconFmtStrike,
  IconFmtUnderline,
  IconFmtUndo,
} from '../icons';
import { domToText, HILITE, textToHtml } from '../../utils/richText';
import './RichEditor.css';

/** Позиция курсора как число символов от начала поля: переживает перестройку разметки */
function caretOffset(root: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed || !root.contains(sel.anchorNode)) return null;
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(sel.anchorNode!, sel.anchorOffset);
  return r.toString().length;
}

function placeCaret(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let left = offset;
  let node = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (left <= len) break;
    left -= len;
    node = walker.nextNode();
  }
  const range = document.createRange();
  if (node) range.setStart(node, left);
  else range.selectNodeContents(root);
  range.collapse(!node ? false : true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Курсор или выделение стоят в тексте с маркером */
function insideHighlight(root: HTMLElement): boolean {
  const sel = window.getSelection();
  let node: Node | null = sel?.anchorNode ?? null;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
  for (; node && node !== root; node = node.parentNode) {
    if (node instanceof HTMLElement) {
      const bg = node.style.backgroundColor;
      if (bg) return bg !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(bg);
    }
  }
  return false;
}

/** Курсор в конце маркера: переносим его за маркер (в невидимый символ), дальше текст идёт без выделения */
function leaveHighlight(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.anchorNode) return false;
  let span: Node | null = sel.anchorNode.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentNode : sel.anchorNode;
  while (span && span !== root && !(span instanceof HTMLElement && span.style.backgroundColor)) span = span.parentNode;
  if (!span || span === root) return false;
  const r = document.createRange();
  r.selectNodeContents(span);
  r.setStart(sel.anchorNode, sel.anchorOffset);
  if (r.toString() !== '') return false; // курсор не в конце
  const gap = document.createTextNode('\u200b');
  span.parentNode!.insertBefore(gap, span.nextSibling);
  const next = document.createRange();
  next.setStart(gap, 1);
  next.collapse(true);
  sel.removeAllRanges();
  sel.addRange(next);
  return true;
}

type Tool =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'bullets'
  | 'numbers'
  | 'quote'
  | 'undo'
  | 'redo';

const TOOLS: { id: Tool; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; command?: string }[] = [
  { id: 'bold', label: 'Полужирный', Icon: IconFmtBold, command: 'bold' },
  { id: 'italic', label: 'Курсив', Icon: IconFmtItalic, command: 'italic' },
  { id: 'underline', label: 'Подчёркнутый', Icon: IconFmtUnderline, command: 'underline' },
  { id: 'strike', label: 'Зачёркнутый', Icon: IconFmtStrike, command: 'strikeThrough' },
  { id: 'highlight', label: 'Выделить маркером', Icon: IconFmtHighlight },
  { id: 'bullets', label: 'Список с точками', Icon: IconFmtBullets, command: 'insertUnorderedList' },
  { id: 'numbers', label: 'Нумерованный список', Icon: IconFmtNumbers, command: 'insertOrderedList' },
  { id: 'quote', label: 'Цитата', Icon: IconFmtQuote },
  { id: 'undo', label: 'Отменить', Icon: IconFmtUndo, command: 'undo' },
  { id: 'redo', label: 'Вернуть', Icon: IconFmtRedo, command: 'redo' },
];

interface Props {
  /** Начальный текст в мини-разметке (см. utils/richText) */
  initial: string;
  onChange: (text: string) => void;
  placeholder?: string;
  ariaLabel: string;
}

type ToolState = Partial<Record<Tool, boolean>>;

/** Редактор текста с панелью форматирования: строка иконок сверху и поле ввода под ней */
export function RichEditor({ initial, onChange, placeholder, ariaLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(initial.trim() === '');
  const [state, setState] = useState<ToolState>({});
  const pendingHl = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.innerHTML = textToHtml(initial) || '<p><br></p>';
    // Новые абзацы — <p>, а не <div>; теги вместо style="..." в разметке
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, 'false');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readState = useCallback(() => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
    const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
    setState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
      highlight: pendingHl.current ?? insideHighlight(el),
      bullets: document.queryCommandState('insertUnorderedList'),
      numbers: document.queryCommandState('insertOrderedList'),
      quote: !!node?.closest('blockquote'),
      undo: document.queryCommandEnabled('undo'),
      redo: document.queryCommandEnabled('redo'),
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', readState);
    return () => document.removeEventListener('selectionchange', readState);
  }, [readState]);

  const sync = () => {
    const el = ref.current;
    if (!el) return;
    const text = domToText(el);
    setEmpty(text === '');
    onChange(text);
    readState();
  };

  const run = (tool: (typeof TOOLS)[number]) => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    const caret = caretOffset(el);
    if (tool.id === 'highlight') {
      const on = pendingHl.current ?? insideHighlight(el);
      if (!(on && leaveHighlight(el))) document.execCommand('hiliteColor', false, on ? 'transparent' : HILITE);
      // Без выделения Chrome не отдаёт состояние маркера для ещё не набранного текста: помним сами
      pendingHl.current = window.getSelection()?.isCollapsed ? !on : null;
    } else if (tool.id === 'quote') {
      const sel = window.getSelection();
      const node = sel?.anchorNode instanceof Element ? sel.anchorNode : sel?.anchorNode?.parentElement;
      document.execCommand('formatBlock', false, node?.closest('blockquote') ? 'p' : 'blockquote');
    } else if (tool.command) {
      document.execCommand(tool.command);
    }
    // Chrome после превращения строки в список уводит курсор в начало: возвращаем
    if (caret !== null && (tool.id === 'bullets' || tool.id === 'numbers' || tool.id === 'quote')) {
      const now = caretOffset(el);
      if (now !== caret) placeCaret(el, caret);
    }
    sync();
  };

  // Вставка только простым текстом, абзацы сохраняются
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    e.clipboardData
      .getData('text/plain')
      .replace(/\r/g, '')
      .split('\n')
      .forEach((line, i) => {
        if (i > 0) document.execCommand('insertParagraph');
        if (line) document.execCommand('insertText', false, line);
      });
  };

  // Enter на пустой строке цитаты выводит из цитаты, как в списках
  const onKeyDown = (e: KeyboardEvent) => {
    if (/^(Arrow|Home|End|Page)/.test(e.key)) pendingHl.current = null;
    if (e.key !== 'Enter' || e.shiftKey) return;
    const sel = window.getSelection();
    const node = sel?.anchorNode instanceof Element ? sel.anchorNode : sel?.anchorNode?.parentElement;
    const quote = node?.closest('blockquote');
    if (quote && ref.current?.contains(quote) && quote.textContent?.trim() === '') {
      e.preventDefault();
      document.execCommand('formatBlock', false, 'p');
      sync();
    }
  };

  return (
    <>
      <div className="rich-toolbar" role="toolbar" aria-label="Форматирование текста">
        {TOOLS.map((tool) => {
          const { id, label, Icon } = tool;
          const history = id === 'undo' || id === 'redo';
          const active = !history && !!state[id];
          return (
            <button
              key={id}
              type="button"
              className={`rich-toolbar__button${active ? ' rich-toolbar__button--active' : ''}`}
              aria-label={label}
              title={label}
              aria-pressed={history ? undefined : active}
              disabled={history && state[id] === false}
              // Нажатие не уводит фокус из текста: выделение и курсор остаются на месте
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(tool)}
            >
              <Icon />
            </button>
          );
        })}
      </div>
      <div
        ref={ref}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-empty={empty}
        data-placeholder={placeholder}
        onInput={sync}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onKeyUp={readState}
        onMouseUp={() => {
          pendingHl.current = null;
          readState();
        }}
      />
    </>
  );
}
