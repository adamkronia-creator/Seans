import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { IconClose, IconPlus, IconTaskState, IconTestChevronDown } from '../icons';
import { BlankRules, CollapseCard } from './TestBlank';
import {
  emptyValues,
  entriesOf,
  entryFields,
  filledEntries,
  listOf,
  ownShare,
  starterOf,
  type ChoiceField,
  type EntriesField,
  type ListField,
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

/** Ползунок оценки: `top` — верхний край шкалы, `cap` — выше чего поднять бегунок нельзя; у ответа без выбора вместо числа тире */
function Slider({
  value,
  onChange,
  label,
  top,
  step,
  cap = top,
  text,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  label: string;
  top: number;
  step: number;
  cap?: number;
  text: (v: number) => string;
}) {
  const shown = value === undefined ? 0 : Math.min(value, cap);
  return (
    <div className={`tf-percent${value === undefined ? ' tf-percent--unset' : ''}`}>
      <input
        type="range"
        className="tf-percent__range"
        min={0}
        max={top}
        step={step}
        value={shown}
        aria-label={label}
        aria-valuetext={value === undefined ? 'Не выбрано' : text(shown)}
        style={{ '--fill': (shown / top) * 100 } as CSSProperties}
        onChange={(e) => onChange(Math.min(Number(e.target.value), cap))}
        // Пока оценку не выбрали, бегунок стоит на нуле, и нажатие на него ничего не меняет: засчитываем «0», когда палец отпустили
        onPointerUp={(e) => value === undefined && onChange(Math.min(Number(e.currentTarget.value), cap))}
      />
      <output className="tf-percent__value">{value === undefined ? '—' : text(shown)}</output>
    </div>
  );
}

/** Ползунок процентов (0–100, шаг 5) */
export function PercentSlider({ value, onChange, label, max = 100 }: { value: number | undefined; onChange: (v: number) => void; label: string; max?: number }) {
  return <Slider value={value} onChange={onChange} label={label} top={100} step={5} cap={max} text={(v) => `${v}%`} />;
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

/** Подпись для программы чтения: у полей записи впереди номер записи, иначе у трёх записей были бы три одинаковых «Ситуация» */
const named = (scope: string | undefined, label: string) => (scope ? `${scope}: ${label}` : label);

/** Выбор из вариантов: один — список с кружками, несколько — чипсы; в просмотре показан только выбранный */
function Choice({ field, picked, onChange, scope }: { field: ChoiceField; picked: number[]; onChange?: (next: number[]) => void; scope?: string }) {
  const group = useId();
  const label = named(scope, field.label);
  if (!onChange) {
    if (picked.length === 0) return <p className="tf-empty">Не заполнено</p>;
    return field.multiple ? (
      <ul className="tf-chips" aria-label={label}>
        {picked.map((i) => (
          <li key={i} className="tf-chip tf-chip--static">
            {field.options[i]}
          </li>
        ))}
      </ul>
    ) : (
      <p className="task-answer">{field.options[picked[0]]}</p>
    );
  }
  if (field.multiple) {
    return (
      <ul className="tf-chips" aria-label={label}>
        {field.options.map((option, i) => {
          const on = picked.includes(i);
          return (
            <li key={option}>
              <button
                type="button"
                className={`tf-chip${on ? ' tf-chip--on' : ''}`}
                aria-pressed={on}
                onClick={() => onChange(on ? picked.filter((p) => p !== i) : [...picked, i].sort((a, b) => a - b))}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="blank-answers" role="radiogroup" aria-label={label}>
      {field.options.map((option, i) => (
        <li key={option}>
          <label className="blank-answer">
            <input type="radio" className="blank-answer__input" name={group} checked={picked[0] === i} onChange={() => onChange([i])} />
            <span className="blank-answer__radio" aria-hidden="true" />
            <span className="blank-answer__text">{option}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Список строк: доказательства «за» или «против». Строки можно добавлять и убирать (одна остаётся всегда) */
function List({ field, rows, onChange, scope }: { field: ListField; rows: string[]; onChange?: (next: string[]) => void; scope?: string }) {
  if (!onChange) {
    const filled = rows.filter((line) => line.trim() !== '');
    return filled.length > 0 ? (
      <ul className="tf-bullets">
        {filled.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    ) : (
      <p className="tf-empty">Не заполнено</p>
    );
  }
  return (
    <div className="tf-list">
      <ul className="tf-list__rows">
        {rows.map((line, i) => (
          <li key={i} className="tf-list__row">
            <AnswerField
              value={line}
              onChange={(value) => onChange(rows.map((r, j) => (j === i ? value : r)))}
              label={named(scope, `${field.label} ${i + 1}`)}
              placeholder={field.placeholder}
            />
            {rows.length > 1 && (
              <button type="button" className="tf-factor__remove" aria-label={`Удалить строку ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <IconClose />
              </button>
            )}
          </li>
        ))}
      </ul>
      {rows.length < field.max && (
        <button type="button" className="tf-add" onClick={() => onChange([...rows, ''])}>
          <IconPlus />
          {field.addLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Записи: страницы дневника, дела плана, беспокойства. У каждой те же поля, разложенные по группам («До дела», «После дела»).
 * Лишнюю запись можно убрать (одна остаётся), добавить — до предела. В просмотре пустые записи не показаны.
 */
function Entries({ field, values, onChange }: { field: EntriesField; values: TaskValues; onChange?: (next: TaskValues) => void }) {
  const list = entriesOf(field, values);
  const shown = onChange ? list : filledEntries(field, values);
  const set = (next: TaskValues[]) => onChange?.({ ...values, entries: { ...values.entries, [field.id]: next } });
  if (shown.length === 0) return <p className="tf-empty tf-entries__empty">Не заполнено</p>;
  return (
    <>
      <ol className="tf-entries">
        {shown.map((entry, i) => {
          const title = `${field.title} ${i + 1}`;
          return (
            <li key={i} className="tf-entry">
              <div className="tf-entry__head">
                <h5 className="tf-entry__title">{title}</h5>
                {onChange && list.length > 1 && (
                  <button type="button" className="tf-factor__remove" aria-label={`Удалить: ${title}`} onClick={() => set(list.filter((_, j) => j !== i))}>
                    <IconClose />
                  </button>
                )}
              </div>
              {field.groups.map((group, g) => (
                <div key={g} className="tf-entry__group">
                  {group.title && <p className="tf-entry__group-title">{group.title}</p>}
                  {group.fields.map((inner) => (
                    <div key={inner.id} className="tf-entry__field">
                      <FieldBody field={inner} number={0} values={entry} scope={title} onChange={onChange && ((next) => set(list.map((e, j) => (j === i ? next : e))))} />
                    </div>
                  ))}
                </div>
              ))}
            </li>
          );
        })}
      </ol>
      {onChange && list.length < field.max && (
        <div className="tf-entries__add">
          <button type="button" className="tf-add" onClick={() => set([...list, emptyValues()])}>
            <IconPlus />
            {field.addLabel}
          </button>
        </div>
      )}
    </>
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
  /** Запись, в которой лежит поле («Запись 2»): входит в подпись поля для программы чтения */
  scope?: string;
}

function FieldBody({ field, number, values, onChange, scope }: FieldProps) {
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
              <AnswerField value={text} onChange={setText} label={named(scope, `Предложение ${number}`)} placeholder="Продолжите предложение" />
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
          {onChange ? <AnswerField value={text} onChange={setText} label={named(scope, field.label ?? 'Ответ')} placeholder={field.placeholder} rows={field.rows} /> : <Answer text={text} />}
        </>
      );
    case 'percent': {
      const value = values.percent[field.id];
      return (
        <>
          <p className="blank-question__prompt">{field.label}</p>
          {field.hint && <p className="task-hint">{field.hint}</p>}
          {onChange ? (
            <PercentSlider value={value} label={named(scope, field.label)} onChange={(v) => onChange({ ...values, percent: { ...values.percent, [field.id]: v } })} />
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
    case 'scale': {
      const value = values.scale[field.id];
      return (
        <>
          <p className="blank-question__prompt">{field.label}</p>
          {field.hint && <p className="task-hint">{field.hint}</p>}
          {onChange ? (
            <div className="tf-scale">
              <Slider
                value={value}
                top={10}
                step={1}
                text={String}
                label={named(scope, field.label)}
                onChange={(v) => onChange({ ...values, scale: { ...values.scale, [field.id]: v } })}
              />
              <div className="tf-scale__ends" aria-hidden="true">
                <span>{field.low}</span>
                <span>{field.high}</span>
              </div>
            </div>
          ) : value === undefined ? (
            <p className="tf-empty">Не заполнено</p>
          ) : (
            <p className="task-answer">{value} из 10</p>
          )}
        </>
      );
    }
    case 'choice':
      return (
        <>
          <p className="blank-question__prompt">{field.label}</p>
          {field.hint && <p className="task-hint">{field.hint}</p>}
          <Choice field={field} picked={values.choice[field.id] ?? []} scope={scope} onChange={onChange && ((next) => onChange({ ...values, choice: { ...values.choice, [field.id]: next } }))} />
        </>
      );
    case 'list':
      return (
        <>
          <p className="blank-question__prompt">{field.label}</p>
          {field.hint && <p className="task-hint">{field.hint}</p>}
          <List field={field} rows={listOf(field, values)} scope={scope} onChange={onChange && ((next) => onChange({ ...values, list: { ...values.list, [field.id]: next } }))} />
        </>
      );
    case 'entries':
      return <Entries field={field} values={values} onChange={onChange} />;
  }
}

/** Раздел бланка: каждое поле — вопрос с линией между ними, как в бланке теста */
export function TaskSectionCard({ section, values, onChange }: { section: TaskSection; values: TaskValues; onChange?: (next: TaskValues) => void }) {
  let sentence = 0;
  return (
    <CollapseCard title={section.title}>
      {section.hint && <p className="task-hint tf-section-hint">{section.hint}</p>}
      <ol className="blank-questions">
        {section.fields.map((field) => (
          <li key={field.id} className={`blank-question${field.kind === 'entries' ? ' tf-q--entries' : ''}`}>
            <FieldBody field={field} number={field.kind === 'sentence' ? ++sentence : 0} values={values} onChange={onChange} />
          </li>
        ))}
      </ol>
    </CollapseCard>
  );
}

/** Страница одной записи при выполнении («Беспокойство 2»): её поля без вынесенных на последнюю страницу; запись можно убрать, а новая открывается следующей страницей */
function EntryPage({
  section,
  field,
  late,
  index,
  values,
  onChange,
  onStep,
}: {
  section: TaskSection;
  field: EntriesField;
  late: string[];
  index: number;
  values: TaskValues;
  onChange: (next: TaskValues) => void;
  onStep?: (sectionId: string, index: number) => void;
}) {
  const list = entriesOf(field, values);
  const entry = list[Math.min(index, list.length - 1)];
  const at = list.indexOf(entry);
  const title = `${field.title} ${at + 1}`;
  const set = (next: TaskValues[]) => onChange({ ...values, entries: { ...values.entries, [field.id]: next } });
  return (
    <CollapseCard
      title={title}
      badge={
        list.length > 1 ? (
          <button
            type="button"
            className="tf-factor__remove"
            aria-label={`Удалить: ${title}`}
            onClick={() => {
              set(list.filter((_, j) => j !== at));
              onStep?.(section.id, Math.min(at, list.length - 2));
            }}
          >
            <IconClose />
          </button>
        ) : undefined
      }
    >
      {section.hint && <p className="task-hint tf-section-hint">{section.hint}</p>}
      <div className="blank-question">
        {field.groups.map((group, g) => (
          <div key={g} className="tf-entry__group">
            {group.title && <p className="tf-entry__group-title">{group.title}</p>}
            {group.fields
              .filter((inner) => !late.includes(inner.id))
              .map((inner) => (
                <div key={inner.id} className="tf-entry__field">
                  <FieldBody field={inner} number={0} values={entry} scope={title} onChange={(next) => set(list.map((e, j) => (j === at ? next : e)))} />
                </div>
              ))}
          </div>
        ))}
        {list.length < field.max && (
          <div className="tf-entries__add">
            <button
              type="button"
              className="tf-add"
              onClick={() => {
                set([...list, emptyValues()]);
                onStep?.(section.id, list.length);
              }}
            >
              <IconPlus />
              {field.addLabel}
            </button>
          </div>
        )}
      </div>
    </CollapseCard>
  );
}

/** Последняя страница записей: поля, вынесенные из записей («Насколько оно тревожит теперь?»), по одному блоку на запись */
function LateCard({ field, late, values, onChange }: { field: EntriesField; late: string[]; values: TaskValues; onChange?: (next: TaskValues) => void }) {
  const list = entriesOf(field, values);
  const set = (next: TaskValues[]) => onChange?.({ ...values, entries: { ...values.entries, [field.id]: next } });
  const lateFields = entryFields(field).filter((inner) => late.includes(inner.id));
  const first = entryFields(field).find((inner) => inner.kind === 'text');
  return (
    <CollapseCard title="После разбора">
      <div className="blank-question">
        <ol className="tf-entries">
          {list.map((entry, i) => {
            const title = `${field.title} ${i + 1}`;
            const said = first ? (entry.text[first.id] ?? '').trim() : '';
            return (
              <li key={i} className="tf-entry">
                <h5 className="tf-entry__title">{title}</h5>
                {said && <p className="task-hint">{said}</p>}
                {lateFields.map((inner) => (
                  <div key={inner.id} className="tf-entry__field">
                    <FieldBody field={inner} number={0} values={entry} scope={title} onChange={onChange && ((next) => set(list.map((e, j) => (j === i ? next : e))))} />
                  </div>
                ))}
              </li>
            );
          })}
        </ol>
      </div>
    </CollapseCard>
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
  /** Что стоит между разделами и комментарием: например, пояснение */
  after?: ReactNode;
  /** При выполнении бланк идёт страницами: сами поля, комментарий и состояние по отдельности. Без значения показано всё сразу */
  only?: string;
  /** Страница записи добавила или убрала запись: открыть запись с этим номером */
  onEntryStep?: (sectionId: string, index: number) => void;
}



/** Бланк задания целиком: инструкция (по желанию), разделы с полями, комментарий и шкала состояния, если они включены */
export function TaskForm({ data, form, options, values, onChange, rules = false, after, only, onEntryStep }: TaskFormProps) {
  const sections = data.blank.sections(form);
  const ids = (only ?? '').split('+');
  return (
    <>
      {rules && (
        <CollapseCard title="Правила задания" id="blank-rules">
          <BlankRules rules={data.blank.rules(form)} />
        </CollapseCard>
      )}
      {sections.map((section) => {
        const entries = section.fields.find((f): f is EntriesField => f.kind === 'entries');
        const each = entries && ids.map((id) => new RegExp(`^each:${section.id}:(\\d+)$`).exec(id)).find(Boolean);
        if (entries && each && onChange) {
          return <EntryPage key={section.id} section={section} field={entries} late={data.blank.late ?? []} index={Number(each[1])} values={values} onChange={onChange} onStep={onEntryStep} />;
        }
        if (entries && ids.includes(`late:${section.id}`)) {
          return <LateCard key={section.id} field={entries} late={data.blank.late ?? []} values={values} onChange={onChange} />;
        }
        if (only && only !== 'form' && !ids.includes(section.id)) return null;
        return <TaskSectionCard key={section.id} section={section} values={values} onChange={onChange} />;
      })}
      {options.comment && (!only || ids.includes('comment')) && (
        <CollapseCard title="Комментарий">
          <div className="task-pad">
            {onChange && <p className="task-hint">{data.blank.commentHint}</p>}
            {onChange ? (
              <AnswerField value={values.comment} onChange={(comment) => onChange({ ...values, comment })} label="Комментарий" placeholder="Ваш комментарий" />
            ) : (
              <Answer text={values.comment} />
            )}
          </div>
        </CollapseCard>
      )}
      {options.state && (!only || ids.includes('state')) && (
        <CollapseCard title="Как вы себя чувствуете?">
          <div className="task-pad">
            <StateScale labels={data.blank.state} value={values.state} onChange={onChange && ((state) => onChange({ ...values, state }))} />
          </div>
        </CollapseCard>
      )}
      {(!only || only === 'form' || sections.some((section) => ids.includes(section.id))) && after}
    </>
  );
}
