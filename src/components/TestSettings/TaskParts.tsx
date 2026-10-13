import type { ReactNode } from 'react';

/** Строка списка: «• текст» (маркер) или «1. текст» (номер) */
const BULLET = /^•\s+/;
const NUMBER = /^\d+\.\s+/;

/** Одна часть абзаца: обычные строки текстом, подряд идущие «•»-строки маркированным списком, «1.»-строки нумерованным */
function blocks(paragraph: string, lead?: string, first = false): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = paragraph.split('\n');
  let i = 0;
  while (i < lines.length) {
    const kind = BULLET.test(lines[i]) ? 'bullet' : NUMBER.test(lines[i]) ? 'number' : 'text';
    const start = i;
    while (i < lines.length && (BULLET.test(lines[i]) ? 'bullet' : NUMBER.test(lines[i]) ? 'number' : 'text') === kind) i++;
    const chunk = lines.slice(start, i);
    if (kind === 'text') {
      const text = chunk.join('\n');
      out.push(
        <p key={start}>
          {first && start === 0 && lead && text.startsWith(lead) ? (
            <>
              <strong>{lead}</strong>
              {text.slice(lead.length)}
            </>
          ) : (
            text
          )}
        </p>,
      );
    } else {
      const items = chunk.map((line) => line.replace(kind === 'bullet' ? BULLET : NUMBER, ''));
      const List = kind === 'bullet' ? 'ul' : 'ol';
      out.push(
        <List key={start} className={`ts-card__list ts-card__list--hang${kind === 'number' ? ' ts-card__list--num' : ''}`}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </List>,
      );
    }
  }
  return out;
}

/**
 * Абзацы текста карточки: пустая строка разделяет абзацы, `lead` в начале первого абзаца выделен полужирным.
 * Внутри абзаца строки, начатые с «• », идут маркированным списком, а с «1. » — нумерованным
 */
export function Paragraphs({ text, lead }: { text: string; lead?: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, i) => (
        <div key={i} className="ts-card__paragraph">
          {blocks(paragraph, lead, i === 0)}
        </div>
      ))}
    </>
  );
}
