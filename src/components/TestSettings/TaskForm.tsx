import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { IconClose } from '../ChatParts/ChatIcons';
import { IconPlus, IconTestChevronDown } from '../icons';
import { IconTaskState } from './TaskIcons';
import { BlankRules, CollapseCard } from './TestBlank';
import {
  ownShare,
  starterOf,
  type PieFactor,
  type TaskField,
  type TaskSection,
  type TaskSettingsData,
  type TaskValues,
} from '../../data/taskValues';
import './TaskForm.css';

/*
 * Бланк задания: те же карточки видит специалист в «Бланке задания», «Примере выполнения» и результате,
 * а клиент (и специалист, который проходит задание сам) заполняет их. Без `onChange` бланк показан только для просмотра.
 */

const MAX_TEXT = 3000;
const MAX_FACTORS = 8;
/** Цвета долей «пирога»: спокойные серо-голубые, доля самого клиента — акцентным цветом */
const PIE_COLORS = ['#5E6B7B', '#8E9AAB', '#B4BDC9', '#6F7F95', '#9FB0C8', '#CBD3DD', '#7C8BA0', '#A9B4C2'];
const colorOf = (i: number) => PIE_COLORS[i % PIE_COLORS.length];

// ——— Поля ———

/** Поле ответа: растет по тексту */
export function AnswerField({ value, onChange, label, placeholder, rows = 1 }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fit, [value]);
  // Ширина поля устанавливается уже после первой отрисовки (и при повороте экрана): высоту считаем заново
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      ref={ref}
      className="task-field"
      rows={rows}
      maxLength={MAX_TEXT}
      value={value}
      placeholder={placeholder ?? 'Ваш ответ'}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Ответ в просмотре: текст клиента акцентным цветом, пустой — тихой подписью */
function Answer({ text }: { text?: string }) {
  return text?.trim() ? <p className="task-answer">{text}</p> : <p className="tf-empty">Не заполнено</p>;
}

/** Ползунок процентов; у ответа без выбора вместо числа подсказка */
export function PercentSlider({ value, onChange, label, max = 100 }: { value: number | undefined; onChange: (v: number) => void; label: string; max?: number }) {
  const shown = value === undefined ? 0 : Math.min(value, max);
  return (
    <div className={`tf-percent${value === undefined ? ' tf-percent--unset' : ''}`}>
      <input
        type="range"
        className="tf-percent__range"
        min={0}
        max={100}
        step={5}
        value={shown}
        aria-label={label}
        aria-valuetext={value === undefined ? 'Не выбрано' : `${shown}%`}
        style={{ '--fill': shown } as React.CSSProperties}
        onChange={(e) => onChange(Math.min(Number(e.target.value), max))}
      />
      <output className="tf-percent__value">{value === undefined ? '—' : `${shown}%`}</output>
    </div>
  );
}

