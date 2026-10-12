import type { ReactNode } from 'react';
import { normalize } from '../../utils/ruText';
import './LibraryFilters.css';

const WORD = /[A-Za-zА-Яа-яЁё0-9]+/g;

/** Текст, в котором слова, по которым нашлось, выделены: так видно, чем запрос совпал с карточкой */
export function Highlight({ text, words }: { text: string; words?: ReadonlySet<string> | null }) {
  if (!words || words.size === 0) return <>{text}</>;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (!words.has(normalize(m[0]))) continue;
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(
      <mark key={at} className="lib-mark">
        {m[0]}
      </mark>,
    );
    last = at + m[0].length;
  }
  if (out.length === 0) return <>{text}</>;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
