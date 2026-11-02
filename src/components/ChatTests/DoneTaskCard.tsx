import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import '../TestCard/TestCard.css';
import '../TestSettings/TestSettings.css';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { TASK_LIBRARY } from '../../data/library';
import { useTaskResult } from '../../data/selfTask';
import { starterOf, type TaskField, type TaskValues } from '../../data/taskValues';
import type { PsyTest } from '../../data/tests';

/** Высота свёрнутого текста: три строки 15/24 */
const LINE = 24;
const CLAMP = LINE * 3;

/** Всё, что человек написал в бланке, по порядку: предложение с началом, текст, строки списков и записей */
function writtenBlocks(fields: TaskField[], values: TaskValues, out: string[] = []): string[] {
  for (const field of fields) {
    if (field.kind === 'sentence') {
      const text = values.text[field.id]?.trim();
      if (text) out.push(`${field.starters[starterOf(field, values)] ?? ''} ${text}`.trim());
    } else if (field.kind === 'text') {
      const text = values.text[field.id]?.trim();
      if (text) out.push(text);
    } else if (field.kind === 'list') {
      for (const line of values.list[field.id] ?? []) if (line.trim()) out.push(line.trim());
    } else if (field.kind === 'entries') {
      for (const entry of values.entries[field.id] ?? []) writtenBlocks(field.groups.flatMap((g) => g.fields), entry, out);
    }
  }
  return out;
}

/** Начало ответа: первый блок, а если он короткий — следом следующие, пока не наберётся на три строки */
const ENOUGH = 180;
function firstText(fields: TaskField[], values: TaskValues): string {
  let text = '';
  for (const block of writtenBlocks(fields, values)) {
    text = text ? `${text} ${block}` : block;
    if (text.length >= ENOUGH) break;
  }
  return text;
}

interface DoneTaskCardProps {
  /** Карточка завершённого задания из списка вкладки */
  item: PsyTest;
  /** Номер результата, по которому берутся ответы и открывается экран результата */
  resultId: string;
  onOpen: (item: PsyTest) => void;
  /** Постоянное задание: вместо даты выполнения — короткое описание, вместо «Посмотреть» — «Выполнить», текста ответа нет */
  permanent?: boolean;
}

/**
 * Завершённое задание во вкладке «Задания»: своя плитка с аватаркой, названием и датой выполнения, под ними первые строки того,
 * что человек написал в бланке (обрезаются, как описание задания в настройках), и кнопка «Посмотреть» открывает результат.
 */
export function DoneTaskCard({ item, resultId, onOpen, permanent }: DoneTaskCardProps) {
  const own = useTaskResult(resultId);
  const result = permanent ? undefined : (own ?? findClientTaskResult(resultId));
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
      <div className="done-task__card chat-tests__list">
      <button type="button" className="test-card" onClick={() => onOpen(item)}>
        <span className="test-card__avatar" style={{ '--tint': item.tint } as CSSProperties}>
          <img className="test-card__icon" src={item.icon} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="test-card__body">
          <span className="test-card__top">
            <span className="test-card__title">{item.title}</span>
          </span>
          <span className="test-card__description">{permanent ? (TASK_LIBRARY.find((t) => t.id === item.id)?.description ?? item.description) : `Выполнено ${result?.info.date ?? item.date}`}</span>
        </span>
      </button>
        {text && (
          <p ref={body} className={`done-task__text${long ? ' done-task__text--fade' : ''}`} style={long ? { maxHeight: CLAMP } : undefined}>
            {text}
          </p>
        )}
      </div>
      <button type="button" className="ts-desc__toggle" onClick={() => onOpen(item)}>
        {permanent ? 'Выполнить' : 'Посмотреть'}
      </button>
    </li>
  );
}