/** Кольцо долей: доли факторов серо-голубым, остаток — доля самого клиента акцентным */
export function PieChart({ factors, ownLabel }: { factors: PieFactor[]; ownLabel: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const own = ownShare(factors);
  const slices = [...factors.map((f, i) => ({ percent: f.percent, color: colorOf(i) })), { percent: own, color: 'var(--color-accent)' }].filter((s) => s.percent > 0);
  const gap = slices.length > 1 ? 1.2 : 0;
  let offset = 0;
  return (
    <figure className="tf-pie">
      <svg className="tf-pie__svg" viewBox="0 0 120 120" role="img" aria-label={`${ownLabel}: ${own}%`}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-bg-fill)" strokeWidth="20" />
        {slices.map((s, i) => {
          const len = (C * s.percent) / 100;
          const circle = (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeDasharray={`${Math.max(len - gap, 0.01)} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += len;
          return circle;
        })}
      </svg>
      <figcaption className="tf-pie__center">
        <strong>{own}%</strong>
        <span>{ownLabel}</span>
      </figcaption>
    </figure>
  );
}

/** Доли ответственности: список факторов с ползунками, доля клиента — остаток до 100, кольцо */
function Factors({ field, list, onChange }: { field: Extract<TaskField, { kind: 'factors' }>; list: PieFactor[]; onChange?: (next: PieFactor[]) => void }) {
  const own = ownShare(list);

  if (!onChange) {
    return (
      <div className="tf-factors">
        <PieChart factors={list} ownLabel={field.ownLabel} />
        <ul className="tf-legend">
          {list.map((f, i) => (
            <li key={i}>
              <span className="tf-dot" style={{ background: colorOf(i) }} />
              <span className="tf-legend__name">{f.name}</span>
              <span className="tf-legend__value">{f.percent}%</span>
            </li>
          ))}
          <li className="tf-legend__own">
            <span className="tf-dot tf-dot--own" />
            <span className="tf-legend__name">{field.ownLabel}</span>
            <span className="tf-legend__value">{own}%</span>
          </li>
        </ul>
      </div>
    );
  }

  // Пока ничего не добавлено, показана одна пустая строка: можно сразу писать
  const rows = list.length > 0 ? list : [{ name: '', percent: 0 }];
  const patch = (index: number, change: Partial<PieFactor>) => onChange(rows.map((f, i) => (i === index ? { ...f, ...change } : f)));
  return (
    <div className="tf-factors">
      <PieChart factors={rows} ownLabel={field.ownLabel} />
      <ul className="tf-factor-list">
        {rows.map((f, i) => {
          const others = rows.reduce((sum, x, j) => (j === i ? sum : sum + x.percent), 0);
          return (
            <li key={i} className="tf-factor">
              <div className="tf-factor__head">
                <span className="tf-dot" style={{ background: colorOf(i) }} />
                <input
                  className="tf-factor__name"
                  value={f.name}
                  maxLength={80}
                  placeholder={field.namePlaceholder}
                  aria-label={`Фактор ${i + 1}`}
                  onChange={(e) => patch(i, { name: e.target.value })}
                />
                {rows.length > 1 && (
                  <button type="button" className="tf-factor__remove" aria-label={`Удалить фактор ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                    <IconClose />
                  </button>
                )}
              </div>
              <PercentSlider value={f.percent} max={100 - others} label={`Доля фактора ${i + 1}`} onChange={(percent) => patch(i, { percent })} />
            </li>
          );
        })}
      </ul>
      {rows.length < MAX_FACTORS && (
        <button type="button" className="tf-add" onClick={() => onChange([...rows, { name: '', percent: 0 }])}>
          <IconPlus />
          {field.addLabel}
        </button>
      )}
      <div className="tf-own">
        <span className="tf-dot tf-dot--own" />
        <span className="tf-own__label">{field.ownLabel}</span>
        <strong className="tf-own__value">{own}%</strong>
      </div>
    </div>
  );
}

