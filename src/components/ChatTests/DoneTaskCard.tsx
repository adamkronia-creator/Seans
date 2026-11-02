import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { useTaskResult } from '../../data/selfTask';
import { starterOf, type TaskField, type TaskValues } from '../../data/taskValues';
import type { PsyTest } from '../../data/tests';

/** Высота свёрнутого текста: три строки 15/24 */
const LINE = 24;
const CLAMP = LINE * 3;

/** Первое, что человек написал в бланке: предложение с началом, текст, первая строка списка или первая запись */
function firstText(fields: TaskField[], values: TaskValues): string {
  for (const field of fields) {
    if (field.kind === 'sentence') {
      const text = values.text[field.id]?.trim();
      if (text) return `${field.starters[starterOf(field, values)] ?? ''} ${text}`.trim();
    } else if (field.kind === 'text') {
      const text = values.text[field.id]?.trim();
      if (text) return text;
    } else if (field.kind === 'list') {
      const text = values.list[field.id]?.find((s) => s.trim());
      if (text) return text.trim();
    } else if (field.kind === 'entries') {
      const first = values.entries[field.id]?.[0];
      if (first) {
        const text = firstText(field.groups.flatMap((g) => g.fields), first);
        if (text) return text;
      }
    }
  }
  return '';
}

interface DoneTaskCardProps {
  /** Карточка завершённого задания из списка вкладки */
  item: PsyTest;
  /** Номер результата, по которому берутся ответы и открывается экран результата */
  resultId: string;
  onOpen: (item: PsyTest) => void;
}

/**
 * Завершённое задание во вкладке «Задания»: своя плитка с аватаркой, названием и датой выполнения, под ними первые строки того,
 * что человек написал в бланке (обрезаются, как описание задания в настройках), и кнопка «Посмотреть» открывает результат.
 */
export function DoneTaskCard({ item, resultId, onOpen }: DoneTaskCardProps) {
  const own = useTaskResult(resultId);
  const result = own ?? findClientTaskResult(resultId);
  const [text, setText] = useState('');
  const [full, setFull] = useState(0);
  const body = useRef<HTMLParagraphElement>(null);

  // Тексты заданий большие и грузятся отдельно: до их загрузки у плитки нет текста
  useLayoutEffect(() => {
    if (!result) return;
    let alive = true;
    void import('../../data/taskSettings').then(({ taskSettings }) => {
      const data = taskSettings({ id: result.taskId });
      if (alive && data) setText(firstText(data.blank.sections(result.form).flatMap((s) => s.fields), result.values));
    });
    return () => {
      alive = false;
    };
  }, [result]);

  useLayoutEffect(() => {
    if (body.current) setFull(body.current.scrollHeight);
  }, [text]);

  const long = full > CLAMP;
  return (
    <li className="done-task">
      <button type="button" className="done-task__main" onClick={() => onOpen(item)}>
        <span className="done-task__head">
          <span className="test-card__avatar" style={{ '--tint': item.tint } as CSSProperties}>
            <img className="test-card__icon" src={item.icon} alt="" loading="lazy" decoding="async" />
          </span>
          <span className="done-task__titles">
            <span className="done-task__title">{item.title}</span>
            <span className="done-task__date">Выполнено {result?.info.date ?? item.date}</span>
          </span>
        </span>
        {text && (
          <p ref={body} className={`done-task__text${long ? ' done-task__text--fade' : ''}`} style={long ? { maxHeight: CLAMP } : undefined}>
            {text}
          </p>
        )}
      </button>
      <button type="button" className="done-task__open" onClick={() => onOpen(item)}>
        Посмотреть
      </button>
    </li>
  );
}
