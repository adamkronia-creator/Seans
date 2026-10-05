import { Fragment, type ReactNode } from 'react';
import './rich.css';

/*
 * Форматированный текст хранится обычной строкой с мини-разметкой:
 *   **жирный**  *курсив*  __подчёркнутый__  ~~зачёркнутый~~
 *   «• » — маркированный пункт, «1. » — нумерованный, «> » — цитата (по одной строке на пункт).
 * Блоки разделяет пустая строка. Спецсимволы в обычном тексте экранируются обратной косой чертой.
 */

export type RichBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string };

const BULLET = '• ';
const MARKERS: [RegExp, 'ul' | 'ol' | 'quote'][] = [
  [/^•\s?/, 'ul'],
  [/^\d+\.\s/, 'ol'],
  [/^>\s?/, 'quote'],
];

/** Строку без разметки блока → тип и текст без маркера */
function lineKind(line: string): { type: 'p' | 'ul' | 'ol' | 'quote'; text: string } {
  for (const [re, type] of MARKERS) {
    if (re.test(line)) return { type, text: line.replace(re, '') };
  }
  return { type: 'p', text: line };
}

export function parseBlocks(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    for (const raw of chunk.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const { type, text: t } = lineKind(line);
      const last = blocks[blocks.length - 1];
      if (type === 'ul' || type === 'ol') {
        if (last && last.type === type) last.items.push(t);
        else blocks.push({ type, items: [t] });
      } else if (type === 'quote') {
        if (last && last.type === 'quote') last.text += '\n' + t;
        else blocks.push({ type, text: t });
      } else if (last && last.type === 'p' && !chunkStart(chunk, raw)) {
        last.text += '\n' + t;
      } else {
        blocks.push({ type: 'p', text: t });
      }
    }
  }
  return blocks;
}

// Первая непустая строка куска начинает новый абзац, остальные строки склеиваются в него
function chunkStart(chunk: string, raw: string) {
  return chunk.split('\n').find((l) => l.trim()) === raw;
}

export function serializeBlocks(blocks: RichBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === 'p') return b.text;
      if (b.type === 'quote') return b.text.split('\n').map((l) => '> ' + l).join('\n');
      if (b.type === 'ul') return b.items.map((i) => BULLET + i).join('\n');
      return b.items.map((i, n) => `${n + 1}. ${i}`).join('\n');
    })
    .join('\n\n');
}

// ——— Разметка → React ———

const INLINE = /\\([\\*_~>•\d])|\*\*(?!\s)([^]+?)(?<!\s)\*\*|__(?!\s)([^]+?)(?<!\s)__|~~(?!\s)([^]+?)(?<!\s)~~|\*(?![\s*])([^]*?)(?<!\s)\*/;

/** Разбирает строку с разметкой в узлы; перенос строки — <br> */
export function renderInline(src: string, key = ''): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = src;
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      pushPlain(out, rest, `${key}${n++}`);
      break;
    }
    if (m.index > 0) pushPlain(out, rest.slice(0, m.index), `${key}${n++}`);
    const k = `${key}${n++}`;
    if (m[1] !== undefined) pushPlain(out, m[1], k);
    else if (m[2] !== undefined) out.push(<strong key={k}>{renderInline(m[2], k + '.')}</strong>);
    else if (m[3] !== undefined) out.push(<u key={k}>{renderInline(m[3], k + '.')}</u>);
    else if (m[4] !== undefined) out.push(<s key={k}>{renderInline(m[4], k + '.')}</s>);
    else out.push(<em key={k}>{renderInline(m[5], k + '.')}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

function pushPlain(out: ReactNode[], text: string, key: string) {
  text.split('\n').forEach((line, i) => {
    if (i > 0) out.push(<br key={`${key}b${i}`} />);
    if (line) out.push(<Fragment key={`${key}t${i}`}>{line}</Fragment>);
  });
}

interface BlocksProps {
  blocks: RichBlock[];
  /** Класс абзаца и цитаты */
  textClass: string;
  /** Класс списков */
  listClass?: string;
}

/** Блоки как соседние элементы (без обёртки): их можно класть прямо в QuickEdit */
export function RichBlocks({ blocks, textClass, listClass }: BlocksProps) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'p') return <p key={i} className={textClass}>{renderInline(b.text)}</p>;
        if (b.type === 'quote')
          return (
            <blockquote key={i} className={`${textClass} rich-quote`}>
              {renderInline(b.text)}
            </blockquote>
          );
        const List = b.type === 'ul' ? 'ul' : 'ol';
        return (
          <List key={i} className={`${listClass ?? ''} rich-${b.type}`}>
            {b.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </List>
        );
      })}
    </>
  );
}