/** Шкала «Как вы себя чувствуете?» */
export function StateScale({ labels, value, onChange }: { labels: string[]; value?: number; onChange?: (i: number) => void }) {
  return (
    <ul className="blank-answers" role="radiogroup" aria-label="Как вы себя чувствуете">
      {labels.map((label, i) => (
        <li key={label}>
          <label className={`blank-answer${onChange ? '' : ' blank-answer--locked'}`}>
            <input type="radio" className="blank-answer__input" name="task-state" checked={value === i} disabled={!onChange} onChange={() => onChange?.(i)} />
            <span className="blank-answer__radio" aria-hidden="true" />
            <span className="blank-answer__text task-state__text">
              <IconTaskState level={i} className="task-state__icon" />
              {label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

// ——— Бланк ———

interface FieldProps {
  field: TaskField;
  /** Номер поля среди предложений: стоит перед началом */
  number: number;
  values: TaskValues;
  onChange?: (next: TaskValues) => void;
}

function FieldBody({ field, number, values, onChange }: FieldProps) {
  const text = values.text[field.id] ?? '';
  const setText = (value: string) => onChange?.({ ...values, text: { ...values.text, [field.id]: value } });

  switch (field.kind) {
    case 'sentence': {
      const picked = starterOf(field, values);
      return (
        <>
          {onChange ? (
            <>
              <div className="tf-sentence">
                <strong className="tf-sentence__number">{number}.</strong>
                {/* Начало предложения: выбранное показано сразу, остальные — в списке, как у других выборов в настройках */}
                <label className="ts-select tf-starter">
                  <span className="ts-select__value">{field.starters[picked]}</span>
                  <IconTestChevronDown className="ts-select__chevron" />
                  <select
                    className="ts-select__native"
                    aria-label={`Начало предложения ${number}`}
                    value={picked}
                    onChange={(e) => onChange({ ...values, starter: { ...values.starter, [field.id]: Number(e.target.value) } })}
                  >
                    {field.starters.map((starter, i) => (
                      <option key={starter} value={i}>
                        {starter}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <AnswerField value={text} onChange={setText} label={`Предложение ${number}`} placeholder="Продолжите предложение" />
            </>
          ) : (
            <>
              <p className="blank-question__prompt">
                <strong>{number}.</strong> {field.starters[picked]}
              </p>
              <Answer text={text} />
            </>
          )}
        </>
      );
    }
    case 'text':
      return (
        <>
          {field.label && <p className="blank-question__prompt">{field.label}</p>}
          {field.hint && <p className="task-hint">{field.hint}</p>}
          {onChange ? <AnswerField value={text} onChange={setText} label={field.label ?? 'Ответ'} placeholder={field.placeholder} rows={field.rows} /> : <Answer text={text} />}
        </>
      );
    case 'percent': {
      const value = values.percent[field.id];
      return (
        <>
          <p className="blank-question__prompt">{field.label}</p>
          {field.hint && <p className="task-hint">{field.hint}</p>}
          {onChange ? (
            <PercentSlider value={value} label={field.label} onChange={(v) => onChange({ ...values, percent: { ...values.percent, [field.id]: v } })} />
          ) : value === undefined ? (
            <p className="tf-empty">Не заполнено</p>
          ) : (
            <p className="task-answer">{value}%</p>
          )}
        </>
      );
    }
    case 'factors': {
      const list = values.factors[field.id] ?? [];
      return (
        <>
          <p className="blank-question__prompt">{field.label}</p>
          {field.hint && <p className="task-hint">{field.hint}</p>}
          <Factors field={field} list={list} onChange={onChange && ((next) => onChange({ ...values, factors: { ...values.factors, [field.id]: next } }))} />
        </>
      );
    }
  }
}

/** Блок бланка: карточка с заголовком; в «плоском» виде (экран телефона клиента) это заголовок и поля без карточки */
function Block({ title, flat, children }: { title: string; flat: boolean; children: ReactNode }) {
  return flat ? (
    <section className="tf-flat">
      <h4 className="tp__label">{title}</h4>
      {children}
    </section>
  ) : (
    <CollapseCard title={title}>{children}</CollapseCard>
  );
}

/** Раздел бланка: каждое поле — вопрос с линией между ними, как в бланке теста */
export function TaskSectionCard({ section, values, onChange, flat = false }: { section: TaskSection; values: TaskValues; onChange?: (next: TaskValues) => void; flat?: boolean }) {
  let sentence = 0;
  return (
    <Block title={section.title} flat={flat}>
      {section.hint && <p className={`task-hint${flat ? '' : ' tf-section-hint'}`}>{section.hint}</p>}
      <ol className="blank-questions">
        {section.fields.map((field) => (
          <li key={field.id} className="blank-question">
            <FieldBody field={field} number={field.kind === 'sentence' ? ++sentence : 0} values={values} onChange={onChange} />
          </li>
        ))}
      </ol>
    </Block>
  );
}

interface TaskFormProps {
  data: TaskSettingsData;
  form: string;
  /** Что включено в настройках: от этого зависит, что есть в бланке */
  options: { comment: boolean; state: boolean };
  values: TaskValues;
  /** Без обработчика бланк показан только для просмотра */
  onChange?: (next: TaskValues) => void;
  /** Первой карточкой идёт инструкция (в бланке задания; при выполнении она на отдельном экране) */
  rules?: boolean;
  /** Без карточек: заголовки и поля прямо на белом (экран телефона клиента) */
  flat?: boolean;
  /** Что стоит между разделами и комментарием: например, пояснение */
  after?: ReactNode;
}

/** Бланк задания целиком: инструкция (по желанию), разделы с полями, комментарий и шкала состояния, если они включены */
export function TaskForm({ data, form, options, values, onChange, rules = false, flat = false, after }: TaskFormProps) {
  const sections = data.blank.sections(form);
  return (
    <>
      {rules && (
        <CollapseCard title="Правила задания" id="blank-rules">
          <BlankRules rules={data.blank.rules(form)} />
        </CollapseCard>
      )}
      {sections.map((section) => (
        <TaskSectionCard key={section.id} section={section} values={values} onChange={onChange} flat={flat} />
      ))}
      {options.comment && (
        <Block title="Комментарий" flat={flat}>
          <div className="task-pad">
            {onChange && <p className="task-hint">{data.blank.commentHint}</p>}
            {onChange ? (
              <AnswerField value={values.comment} onChange={(comment) => onChange({ ...values, comment })} label="Комментарий" placeholder="Ваш комментарий" />
            ) : (
              <Answer text={values.comment} />
            )}
          </div>
        </Block>
      )}
      {options.state && (
        <Block title="Как вы себя чувствуете?" flat={flat}>
          <div className="task-pad">
            <StateScale labels={data.blank.state} value={values.state} onChange={onChange && ((state) => onChange({ ...values, state }))} />
          </div>
        </Block>
      )}
      {after}
    </>
  );
}
