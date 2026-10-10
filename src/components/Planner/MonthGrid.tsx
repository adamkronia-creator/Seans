import { useMemo, type CSSProperties } from 'react';
import type { DayFlags } from '../../data/agenda';
import { addDays, dateKey, dayMonth, mondayIndex, plural, startOfMonth, WEEK_HEAD } from '../../utils/ruDate';
import './MonthGrid.css';

/** Недели месяца, начиная с понедельника: дни соседних месяцев добивают первую и последнюю неделю */
function weeksOf(month: Date): Date[][] {
  const first = startOfMonth(month);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = mondayIndex(first);
  const rows = Math.ceil((lead + days) / 7);
  const start = addDays(first, -lead);
  return Array.from({ length: rows }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/** Подпись дня для экранных читалок: «10 октября, сегодня, сеансов: 1, дел: 2, есть заметка» */
function labelOf(key: string, today: string, flags: DayFlags): string {
  const parts = [dayMonth(key)];
  if (key === today) parts.push('сегодня');
  if (flags.visits) parts.push(`${flags.visits} ${plural(flags.visits, 'сеанс', 'сеанса', 'сеансов')}`);
  if (flags.tasks) parts.push(`${flags.tasks} ${plural(flags.tasks, 'дело', 'дела', 'дел')}`);
  if (flags.note) parts.push('есть заметка');
  return parts.join(', ');
}

interface MonthGridProps {
  /** Любой день показанного месяца */
  month: Date;
  selected: string;
  today: string;
  /** Одна неделя вместо месяца */
  compact: boolean;
  flags: (key: string) => DayFlags;
  onSelect: (key: string) => void;
}

/**
 * Календарь месяца: неделя с понедельника, у дней с событиями под числом точки (синяя — сеансы, серая — дела,
 * оранжевая — заметка). В свернутом виде остается неделя выбранного дня: сетка уезжает вверх и обрезается окном.
 */
export function MonthGrid({ month, selected, today, compact, flags, onSelect }: MonthGridProps) {
  const weeks = useMemo(() => weeksOf(month), [month]);
  const row = Math.max(
    0,
    weeks.findIndex((week) => week.some((d) => dateKey(d) === selected)),
  );
  const style = {
    '--visible': compact ? 1 : weeks.length,
    '--shift': compact ? row : 0,
  } as CSSProperties;

  return (
    <div className="cal" style={style} role="group" aria-label="Календарь">
      <div className="cal__head" aria-hidden="true">
        {WEEK_HEAD.map((name, i) => (
          <span key={name} className={`cal__weekday${i > 4 ? ' cal__weekday--weekend' : ''}`}>
            {name}
          </span>
        ))}
      </div>
      <div className="cal__viewport">
        <div className="cal__weeks">
          {weeks.map((week, w) => {
            const shown = !compact || w === row;
            return (
              <div key={dateKey(week[0])} className="cal__week" aria-hidden={!shown}>
                {week.map((d) => {
                  const key = dateKey(d);
                  const f = flags(key);
                  const cls = [
                    'cal__day',
                    key === selected && 'cal__day--selected',
                    key === today && 'cal__day--today',
                    d.getMonth() !== month.getMonth() && 'cal__day--outside',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={key}
                      type="button"
                      className={cls}
                      tabIndex={shown ? 0 : -1}
                      aria-label={labelOf(key, today, f)}
                      aria-pressed={key === selected}
                      aria-current={key === today ? 'date' : undefined}
                      onClick={() => onSelect(key)}
                    >
                      <span className="cal__num">{d.getDate()}</span>
                      <span className="cal__dots" aria-hidden="true">
                        {f.visits > 0 && <i className="cal__dot cal__dot--visit" />}
                        {f.tasks > 0 && <i className="cal__dot cal__dot--task" />}
                        {f.note && <i className="cal__dot cal__dot--note" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
