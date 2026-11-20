import { useState } from 'react';
import { levelOf, type ConclusionData, type ConclusionScale } from '../../data/conclusions';
import '../TestSettings/TestConclusion.css';
import './ScaleList.css';

/** Сколько шкал видно, пока список свернут */
const SCALES_SHOWN = 3;

const fmtScore = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Одна шкала: название, значение и полоса цвета диапазона; у шкалы с диапазонами под названием подпись диапазона */
function ScaleRow({ data, scale }: { data: ConclusionData; scale: ConclusionScale }) {
  const level = scale.leveled ? levelOf(data, scale.score, scale) : undefined;
  const tone = level?.tone ?? 'accent';
  const pct = Math.min(100, Math.max(0, (scale.score / scale.max) * 100));
  return (
    <li className="hist-scale">
      <span className="hist-scale__head">
        <span className="hist-scale__name">
          {scale.name}
          {level && <span className="hist-scale__code"> · {level.chip.toLowerCase()}</span>}
        </span>
        <span className="hist-scale__value">{fmtScore(scale.score)}</span>
      </span>
      <span className="hist-scale__track" aria-hidden="true">
        <span className={`hist-scale__fill cc-fill--${tone}`} style={{ width: `${pct}%` }} />
      </span>
    </li>
  );
}

/**
 * Шкалы пройденного клиентом теста в карточке. Нажатие на шкалы открывает результат тестирования;
 * если шкал больше трех, остальные прячутся за «Читать далее» (кнопка стоит рядом со списком, чтобы не открывать результат).
 */
export function ScaleList({ data, onOpen, descending = false }: { data: ConclusionData; onOpen: () => void; descending?: boolean }) {
  const [open, setOpen] = useState(false);
  const scales = descending ? [...data.scales].sort((a, b) => b.score - a.score) : data.scales;
  const long = scales.length > SCALES_SHOWN;
  const head = long ? scales.slice(0, SCALES_SHOWN) : scales;
  // Остальные шкалы всегда в разметке, но свёрнуты по высоте: «Читать далее» раскрывает их плавно, а не вставляет рывком
  const rest = long ? scales.slice(SCALES_SHOWN) : [];
  return (
    <div className="hist-scales">
      <ul
        className="hist-scales__list"
        role="link"
        tabIndex={0}
        aria-label="Открыть результат тестирования"
        onClick={onOpen}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      >
        {head.map((scale) => (
          <ScaleRow key={scale.code} data={data} scale={scale} />
        ))}
        {rest.length > 0 && (
          <li className={`hist-scales__rest${open ? ' hist-scales__rest--open' : ''}`}>
            <ul className="hist-scales__list hist-scales__list--rest">
              {rest.map((scale) => (
                <ScaleRow key={scale.code} data={data} scale={scale} />
              ))}
            </ul>
          </li>
        )}
      </ul>
      {long && <hr className="hist-scales__rule" />}
      {long && (
        <button type="button" className="hist-scales__toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Скрыть' : `Читать далее (ещё ${scales.length - SCALES_SHOWN})`}
        </button>
      )}
    </div>
  );
}
