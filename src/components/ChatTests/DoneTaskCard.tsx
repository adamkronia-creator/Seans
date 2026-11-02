import { useLayoutEffect, useRef, useState } from 'react';
import type { PickProps } from '../ChatCase/ChatCase';
import { Facts, ItemCard, type Fact } from './ItemCard';
import { findClientTaskResult } from '../../data/clientTaskResults';
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

interface DoneTaskCardProps extends PickProps {
  /** Карточка завершённого задания из списка вкладки */
  item: PsyTest;
  /** Номер результата, по которому берутся ответы и открывается экран результата */
  resultId: string;
  onOpen: (item: PsyTest) => void;
}

/**
 * Завершённое задание: в шапке «Выполнено …», под ней первые строки того, что человек написал в бланке (обрезаются, как описание
 * задания в настройках), ниже показатели (номер записи, итоги бланка, время), а плитка «Посмотреть» открывает результат.
 */
export function DoneTaskCard({ item, resultId, onOpen, selecting, selected, onPick }: DoneTaskCardProps) {
  const result = useTaskResult(resultId) ?? findClientTaskResult(resultId);
  const [text, setText] = useState('');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [full, setFull] = useState(0);
  const body = useRef<HTMLParagraphElement>(null);

  // Тексты заданий большие и грузятся отдельно: до их загрузки у карточки нет текста и показателей
  useLayoutEffect(() => {
    if (!result) return;
    let alive = true;
    void import('../../data/taskSettings').then(({ taskSettings }) => {
      const data = taskSettings({ id: result.taskId });
      if (!alive || !data) return;
      setText(firstText(data.blank.sections(result.form).flatMap((s) => s.fields), result.values));
      // Итоги бланка («Средняя сила эмоции 70%»); в записи постоянного задания «Сделано записей: 1» ничего не добавляет
      const rows = (data.summary?.(result.values) ?? []).filter((r) => !(result.record && /^Сделано/.test(r.label)));
      setFacts(
        [
          ...(result.record ? [{ value: `№ ${result.record}`, label: 'Запись' }] : []),
          ...rows.slice(0, result.record ? 1 : 2).map((r) => ({ value: r.value, label: r.label })),
          { value: result.info.duration, label: 'Время' },
        ].slice(0, 3),
      );
    });
    return () => {
      alive = false;
    };
  }, [result]);

  // Высота полного текста: от неё зависит, нужно ли затухание; меняется вместе с шириной экрана
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => setFull(el.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const long = full > CLAMP;
  return (
    <ItemCard item={item} caption={`Выполнено ${result?.info.date ?? item.date}`} action={{ label: 'Посмотреть', onClick: () => onOpen(item) }} onOpen={onOpen} selecting={selecting} selected={selected} onPick={onPick}>
      {text && (
        <p ref={body} className={`item-card__text${long ? ' item-card__text--fade' : ''}`} style={long ? { maxHeight: CLAMP } : undefined}>
          {text}
        </p>
      )}
      <Facts items={facts} />
    </ItemCard>
  );
}
