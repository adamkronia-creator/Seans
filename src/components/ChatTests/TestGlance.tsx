import type { ConclusionData } from '../../data/conclusions';
import { resultGlance, scoreText, type GlanceRow } from '../../data/resultGlance';
import { plural } from '../../data/taskValues';

/** Метка уровня: цвет несёт точка, смысл — слова */
function Chip({ row, text }: { row: GlanceRow; text: string }) {
  if (!text) return null;
  return (
    <span className={`glance__chip glance__chip--${row.tone}`}>
      <span className="glance__dot" aria-hidden="true" />
      {text}
    </span>
  );
}

/** Полоса шкалы: заливка цвета уровня, белые риски на границах уровней */
function Meter({ row }: { row: GlanceRow }) {
  const pct = Math.min(100, (row.score / row.max) * 100);
  return (
    <span className={`glance__meter glance__meter--${row.tone}`} role="img" aria-label={`${scoreText(row.score)} из ${scoreText(row.max)}`}>
      <span className="glance__fill" style={{ width: `${pct}%` }} />
      {row.marks.map((m) => (
        <span key={m} className="glance__mark" style={{ left: `${m * 100}%` }} aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * Итог пройденного теста в карточке. Одна шкала (PHQ-9, GAD-7, RSES): крупный балл, метка уровня и полоса с границами уровней.
 * Много шкал (SCL-90, 5PFQ): самые выраженные, у каждой название и под ним балл и уровень; сколько шкал осталось за кадром — внизу.
 */
export function TestGlance({ data }: { data: ConclusionData }) {
  const { single, rows, more } = resultGlance(data);
  if (rows.length === 0) return null;
  if (single) {
    const row = rows[0];
    return (
      <div className={`glance glance--${row.tone}`}>
        <div className="glance__head">
          <span className="glance__score">
            <span className="glance__num">{scoreText(row.score)}</span>
            <span className="glance__of"> из {scoreText(row.max)}</span>
          </span>
          <Chip row={row} text={row.chip} />
        </div>
        <Meter row={row} />
      </div>
    );
  }
  return (
    <div className="glance">
      <ul className="glance__rows">
        {rows.map((row) => (
          <li key={row.code} className={`glance__row glance__row--${row.tone}`}>
            <span className="glance__dot" aria-hidden="true" />
            <span className="glance__name">{row.name}</span>
            <span className="glance__detail">
              {scoreText(row.score)} из {scoreText(row.max)}
              {row.legend ? ` · ${row.legend}` : ''}
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="glance__more">Ещё {more} {plural(more, ['шкала', 'шкалы', 'шкал'])} в результате</p>}
    </div>
  );
}
