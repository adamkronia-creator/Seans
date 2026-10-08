import { useState } from 'react';
import {
  IconCaseCalendar,
  IconTestAge,
  IconTestBlank,
  IconTestChevron,
  IconTestGender,
  IconTestReportExtra,
  IconTestReportMain,
  IconTestTime,
  IconTestTimeStart,
} from '../icons';
import { levelOf, type ConclusionData, type ConclusionScale } from '../../data/conclusions';
import { CollapseCard } from './TestBlank';
import './TestSettings.css';
import './TestConclusion.css';

/** Число для показа: десятичная запятая («3,2»), целые без дроби */
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Ось: подписи стоят над своими местами на полосе (та же геометрия, что у строк) */
function Axis({ kind, ticks, max, flat }: { kind: 'main' | 'extra' | 'single'; ticks: number[]; max: number; flat?: boolean }) {
  return (
    <div className={`cc-axis cc-axis--${kind}${flat ? ' cc-axis--flat' : ''}`} aria-hidden="true">
      <div className="cc-axis__scale">
        {ticks.map((v) => (
          <span key={v} style={{ left: `${(v / max) * 100}%` }}>
            {fmt(v)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Полное название шкалы над столбцом: «Ипохондрия (Hs)», при общих диаграммах с номером — «1. Ипохондрия (Hs)».
 * Код в скобках не переносится по дефису («ЭД-С» на узком экране не должен разорваться), номер не отрывается от названия.
 */
function RowName({ data, scale, index }: { data: ConclusionData; scale: ConclusionScale; index: number }) {
  return (
    <span className="cc-bar__name">
      {data.overview ? `${index + 1}.\u00A0` : ''}
      {scale.name} <span className="cc-bar__code">({scale.code})</span>
    </span>
  );
}

/** Склонение: 1 балл, 2–4 балла, 5–20 баллов */
export function pointsWord(n: number) {
  if (!Number.isInteger(n)) return 'балла'; // 3,2 балла
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
        {fmt(scale.score)}
      </span>
    </span>
  );
}

function ScaleCharts({
  data,
  title,
  id,
  scales,
  legend,
  validity,
  onOpen,
}: {
  data: ConclusionData;
  title: string;
  id: string;
  scales: ConclusionScale[];
  legend?: boolean;
  validity?: boolean;
  onOpen: (code: string) => void;
}) {
  return (
    <CollapseCard title={title} id={id}>
      <div className="cc-chart cc-chart--flat">
        <ul className="cc-bars cc-bars--main">
          {scales.map((s, i) => (
            <li key={s.code} id={`cc-bar-${s.code}`}>
              {/* Строка целиком ведёт к описанию шкалы; из карточки та же полоса ведёт обратно */}
              <div
                className="cc-row"
                role="button"
                tabIndex={0}
                aria-label={`К описанию шкалы ${s.name}`}
                onClick={() => onOpen(s.code)}
                onKeyDown={(e) => e.key === 'Enter' && onOpen(s.code)}
              >
                <span className="cc-bar__name">
                  {data.overview ? `${i + 1}.\u00A0` : ''}
                  {s.chartName ?? s.name} <span className="cc-bar__code">({s.code})</span>
                </span>
                <div className="cc-bar">
                  <Bar data={data} scale={s} />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Axis kind="main" ticks={data.ticks} max={data.max} flat />
        {legend && <Legend data={data} />}
      </div>
      {validity && data.validity && (
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

/**
 * Блок диаграммы («Шкалы тестирования» или один из блоков теста): полосы шкал, под каждой подпись оси с небольшим отступом.
 * У шкалы без диапазонов полоса идёт от 0 до её собственного максимума; маркеры диапазонов внизу отделены разделителем.
 */
function ScaleBlock({
  data,
  title,
  id,
  scales,
  legend,
  onOpen,
}: {
  data: ConclusionData;
  title: string;
  id: string;
  scales: ConclusionScale[];
  legend?: boolean;
  onOpen: (code: string) => void;
}) {
  return (
    <CollapseCard title={title} id={id}>
      <div className="cc-chart">
        <ul className="cc-bars cc-bars--main">
          {scales.map((s, i) => {
            const Icon = s.group === 'main' ? IconTestReportMain : IconTestReportExtra;
            return (
              <li key={s.code}>
                <RowName data={data} scale={s} index={i} />
                <div className="cc-bar">
                  <Bar data={data} scale={s} max={s.leveled ? data.max : s.max} />
                  <button type="button" className="cc-icon" aria-label={`К описанию шкалы ${s.name}`} onClick={() => onOpen(s.code)}>
                    <Icon />
                  </button>
                </div>
                <Axis kind="main" ticks={s.leveled ? data.ticks : [0, s.max]} max={s.leveled ? data.max : s.max} />
              </li>
            );
          })}
        </ul>
        {legend && <Legend data={data} />}
      </div>
    </CollapseCard>
  );
}

function ScaleCard({ data, scale, onChart }: { data: ConclusionData; scale: ConclusionScale; onChart?: () => void }) {
  const [open, setOpen] = useState(false);
  // Вид как у СМОЛ: полоса с границами диапазонов, расшифровка с «Читать далее»
  const flat = data.overview || !!data.flat;
  const pct = Math.round((scale.score / scale.max) * 100);
  const level = scale.leveled ? levelOf(data, scale.score) : undefined;
  // Сначала диапазон клиента, затем остальные по возрастанию
  const order = level ? [level, ...data.levels.filter((l) => l.key !== level.key)] : [];
  const texts = data.interpretation[scale.code] ?? {};
  const renderLevel = (l: (typeof order)[number]) => (
    <section key={l.key} className={`cc-level${flat ? ' cc-level--flat' : ''}`}>
      <h3 className={`cc-level__head cc-tone--${l.tone}`}>
        <span className="cc-level__dot" />
        {flat ? `${l.range}: ${data.overview ? `${l.chip} показатель` : l.chip}` : l.range}
        {!flat && <span className={`cc-level__chip cc-chip--${l.tone}`}>{l.chip}</span>}
      </h3>
      {(texts[l.key] ?? []).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
  return (
    <CollapseCard
      title={scale.name}
      id={`cc-scale-${scale.code}`}
      badge={data.overview || data.blocks ? <span className="cc-badge">Шкала {scale.code}</span> : undefined}
    >
      <div className="cc-scale">
        <p className="cc-scale__text">— {scale.about}</p>
        <p className="cc-scale__text">
          Шкала имеет{' '}
          <strong className={level ? `cc-tone--${level.tone}` : 'cc-tone--accent'}>
            {fmt(scale.score)} {pointsWord(scale.score)}
          </strong>{' '}
          из {fmt(scale.max)} <span className="cc-muted">({pct}%)</span>
          {level ? (
            <>
              , что {level.verdictPre}
              <strong className={`cc-tone--${level.tone}`}>{level.verdict}</strong>
              {level.verdictPost}
            </>
          ) : null}
          .
        </p>
        {flat ? (
          <div
            className={`cc-single cc-single--flat${onChart ? ' cc-row' : ''}`}
            {...(onChart ? { role: 'button', tabIndex: 0, 'aria-label': 'К диаграмме шкал', onClick: onChart, onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && onChart() } : {})}
          >
            <div className="cc-bar">
              <Bar data={data} scale={scale} />
            </div>
            <Axis kind="single" ticks={scale.leveled ? data.ticks : [0, scale.max]} max={scale.max} flat />
          </div>
        ) : (
          <div className={`cc-single${data.overview ? '' : ' cc-single--plain'}`}>
            <div className="cc-bar">
              <Bar data={data} scale={scale} />
            </div>
            <Axis kind="single" ticks={scale.leveled ? data.ticks : [0, scale.max]} max={scale.max} />
          </div>
        )}
      </div>
      {(flat ? order.slice(0, 1) : order).map(renderLevel)}
      {flat && order.length > 1 && (
        <>
          {/* Свёрнуто — кнопка между диапазоном клиента и остальными; развёрнуто — «Скрыть» в самом конце */}
          {!open && (
            <div className="cc-more">
              <button type="button" className="ts-desc__toggle" aria-expanded={false} onClick={() => setOpen(true)}>
                Читать далее
              </button>
            </div>
          )}
          <div className={`cc-rest${open ? ' cc-rest--open' : ''}`}>
            <div className="cc-rest__inner">{order.slice(1).map(renderLevel)}</div>
          </div>
          {open && (
            <div className="cc-more cc-more--end">
              <button type="button" className="ts-desc__toggle" aria-expanded onClick={() => setOpen(false)}>
                Скрыть
              </button>
            </div>
          )}
        </>
      )}
    </CollapseCard>
  );
}

/** Разделы заключения для оглавления, по порядку на странице */
export function conclusionSections(data: ConclusionData) {
  return [
    { id: 'cc-info', title: 'Общая информация' },
    ...(data.summary ? [{ id: 'cc-summary', title: 'Шкалы тестирования' }] : []),
    ...(data.blocks ?? []).map((b) => ({ id: `cc-block-${b.key}`, title: b.title })),
    ...(data.overview
      ? [
          { id: 'cc-main', title: 'Основные шкалы' },
          { id: 'cc-extra', title: 'Дополнительные шкалы' },
        ]
      : []),
    ...data.scales.map((s) => ({ id: `cc-scale-${s.code}`, title: data.overview || data.blocks ? `${s.name} (${s.code})` : s.name })),
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

  const scrollTo = (id: string, block: ScrollLogicalPosition = 'start') => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block });
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

      {data.summary && (
        <ScaleBlock data={data} title="Шкалы тестирования" id="cc-summary" scales={scales} onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
      )}

      {data.blocks?.map((b) =>
        data.flat ? (
          <ScaleCharts
            key={b.key}
            data={data}
            title={b.title}
            id={`cc-block-${b.key}`}
            scales={scales.filter((s) => s.block === b.key)}
            legend
            onOpen={(c) => scrollTo(`cc-scale-${c}`)}
          />
        ) : (
          <ScaleBlock
            key={b.key}
            data={data}
            title={b.title}
            id={`cc-block-${b.key}`}
            scales={scales.filter((s) => s.block === b.key)}
            legend
            onOpen={(c) => scrollTo(`cc-scale-${c}`)}
          />
        ),
      )}

      {data.overview && (
        <>
          <ScaleCharts data={data} title="Основные шкалы" id="cc-main" scales={main} legend onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
          <ScaleCharts data={data} title="Дополнительные шкалы" id="cc-extra" scales={extra} validity onOpen={(c) => scrollTo(`cc-scale-${c}`)} />
        </>
      )}

      {data.blocks ? (
        // Карточки идут в порядке блоков: основная шкала блока и её дополнительные
        scales.map((s) => <ScaleCard key={s.code} data={data} scale={s} onChart={s.block ? () => (data.flat ? scrollTo(`cc-bar-${s.code}`, 'center') : scrollTo(`cc-block-${s.block}`)) : undefined} />)
      ) : (
        <>
          {main.map((s) => (
            <ScaleCard key={s.code} data={data} scale={s} onChart={data.overview ? () => scrollTo(`cc-bar-${s.code}`, 'center') : undefined} />
          ))}
          {extra.map((s) => (
            <ScaleCard key={s.code} data={data} scale={s} onChart={data.overview ? () => scrollTo(`cc-bar-${s.code}`, 'center') : undefined} />
          ))}
        </>
      )}

      <p className="cc-note">
        Опросник — это диагностическая методика. Итоговые показатели описывают состояние человека на момент прохождения и не являются медицинским
        диагнозом.
      </p>
    </>
  );
}
