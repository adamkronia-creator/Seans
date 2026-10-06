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
import {
  LEVELS,
  LEVEL_ORDER,
  SMOL_CONCLUSION,
  SMOL_MAX,
  interpretation,
  levelOf,
  type ConclusionScale,
  type ScaleLevel,
} from '../../data/smolConclusion';
import { CollapseCard } from './TestBlank';
import './TestConclusion.css';

/** Подписи оси 0 · 40 · 70 · 110: положение в долях ширины карточки, как в макете */
const AXIS = {
  main: [16.9, 40.4, 59.6, 89.2],
  extra: [16.9, 40.4, 64.5, 90],
  single: [16.9, 40.4, 59.6, 89.2],
} as const;
const AXIS_VALUES = [0, 40, 70, 110];

function Axis({ kind }: { kind: keyof typeof AXIS }) {
  return (
    <div className="cc-axis" aria-hidden="true">
      {AXIS_VALUES.map((v, i) => (
        <span key={v} style={{ left: `${AXIS[kind][i]}%` }}>
          {v}
        </span>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <ul className="cc-legend">
      {LEVEL_ORDER.map((level) => (
        <li key={level} className={`cc-chip cc-chip--${LEVELS[level].tone}`}>
          <span className="cc-chip__dot" />
          {LEVELS[level].legend}
        </li>
      ))}
    </ul>
  );
}

/** Полоса шкалы: заливка цвета диапазона по баллу из 110 и значение у конца полосы */
function Bar({ score }: { score: number }) {
  const level = levelOf(score);
  const pct = (score / SMOL_MAX) * 100;
  return (
    <span className="cc-track">
      <span className={`cc-fill cc-fill--${LEVELS[level].tone}`} style={{ width: `${pct}%` }} />
      <span className="cc-value" style={{ left: `calc(${pct}% + 4px)` }}>
        {score}
      </span>
    </span>
  );
}

function ScaleCharts({
  title,
  scales,
  group,
  onOpen,
}: {
  title: string;
  scales: ConclusionScale[];
  group: 'main' | 'extra';
  onOpen: (code: string) => void;
}) {
  const Icon = group === 'main' ? IconTestReportMain : IconTestReportExtra;
  return (
    <CollapseCard large title={title} id={`cc-${group}`}>
      <div className="cc-chart">
        <Axis kind={group} />
        <ul className={`cc-bars cc-bars--${group}`}>
          {scales.map((s, i) => (
            <li key={s.code} className="cc-bar">
              <span className="cc-bar__label">
                {i + 1}. {s.code}
              </span>
              <Bar score={s.score} />
              <button type="button" className="cc-icon" aria-label={`К описанию шкалы ${s.name}`} onClick={() => onOpen(s.code)}>
                <Icon />
              </button>
            </li>
          ))}
        </ul>
        <Legend />
      </div>
    </CollapseCard>
  );
}

function ScaleCard({ scale, index, onChart }: { scale: ConclusionScale; index: number; onChart: () => void }) {
  const level = levelOf(scale.score);
  const meta = LEVELS[level];
  const pct = Math.round((scale.score / SMOL_MAX) * 100);
  // Сначала диапазон клиента, затем остальные по возрастанию
  const order: ScaleLevel[] = [level, ...LEVEL_ORDER.filter((l) => l !== level)];
  return (
    <CollapseCard
      large
      title={scale.name}
      id={`cc-scale-${scale.code}`}
      badge={<span className="cc-badge">Шкала {scale.code}</span>}
    >
      <div className="cc-scale">
        <p className="cc-scale__text">— {scale.about}</p>
        <p className="cc-scale__text">
          Шкала имеет <strong className={`cc-tone--${meta.tone}`}>{scale.score} баллов</strong> из {SMOL_MAX}{' '}
          <span className="cc-muted">({pct}%)</span>, что является{' '}
          <strong className={`cc-tone--${meta.tone}`}>{meta.verdict}</strong> показателем.
        </p>
        <div className="cc-single">
          <div className="cc-bar">
            <span className="cc-bar__label">
              {index + 1}. {scale.code}
            </span>
            <Bar score={scale.score} />
            <button type="button" className="cc-icon" aria-label="К диаграмме шкал" onClick={onChart}>
              <IconTestScaleChart />
            </button>
          </div>
          <Axis kind="single" />
        </div>
      </div>
      {order.map((l) => (
        <section key={l} className="cc-level">
          <h3 className={`cc-level__head cc-tone--${LEVELS[l].tone}`}>
            <span className="cc-level__dot" />
            {LEVELS[l].range}
            <span className={`cc-level__chip cc-chip--${LEVELS[l].tone}`}>{LEVELS[l].chip}</span>
          </h3>
          {interpretation(scale.code, l).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </CollapseCard>
  );
}

/** Пример заключения по СМОЛ: общая информация, диаграммы шкал и карточка с расшифровкой каждой шкалы */
export function TestConclusion({ form }: { form: string }) {
  const { info, scales } = SMOL_CONCLUSION;
  const main = scales.filter((s) => s.group === 'main');
  const extra = scales.filter((s) => s.group === 'extra');

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <CollapseCard large title="Общая информация">
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

      <ScaleCharts title="Основные шкалы" scales={main} group="main" onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
      <ScaleCharts title="Дополнительные шкалы" scales={extra} group="extra" onOpen={(c) => scrollTo(`cc-scale-${c}`)} />

      {main.map((s, i) => (
        <ScaleCard key={s.code} scale={s} index={i} onChart={() => scrollTo('cc-main')} />
      ))}
      {extra.map((s, i) => (
        <ScaleCard key={s.code} scale={s} index={i} onChart={() => scrollTo('cc-extra')} />
      ))}
    </>
  );
}
