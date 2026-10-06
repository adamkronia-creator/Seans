import {
  IconCaseCalendar,
  IconTestAge,
  IconTestGender,
  IconTestReportExtra,
  IconTestReportMain,
  IconTestScaleChart,
  IconTestTime,
  IconTestTimeStart,
} from '../icons';
import { levelOf, type ConclusionData, type ConclusionScale } from '../../data/conclusions';
import { CollapseCard } from './TestBlank';
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
function Bar({ data, scale }: { data: ConclusionData; scale: ConclusionScale }) {
  const pct = (scale.score / scale.max) * 100;
  const tone = scale.leveled ? levelOf(data, scale.score).tone : 'accent';
  return (
    <span className="cc-track">
      {scale.leveled &&
        data.levels
          .filter((l) => l.from > 0)
          .map((l) => <span key={l.key} className="cc-norm" style={{ left: `${(l.from / scale.max) * 100}%` }} aria-hidden="true" />)}
      <span className={`cc-fill cc-fill--${tone}`} style={{ width: `${pct}%` }} />
      <span className="cc-value" style={{ left: `calc(${pct}% + 4px)` }}>
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
            <span className="cc-bar__label">{rowLabel(data, scale.code, index)}</span>
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
    ...(data.overview
      ? [
          { id: 'cc-main', title: 'Основные шкалы' },
          { id: 'cc-extra', title: 'Дополнительные шкалы' },
        ]
      : []),
    ...data.scales.map((s) => ({ id: `cc-scale-${s.code}`, title: `${s.name} (${s.code})` })),
  ];
}

/** Пример заключения: общая информация, диаграммы шкал и карточка с расшифровкой каждой шкалы */
export function TestConclusion({ data, form }: { data: ConclusionData; form: string }) {
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
          <li>
            <IconTestAge className="cc-info__icon" />
            <span className="cc-info__label">Возраст</span>
            <span>{info.age}</span>
          </li>
          <li>
            <IconTestGender className="cc-info__icon" />
            <span className="cc-info__label">Форма бланка</span>
            <span>{form}</span>
          </li>
        </ul>
      </CollapseCard>

      {data.overview && (
        <>
          <ScaleCharts data={data} title="Основные шкалы" scales={main} group="main" onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
          <ScaleCharts data={data} title="Дополнительные шкалы" scales={extra} group="extra" onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
        </>
      )}

      {main.map((s, i) => (
        <ScaleCard key={s.code} data={data} scale={s} index={i} onChart={() => scrollTo('cc-main')} />
      ))}
      {extra.map((s, i) => (
        <ScaleCard key={s.code} data={data} scale={s} index={i} onChart={() => scrollTo('cc-extra')} />
      ))}
    </>
  );
}
