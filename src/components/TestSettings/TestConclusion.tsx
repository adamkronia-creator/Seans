import {
  IconCaseCalendar,
  IconTestAge,
  IconTestBlank,
  IconTestChevron,
  IconTestGender,
  IconTestReportExtra,
  IconTestReportMain,
  IconTestScaleChart,
  IconTestTime,
  IconTestTimeStart,
} from '../icons';
import { levelOf, type ConclusionData, type ConclusionScale } from '../../data/conclusions';
import { CollapseCard } from './TestBlank';
import './TestSettings.css';
import './TestConclusion.css';

/** Ось: подписи стоят над своими местами на полосе (та же геометрия, что у строк) */
function Axis({ kind, ticks, max }: { kind: 'main' | 'extra' | 'single'; ticks: number[]; max: number }) {
  return (
    <div className={`cc-axis cc-axis--${kind}`} aria-hidden="true">
      <div className="cc-axis__scale">
        {ticks.map((v) => (
          <span key={v} style={{ left: `${(v / max) * 100}%` }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Подпись строки: «1. Hs»; если шкала в заключении одна на диаграмму (без общих диаграмм), только код */
const rowLabel = (data: ConclusionData, code: string, index: number) => (data.overview ? `${index + 1}. ${code}` : code);

/** Склонение: 1 балл, 2–4 балла, 5–20 баллов */
export function pointsWord(n: number) {
  const last = n % 10;
  if (n % 100 >= 11 && n % 100 <= 14) return 'баллов';
  if (last === 1) return 'балл';
  return last >= 2 && last <= 4 ? 'балла' : 'баллов';
}

function Legend({ data }: { data: ConclusionData }) {
  return (
    <ul className="cc-legend">
      {data.levels.map((level) => (
        <li key={level.key} className={`cc-chip cc-chip--${level.tone}`}>
          <span className="cc-chip__dot" />
          {level.legend}
        </li>
      ))}
    </ul>
  );
}

/** Полоса шкалы: заливка цвета диапазона, значение у конца полосы, белые линии на границах диапазонов */
function Bar({ data, scale, max = scale.max }: { data: ConclusionData; scale: ConclusionScale; max?: number }) {
  const pct = (scale.score / max) * 100;
  const tone = scale.leveled ? levelOf(data, scale.score).tone : 'accent';
  return (
    <span className="cc-track">
      {scale.leveled &&
        data.levels
          .filter((l) => l.from > 0)
          .map((l) => <span key={l.key} className="cc-norm" style={{ left: `${(l.from / max) * 100}%` }} aria-hidden="true" />)}
      <span className={`cc-fill cc-fill--${tone}`} style={{ width: `${pct}%` }} />
      {/* У почти полной полосы справа не остаётся места: значение уходит внутрь полосы */}
      <span
        className={`cc-value${pct > 88 ? ` cc-value--inside${tone === 'yellow' ? ' cc-value--dark' : ''}` : ''}`}
        style={pct > 88 ? { right: `calc(${100 - pct}% + 6px)` } : { left: `calc(${pct}% + 4px)` }}
      >
        {scale.score}
      </span>
    </span>
  );
}

function ScaleCharts({
  data,
  title,
  scales,
  group,
  onOpen,
}: {
  data: ConclusionData;
  title: string;
  scales: ConclusionScale[];
  group: 'main' | 'extra';
  onOpen: (code: string) => void;
}) {
  const Icon = group === 'main' ? IconTestReportMain : IconTestReportExtra;
  // Диапазоны и общая ось есть, только если все шкалы группы с диапазонами
  const leveled = scales.every((s) => s.leveled);
  return (
    <CollapseCard title={title} id={`cc-${group}`}>
      <div className="cc-chart">
        {leveled && <Axis kind={group} ticks={data.ticks} max={data.max} />}
        <ul
          className={`cc-bars cc-bars--${group}`}
          style={{ '--cc-label': scales.some((s) => s.code.length > 1) ? '40px' : '28px' } as React.CSSProperties}
        >
          {scales.map((s, i) => (
            <li key={s.code} className="cc-bar">
              <span className="cc-bar__label">{rowLabel(data, s.code, i)}</span>
              <Bar data={data} scale={s} />
              <button type="button" className="cc-icon" aria-label={`К описанию шкалы ${s.name}`} onClick={() => onOpen(s.code)}>
                <Icon />
              </button>
            </li>
          ))}
        </ul>
        {leveled && <Legend data={data} />}
      </div>
      {group === 'extra' && data.validity && (
        <p className={`cc-validity${data.validity.ok ? '' : ' cc-validity--warn'}`}>
          <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
            {data.validity.ok ? (
              <path d="M21.3739 13.3738C21.7644 12.9833 21.7644 12.3502 21.3739 11.9596C20.9834 11.5691 20.3503 11.5691 19.9598 11.9596L14.0002 17.9191L12.0406 15.9597C11.6501 15.5691 11.0169 15.5691 10.6264 15.9597C10.2359 16.3502 10.2359 16.9833 10.6264 17.3738L13.2931 20.0405C13.6836 20.431 14.3167 20.431 14.7072 20.0405L21.3739 13.3738Z" />
            ) : (
              <path d="M15 9.5a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0v-7ZM16 19.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
            )}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.9998 1.66675C8.08376 1.66675 1.6665 8.084 1.6665 16.0001C1.6665 23.9162 8.08376 30.3334 15.9998 30.3334C23.916 30.3334 30.3332 23.9162 30.3332 16.0001C30.3332 8.084 23.916 1.66675 15.9998 1.66675ZM3.6665 16.0001C3.6665 9.18857 9.18833 3.66675 15.9998 3.66675C22.8113 3.66675 28.3332 9.18857 28.3332 16.0001C28.3332 22.8115 22.8113 28.3334 15.9998 28.3334C9.18833 28.3334 3.6665 22.8115 3.6665 16.0001Z"
            />
          </svg>
          <span>{data.validity.text}</span>
        </p>
      )}
    </CollapseCard>
  );
}

/** Общая диаграмма «Шкалы тестирования»: основная и дополнительные шкалы на одной оси, без легенды */
function SummaryChart({ data, onOpen }: { data: ConclusionData; onOpen: (code: string) => void }) {
  return (
    <CollapseCard title="Шкалы тестирования" id="cc-summary">
      <div className="cc-chart">
        <Axis kind="main" ticks={data.ticks} max={data.max} />
        <ul className="cc-bars cc-bars--main">
          {data.scales.map((s, i) => {
            const Icon = s.group === 'main' ? IconTestReportMain : IconTestReportExtra;
            return (
              <li key={s.code}>
                <div className="cc-bar">
                  <span className="cc-bar__label">{rowLabel(data, s.code, i)}</span>
                  {/* Полоса дополнительной шкалы идёт от 0 до её собственного максимума, подпись под ней: 0 и максимум */}
                  <Bar data={data} scale={s} max={s.leveled ? data.max : s.max} />
                  <button type="button" className="cc-icon" aria-label={`К описанию шкалы ${s.name}`} onClick={() => onOpen(s.code)}>
                    <Icon />
                  </button>
                </div>
                {!s.leveled && <Axis kind="main" ticks={[0, s.max]} max={s.max} />}
              </li>
            );
          })}
        </ul>
      </div>
    </CollapseCard>
  );
}

/** Профиль основных шкал: линия по пикам, коридор нормы 40–69, точки цвета диапазона */
function ProfileChart({ data, scales, onOpen }: { data: ConclusionData; scales: ConclusionScale[]; onOpen: (code: string) => void }) {
  const W = 337;
  const left = 28;
  const right = 14;
  const top = 22;
  const bottom = 150;
  const y = (v: number) => bottom - ((bottom - top) * v) / data.max;
  const step = (W - left - right) / scales.length;
  const x = (i: number) => left + step * (i + 0.5);
  const corridor = data.levels.find((l) => l.tone === 'green');
  const pts = scales.map((s, i) => ({ s, cx: x(i), cy: y(s.score), level: levelOf(data, s.score) }));
  return (
    <CollapseCard title="Профиль шкал" id="cc-profile">
      <div className="cc-profile">
        <svg viewBox={`0 0 ${W} ${bottom + 48}`} role="img" aria-label="Профиль шкал">
          {corridor && (
            <>
              <rect className="cc-profile__band" x={left} y={y(corridor.to + 1)} width={W - left - right} height={y(corridor.from) - y(corridor.to + 1)} />
              <line className="cc-profile__edge" x1={left} x2={W - right} y1={y(corridor.to + 1)} y2={y(corridor.to + 1)} />
              <line className="cc-profile__edge" x1={left} x2={W - right} y1={y(corridor.from)} y2={y(corridor.from)} />
            </>
          )}
          <line className="cc-profile__base" x1={left} x2={W - right} y1={bottom} y2={bottom} />
          {data.ticks.map((v) => (
            <text key={v} className="cc-profile__tick" x={left - 8} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          ))}
          <polyline className="cc-profile__line" points={pts.map((p) => `${p.cx},${p.cy}`).join(' ')} />
          {pts.map((p) => (
            <g key={p.s.code} className="cc-profile__point" onClick={() => onOpen(p.s.code)}>
              <circle className={`cc-profile__dot cc-profile__dot--${p.level.tone}`} cx={p.cx} cy={p.cy} r="6" />
              <text
                className={`cc-profile__value cc-profile__value--${p.level.tone}`}
                x={p.cx}
                y={p.level.tone === 'red' ? p.cy - 12 : p.cy + 24}
                textAnchor="middle"
              >
                {p.s.score}
              </text>
              <text className="cc-profile__code" x={p.cx} y={bottom + 28} textAnchor="middle">
                {p.s.code}
              </text>
            </g>
          ))}
          {pts.map((p, i) => (
            <text key={`n${p.s.code}`} className="cc-profile__num" x={p.cx} y={bottom + 46} textAnchor="middle">
              {i + 1}
            </text>
          ))}
        </svg>
        <Legend data={data} />
      </div>
    </CollapseCard>
  );
}

function ScaleCard({ data, scale, index, onChart }: { data: ConclusionData; scale: ConclusionScale; index: number; onChart: () => void }) {
  const pct = Math.round((scale.score / scale.max) * 100);
  const level = scale.leveled ? levelOf(data, scale.score) : undefined;
  // Сначала диапазон клиента, затем остальные по возрастанию
  const order = level ? [level, ...data.levels.filter((l) => l.key !== level.key)] : [];
  const texts = data.interpretation[scale.code] ?? {};
  return (
    <CollapseCard
      title={scale.name}
      id={`cc-scale-${scale.code}`}
      badge={data.overview ? <span className="cc-badge">Шкала {scale.code}</span> : undefined}
    >
      <div className="cc-scale">
        <p className="cc-scale__text">— {scale.about}</p>
        <p className="cc-scale__text">
          Шкала имеет{' '}
          <strong className={level ? `cc-tone--${level.tone}` : 'cc-tone--accent'}>
            {scale.score} {pointsWord(scale.score)}
          </strong>{' '}
          из {scale.max} <span className="cc-muted">({pct}%)</span>
          {level ? (
            <>
              , что {level.verdictPre}
              <strong className={`cc-tone--${level.tone}`}>{level.verdict}</strong>
              {level.verdictPost}
            </>
          ) : null}
          .
        </p>
        <div className={`cc-single${data.overview ? '' : ' cc-single--plain'}`}>
          <div className="cc-bar">
            {data.overview && <span className="cc-bar__label">{rowLabel(data, scale.code, index)}</span>}
            <Bar data={data} scale={scale} />
            {data.overview && (
              <button type="button" className="cc-icon" aria-label="К диаграмме шкал" onClick={onChart}>
                <IconTestScaleChart />
              </button>
            )}
          </div>
          <Axis kind="single" ticks={scale.leveled ? data.ticks : [0, scale.max]} max={scale.max} />
        </div>
      </div>
      {order.map((l) => (
        <section key={l.key} className="cc-level">
          <h3 className={`cc-level__head cc-tone--${l.tone}`}>
            <span className="cc-level__dot" />
            {l.range}
            <span className={`cc-level__chip cc-chip--${l.tone}`}>{l.chip}</span>
          </h3>
          {(texts[l.key] ?? []).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </CollapseCard>
  );
}

/** Разделы заключения для оглавления, по порядку на странице */
export function conclusionSections(data: ConclusionData) {
  return [
    { id: 'cc-info', title: 'Общая информация' },
    ...(data.summary ? [{ id: 'cc-summary', title: 'Шкалы тестирования' }] : []),
    ...(data.overview
      ? [
          { id: 'cc-main', title: 'Основные шкалы' },
          ...(data.profile ? [{ id: 'cc-profile', title: 'Профиль шкал' }] : []),
          { id: 'cc-extra', title: 'Дополнительные шкалы' },
        ]
      : []),
    ...data.scales.map((s) => ({ id: `cc-scale-${s.code}`, title: data.overview ? `${s.name} (${s.code})` : s.name })),
  ];
}

interface TestConclusionProps {
  data: ConclusionData;
  form: string;
  /** Есть сохранённый бланк: между общей информацией и шкалами появляется кнопка «Посмотреть бланк тестирования» */
  onOpenBlank?: () => void;
}

/** Заключение: общая информация, диаграммы шкал и карточка с расшифровкой каждой шкалы */
export function TestConclusion({ data, form, onOpenBlank }: TestConclusionProps) {
  const { info, scales } = data;
  const main = scales.filter((s) => s.group === 'main');
  const extra = scales.filter((s) => s.group === 'extra');

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <CollapseCard title="Общая информация" id="cc-info">
        <ul className="cc-info">
          <li>
            <IconCaseCalendar className="cc-info__icon" />
            <span className="cc-info__label">Дата прохождения</span>
            <span>{info.date}</span>
          </li>
          <li>
            <IconTestTimeStart className="cc-info__icon" />
            <span className="cc-info__label">Время прохождения</span>
            <span>{info.time}</span>
          </li>
          <li>
            <IconTestTime className="cc-info__icon" />
            <span className="cc-info__label">Длительность</span>
            <span>{info.duration}</span>
          </li>
          {info.age && (
            <li>
              <IconTestAge className="cc-info__icon" />
              <span className="cc-info__label">Возраст</span>
              <span>{info.age}</span>
            </li>
          )}
          {form && (
            <li>
              <IconTestGender className="cc-info__icon" />
              <span className="cc-info__label">Форма бланка</span>
              <span>{form}</span>
            </li>
          )}
        </ul>
      </CollapseCard>

      {onOpenBlank && (
        <ul className="ts-card ts-card--wide-dividers">
          <li
            className="ts-row ts-row--link"
            role="button"
            tabIndex={0}
            onClick={onOpenBlank}
            onKeyDown={(e) => e.key === 'Enter' && onOpenBlank()}
          >
            <IconTestBlank className="ts-row__icon" />
            <span className="ts-row__link">Посмотреть бланк тестирования</span>
            <IconTestChevron className="ts-row__chevron" />
          </li>
        </ul>
      )}

      {data.summary && <SummaryChart data={data} onOpen={(c) => scrollTo(`cc-scale-${c}`)} />}

      {data.overview && (
        <>
          <ScaleCharts data={data} title="Основные шкалы" scales={main} group="main" onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
          {data.profile && <ProfileChart data={data} scales={main} onOpen={(c) => scrollTo(`cc-scale-${c}`)} />}
          <ScaleCharts data={data} title="Дополнительные шкалы" scales={extra} group="extra" onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
        </>
      )}

      {main.map((s, i) => (
        <ScaleCard key={s.code} data={data} scale={s} index={i} onChart={() => scrollTo('cc-main')} />
      ))}
      {extra.map((s, i) => (
        <ScaleCard key={s.code} data={data} scale={s} index={i} onChart={() => scrollTo('cc-extra')} />
      ))}

      <p className="cc-note">
        Опросник — это диагностическая методика. Итоговые показатели описывают состояние человека на момент прохождения и не являются медицинским
        диагнозом.
      </p>
    </>
  );
}