// ——— Разметка → HTML для редактора ———

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inlineHtml(src: string): string {
  let out = '';
  let rest = src;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out += esc(rest).replace(/\n/g, '<br>');
      break;
    }
    out += esc(rest.slice(0, m.index)).replace(/\n/g, '<br>');
    if (m[1] !== undefined) out += esc(m[1]);
    else if (m[2] !== undefined) out += `<b>${inlineHtml(m[2])}</b>`;
    else if (m[3] !== undefined) out += `<u>${inlineHtml(m[3])}</u>`;
    else if (m[4] !== undefined) out += `<strike>${inlineHtml(m[4])}</strike>`;
    else out += `<i>${inlineHtml(m[5])}</i>`;
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function textToHtml(text: string): string {
  return parseBlocks(text)
    .map((b) => {
      if (b.type === 'p') return `<p>${inlineHtml(b.text)}</p>`;
      if (b.type === 'quote') return `<blockquote>${inlineHtml(b.text)}</blockquote>`;
      const tag = b.type;
      return `<${tag}>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</${tag}>`;
    })
    .join('');
}

// ——— DOM редактора → разметка ———

const escText = (s: string) => s.replace(/[\\*_~]/g, '\\$&');

/** Пробелы по краям выносятся за скобки разметки: «** слово**» не разберётся обратно */
function wrap(mark: string, inner: string): string {
  const m = /^(\s*)([^]*?)(\s*)$/.exec(inner)!;
  return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner;
}

function inlineText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escText((node.textContent ?? '').replace(/ /g, ' '));
  if (!(node instanceof HTMLElement)) return '';
  if (node.tagName === 'BR') return '\n';
  const inner = [...node.childNodes].map(inlineText).join('');
  const style = node.style;
  let out = inner;
  const tag = node.tagName;
  if (tag === 'B' || tag === 'STRONG' || /^(bold|[6-9]00)$/.test(style.fontWeight)) out = wrap('**', out);
  if (tag === 'I' || tag === 'EM' || style.fontStyle === 'italic') out = wrap('*', out);
  if (tag === 'U' || /underline/.test(style.textDecorationLine || style.textDecoration)) out = wrap('__', out);
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(style.textDecorationLine || style.textDecoration))
    out = wrap('~~', out);
  return out;
}

/** Строка абзаца: ведущие «• », «1. », «> » в обычном тексте экранируются, чтобы не стать списком */
function plainLine(s: string): string {
  return s
    .split('\n')
    .map((l) => (/^(•|>|\d+\.\s)/.test(l.trimStart()) ? '\\' + l.trimStart() : l))
    .join('\n');
}

const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();

/**
 * Читает редактируемый блок: абзацы, списки, цитаты и жирный/курсив/подчёркнутый/зачёркнутый текст.
 * separator — чем склеивать соседние абзацы: пустая строка или перенос.
 */
export function domToText(root: HTMLElement, separator = '\n\n'): string {
  const parts: string[] = [];
  const tidy = (t: string) => t.replace(/\n+$/, '').trim();
  const BLOCK = /^(P|DIV|UL|OL|BLOCKQUOTE)$/;
  const hasBlocks = (el: Element) => !!el.querySelector('ul, ol, blockquote, p, div');
  let inline: Node[] = [];
  const flush = () => {
    const t = tidy(inline.map(inlineText).join(''));
    if (t) parts.push(plainLine(t));
    inline = [];
  };
  // Редактор может вложить блоки друг в друга (список внутри <p>): идём вглубь
  const walk = (parent: Node) => {
    parent.childNodes.forEach((node) => {
      if (!(node instanceof HTMLElement) || !BLOCK.test(node.tagName)) {
        inline.push(node);
        return;
      }
      flush();
      const tag = node.tagName;
      if (tag === 'UL' || tag === 'OL') {
        const items = [...node.children]
          .filter((c) => c.tagName === 'LI')
          .map((li) => oneLine(inlineText(li)))
          .filter(Boolean);
        if (items.length) parts.push(items.map((it, i) => (tag === 'UL' ? BULLET : `${i + 1}. `) + it).join('\n'));
      } else if (tag === 'BLOCKQUOTE' && !hasBlocks(node)) {
        const t = tidy(inlineText(node));
        if (t) parts.push(t.split('\n').map((l) => '> ' + l).join('\n'));
      } else if (hasBlocks(node)) {
        walk(node);
        flush();
      } else {
        const t = tidy(inlineText(node));
        if (t) parts.push(plainLine(t));
      }
    });
  };
  walk(root);
  flush();
  return parts.join(separator);
}
