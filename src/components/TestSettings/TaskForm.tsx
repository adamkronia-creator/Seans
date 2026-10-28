import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { IconClose } from '../ChatParts/ChatIcons';
import { IconPlus, IconTestChevronDown } from '../icons';
import { IconTaskState } from './TaskIcons';
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
 *
 * Как устроено заполнение (стили — TaskForm.css, всё на сетке 4):
 *   поле ответа — рамка с подписью на линии, как в окне «Новый контакт» (AnswerField);
 *   варианты, ползунки, «пирог», записи — на плитках (подложка чуть светлее карточки);
 *   у вопроса сверху вопрос (жирным), под ним пояснение, затем само поле; между вопросами 24, внутри вопроса 12.
 */

const MAX_TEXT = 3000;
const MAX_FACTORS = 8;
/** Цвета долей «пирога»: спокойные, но различимые и на светлом, и на тёмном стекле; доля самого клиента — акцентным цветом */
const PIE_COLORS = ['#E6A04C', '#9B8AD0', '#4FB59A', '#D9798B', '#C9B458', '#7F9BB5', '#B58A6E', '#9AA3AE'];
const colorOf = (i: number) => PIE_COLORS[i % PIE_COLORS.length];

/** Подпись умещается на рамке поля, если она короткая: тогда вопроса над полем нет, он сам стоит на рамке. Длинный вопрос остаётся текстом над полем */
const NOTCH_MAX = 32;
const fitsNotch = (label?: string): label is string => Boolean(label) && (label as string).length <= NOTCH_MAX;

// ——— Мелочи ———

/** Вопрос и пояснение под ним: сверху поля. Без вопроса остаётся одно пояснение */
function Ask({ label, hint }: { label?: string; hint?: string }) {
  if (!label && !hint) return null;
  return (
    <div className="tf-ask">
      {label && <p className="tf-prompt">{label}</p>}
      {hint && <p className="tf-hint">{hint}</p>}
    </div>
  );
}

/** Кнопка «Удалить» (крестик 20 в зоне 40): внутри рамки поля, в заголовке записи и карточки */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="tf-remove" aria-label={label} onClick={onClick}>
      <IconClose />
    </button>
  );
}

/** «Добавить …»: пунктирная плитка во всю ширину под списком */
function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="tf-add" onClick={onClick}>
      <IconPlus />
      {label}
    </button>
  );
}

// ——— Поля ———

interface AnswerFieldProps {
  value: string;
  onChange: (v: string) => void;
  /** Подпись поля: пока оно пустое и не в фокусе, стоит внутри вместо подсказки, когда в нём пишут или есть текст, переезжает на рамку */
  label: string;
  /** Пример: виден в пустом поле, пока в нём пишут */
  example?: string;
  /** Сколько строк занимает пустое поле; дальше оно растёт по тексту */
  rows?: number;
  max?: number;
  /** Подпись для программы чтения, если она точнее («Запись 2: Ситуация») */
  aria?: string;
  /** Справа внутри рамки: кнопка «Удалить» */
  end?: ReactNode;
}

/**
 * Поле ответа в форме окна «Новый контакт»: рамка, подпись разрывает линию сверху (это legend, а не наложенный текст,
 * поэтому разрыв настоящий, сквозь него виден фон). В фокусе рамка 2 акцентного цвета. Растёт по тексту.
 */
function AnswerField({ value, onChange, label, example, rows = 1, max = MAX_TEXT, aria, end }: AnswerFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focus, setFocus] = useState(false);
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
  const up = focus || value !== '';
  return (
    <fieldset
      className={`tf-box${up ? ' tf-box--up' : ''}${focus ? ' tf-box--focus' : ''}${end ? ' tf-box--end' : ''}`}
      // Нажатие на поле внутри рамки (по бокам от текста, на подписи) тоже ставит курсор
      onClick={(e) => {
        const target = e.target as Element;
        if (target === e.currentTarget || target.tagName === 'LEGEND') ref.current?.focus();
      }}
    >
      <legend>{label}</legend>
      {/* Подпись, которая переезжает: из поля на рамку (legend только раскрывает разрыв в линии, сам он прозрачный) */}
      <span className="tf-box__label" aria-hidden="true">
        {label}
      </span>
      <textarea
        ref={ref}
        className="tf-box__input"
        rows={rows}
        maxLength={max}
        value={value}
        placeholder={focus ? (example ?? '') : ''}
        aria-label={aria ?? label}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onChange={(e) => onChange(e.target.value)}
      />
      {end}
    </fieldset>
  );
}

/** Ответ в просмотре: текст клиента акцентным цветом, пустой — тихой подписью */
function Answer({ text }: { text?: string }) {
  return text?.trim() ? <p className="task-answer">{text}</p> : <p className="tf-empty">Не заполнено</p>;
}

/**
 * Ползунок оценки на плитке: дорожка, справа число. `top` — верхний край шкалы, `cap` — выше чего поднять бегунок нельзя;
 * пока оценку не выбрали, бегунок пустое кольцо, а вместо числа тире. `ends` — подписи краёв под дорожкой.
 */
function Slider({
  value,
  onChange,
  label,
  top,
  step,
  cap = top,
  text,
  ends,
  tone,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  label: string;
  top: number;
  step: number;
  cap?: number;
  text: (v: number) => string;
  ends?: [string, string];
  /** Цвет заливки дорожки, если не акцентный: у доли «пирога» — цвет её куска */
  tone?: string;
}) {
  const shown = value === undefined ? 0 : Math.min(value, cap);
  return (
    <div className={`tf-slider${value === undefined ? ' tf-slider--unset' : ''}`} style={tone ? ({ '--tone': tone } as CSSProperties) : undefined}>
      <input
        type="range"
        className="tf-slider__range"
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
      <output className="tf-slider__value">{value === undefined ? '—' : text(shown)}</output>
      {ends && (
        <div className="tf-slider__ends" aria-hidden="true">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}

/** Ползунок процентов (0–100, шаг 5) */
function PercentSlider({ value, onChange, label, max = 100, tone }: { value: number | undefined; onChange: (v: number) => void; label: string; max?: number; tone?: string }) {
  return <Slider value={value} onChange={onChange} label={label} top={100} step={5} cap={max} text={(v) => `${v}%`} tone={tone} />;
}

/** Кольцо долей: доли факторов своими цветами, остаток — доля самого клиента акцентным */
function PieChart({ factors, ownLabel }: { factors: PieFactor[]; ownLabel: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const own = ownShare(factors);
  const slices = [...factors.map((f, i) => ({ percent: f.percent, color: colorOf(i) })), { percent: own, color: 'var(--action-primary)' }].filter((s) => s.percent > 0);
  const gap = slices.length > 1 ? 1.2 : 0;
  let offset = 0;
  return (
    <figure className="tf-pie">
      <div className="tf-pie__ring">
        <svg className="tf-pie__svg" viewBox="0 0 120 120" role="img" aria-label={`${ownLabel}: ${own}%`}>
          <circle className="tf-pie__track" cx="60" cy="60" r={R} fill="none" strokeWidth="20" />
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
        <div className="tf-pie__center" aria-hidden="true">
          <strong>{own}%</strong>
          <span>{ownLabel}</span>
        </div>
      </div>
    </figure>
  );
}

/** Подпись для программы чтения: у полей записи впереди номер записи, иначе у трёх записей были бы три одинаковых «Ситуация» */
const named = (scope: string | undefined, label: string) => (scope ? `${scope}: ${label}` : label);

/** Доли ответственности: кольцо, под ним факторы (название на рамке, ползунок цветом куска), доля клиента — остаток до 100 */
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
              <AnswerField
                value={f.name}
                max={80}
                label={`Фактор ${i + 1}`}
                example={field.namePlaceholder}
                onChange={(name) => patch(i, { name })}
                end={rows.length > 1 ? <RemoveButton label={`Удалить фактор ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} /> : undefined}
              />
              <PercentSlider value={f.percent} max={100 - others} label={`Доля фактора ${i + 1}`} tone={colorOf(i)} onChange={(percent) => patch(i, { percent })} />
            </li>
          );
        })}
      </ul>
      {rows.length < MAX_FACTORS && <AddButton label={field.addLabel} onClick={() => onChange([...rows, { name: '', percent: 0 }])} />}
      <div className="tf-own">
        <span className="tf-dot tf-dot--own" />
        <span className="tf-own__label">{field.ownLabel}</span>
        <strong className="tf-own__value">{own}%</strong>
      </div>
    </div>
  );
}

/** Вариант выбора на плитке: кружок, значок (у шкалы состояния) и текст; выбранный — акцентное кольцо и лёгкая заливка */
function Option({ name, checked, locked, onSelect, icon, children }: { name: string; checked: boolean; locked?: boolean; onSelect?: () => void; icon?: ReactNode; children: ReactNode }) {
  return (
    <label className={`tf-option${locked ? ' tf-option--locked' : ''}`}>
      <input type="radio" className="tf-option__input" name={name} checked={checked} disabled={locked} onChange={() => onSelect?.()} />
      <span className="tf-option__mark" aria-hidden="true" />
      {icon}
      <span className="tf-option__text">{children}</span>
    </label>
  );
}

/** Выбор из вариантов: один — плитки с кружком, несколько — чипсы; в просмотре показан только выбранный */
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
    <ul className="tf-options" role="radiogroup" aria-label={label}>
      {field.options.map((option, i) => (
        <li key={option}>
          <Option name={group} checked={picked[0] === i} onSelect={() => onChange([i])}>
            {option}
          </Option>
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
  const noun = field.item ?? field.label;
  return (
    <div className="tf-list">
      <ul className="tf-list__rows">
        {rows.map((line, i) => {
          const label = rows.length > 1 ? `${noun} ${i + 1}` : noun;
          return (
            <li key={i}>
              <AnswerField
                value={line}
                label={label}
                example={field.placeholder}
                aria={named(scope, label)}
                onChange={(value) => onChange(rows.map((r, j) => (j === i ? value : r)))}
                end={rows.length > 1 ? <RemoveButton label={`Удалить: ${label}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} /> : undefined}
              />
            </li>
          );
        })}
      </ul>
      {rows.length < field.max && <AddButton label={field.addLabel} onClick={() => onChange([...rows, ''])} />}
    </div>
  );
}

/**
 * Записи: страницы дневника, дела плана, беспокойства. У каждой те же поля, разложенные по группам («До дела», «После дела»), запись — плитка.
 * Лишнюю запись можно убрать (одна остаётся), добавить — до предела. В просмотре пустые записи не показаны.
 */
function Entries({ field, values, onChange }: { field: EntriesField; values: TaskValues; onChange?: (next: TaskValues) => void }) {
  const list = entriesOf(field, values);
  const shown = onChange ? list : filledEntries(field, values);
  const set = (next: TaskValues[]) => onChange?.({ ...values, entries: { ...values.entries, [field.id]: next } });
  if (shown.length === 0) return <p className="tf-empty">Не заполнено</p>;
  return (
    <>
      <ol className="tf-entries">
        {shown.map((entry, i) => {
          const title = `${field.title} ${i + 1}`;
          return (
            <li key={i} className="tf-entry">
              <div className="tf-entry__head">
                <h5 className="tf-entry__title">{title}</h5>
                {onChange && list.length > 1 && <RemoveButton label={`Удалить: ${title}`} onClick={() => set(list.filter((_, j) => j !== i))} />}
              </div>
              <EntryGroups field={field} entry={entry} title={title} onChange={onChange && ((next) => set(list.map((e, j) => (j === i ? next : e))))} />
            </li>
          );
        })}
      </ol>
      {onChange && list.length < field.max && <AddButton label={field.addLabel} onClick={() => set([...list, emptyValues()])} />}
    </>
  );
}

/** Группы полей одной записи; поля из `skip` не показаны (их вынесли на последнюю страницу) */
function EntryGroups({ field, entry, title, skip = [], onChange }: { field: EntriesField; entry: TaskValues; title: string; skip?: string[]; onChange?: (next: TaskValues) => void }) {
  return (
    <>
      {field.groups.map((group, g) => (
        <div key={g} className="tf-group">
          {group.title && <p className="tf-group__title">{group.title}</p>}
          {group.fields
            .filter((inner) => !skip.includes(inner.id))
            .map((inner) => (
              <FieldBody key={inner.id} field={inner} number={0} values={entry} scope={title} onChange={onChange} />
            ))}
        </div>
      ))}
    </>
  );
}

/** Шкала «Как вы себя чувствуете?»: пять плиток со значком лица */
function StateScale({ labels, value, onChange }: { labels: string[]; value?: number; onChange?: (i: number) => void }) {
  return (
    <ul className="tf-options" role="radiogroup" aria-label="Как вы себя чувствуете">
      {labels.map((label, i) => (
        <li key={label}>
          <Option name="task-state" checked={value === i} locked={!onChange} onSelect={() => onChange?.(i)} icon={<IconTaskState level={i} className="tf-option__icon" />}>
            {label}
          </Option>
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
      if (!onChange) {
        return (
          <div className="tf-q">
            <p className="tf-prompt">
              <strong>{number}.</strong> {field.starters[picked]}
            </p>
            <Answer text={text} />
          </div>
        );
      }
      return (
        <div className="tf-q tf-sentence">
          <div className="tf-sentence__head">
            <span className="tf-sentence__number" aria-hidden="true">
              {number}
            </span>
            {/* Начало предложения: выбранное показано сразу, остальные — в списке */}
            <label className="tf-starter">
              <span className="tf-starter__value">{field.starters[picked]}</span>
              <IconTestChevronDown className="tf-starter__chevron" />
              <select
                className="tf-starter__native"
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
          <AnswerField value={text} onChange={setText} label="Продолжите предложение" aria={named(scope, `Предложение ${number}`)} />
        </div>
      );
    }
    case 'text': {
      if (!onChange) {
        return (
          <div className="tf-q">
            <Ask label={field.label} hint={field.hint} />
            <Answer text={text} />
          </div>
        );
      }
      // Короткое название стоит прямо на рамке; длинный вопрос — над полем, а на рамке «Ваш ответ»
      const short = fitsNotch(field.label) ? field.label : undefined;
      return (
        <div className={`tf-q${short && !field.hint ? ' tf-q--box' : ''}`}>
          <Ask label={short ? undefined : field.label} hint={field.hint} />
          <AnswerField value={text} onChange={setText} label={short ?? 'Ваш ответ'} example={field.placeholder} rows={field.rows} aria={named(scope, field.label ?? 'Ответ')} />
        </div>
      );
    }
    case 'percent': {
      const value = values.percent[field.id];
      return (
        <div className="tf-q">
          <Ask label={field.label} hint={field.hint} />
          {onChange ? (
            <PercentSlider value={value} label={named(scope, field.label)} onChange={(v) => onChange({ ...values, percent: { ...values.percent, [field.id]: v } })} />
          ) : value === undefined ? (
            <p className="tf-empty">Не заполнено</p>
          ) : (
            <p className="task-answer">{value}%</p>
          )}
        </div>
      );
    }
    case 'factors': {
      const list = values.factors[field.id] ?? [];
      return (
        <div className="tf-q">
          <Ask label={field.label} hint={field.hint} />
          <Factors field={field} list={list} onChange={onChange && ((next) => onChange({ ...values, factors: { ...values.factors, [field.id]: next } }))} />
        </div>
      );
    }
    case 'scale': {
      const value = values.scale[field.id];
      return (
        <div className="tf-q">
          <Ask label={field.label} hint={field.hint} />
          {onChange ? (
            <Slider
              value={value}
              top={10}
              step={1}
              text={String}
              ends={[field.low, field.high]}
              label={named(scope, field.label)}
              onChange={(v) => onChange({ ...values, scale: { ...values.scale, [field.id]: v } })}
            />
          ) : value === undefined ? (
            <p className="tf-empty">Не заполнено</p>
          ) : (
            <p className="task-answer">{value} из 10</p>
          )}
        </div>
      );
    }
    case 'choice':
      return (
        <div className="tf-q">
          <Ask label={field.label} hint={field.hint} />
          <Choice field={field} picked={values.choice[field.id] ?? []} scope={scope} onChange={onChange && ((next) => onChange({ ...values, choice: { ...values.choice, [field.id]: next } }))} />
        </div>
      );
    case 'list': {
      // У списка с названием строки («Факт 1») вопрос стоит над строками; без него короткое название списка само стоит на рамках строк
      const onBox = !onChange ? false : !field.item && fitsNotch(field.label);
      return (
        <div className={`tf-q${onBox && !field.hint ? ' tf-q--box' : ''}`}>
          <Ask label={onBox ? undefined : field.label} hint={field.hint} />
          <List field={field} rows={listOf(field, values)} scope={scope} onChange={onChange && ((next) => onChange({ ...values, list: { ...values.list, [field.id]: next } }))} />
        </div>
      );
    }
    case 'entries':
      return <Entries field={field} values={values} onChange={onChange} />;
  }
}

/** Раздел бланка: карточка с заголовком, пояснением и полями. Если в нём записи, поля лежат на плитках, и поле карточки 12 */
function TaskSectionCard({ section, values, onChange }: { section: TaskSection; values: TaskValues; onChange?: (next: TaskValues) => void }) {
  let sentence = 0;
  const tiles = section.fields.some((f) => f.kind === 'entries');
  return (
    <CollapseCard title={section.title}>
      <div className={`tf-body${tiles ? ' tf-body--tiles' : ''}`}>
        {section.hint && <p className="tf-hint tf-intro">{section.hint}</p>}
        {section.fields.map((field) => (
          <FieldBody key={field.id} field={field} number={field.kind === 'sentence' ? ++sentence : 0} values={values} onChange={onChange} />
        ))}
      </div>
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
          <RemoveButton
            label={`Удалить: ${title}`}
            onClick={() => {
              set(list.filter((_, j) => j !== at));
              onStep?.(section.id, Math.min(at, list.length - 2));
            }}
          />
        ) : undefined
      }
    >
      <div className="tf-body">
        {section.hint && <p className="tf-hint tf-intro">{section.hint}</p>}
        <EntryGroups field={field} entry={entry} title={title} skip={late} onChange={(next) => set(list.map((e, j) => (j === at ? next : e)))} />
        {list.length < field.max && (
          <AddButton
            label={field.addLabel}
            onClick={() => {
              set([...list, emptyValues()]);
              onStep?.(section.id, list.length);
            }}
          />
        )}
      </div>
    </CollapseCard>
  );
}

/** Последняя страница записей: поля, вынесенные из записей («Насколько оно тревожит теперь?»), по одной плитке на запись */
function LateCard({ field, late, values, onChange }: { field: EntriesField; late: string[]; values: TaskValues; onChange?: (next: TaskValues) => void }) {
  const list = entriesOf(field, values);
  const set = (next: TaskValues[]) => onChange?.({ ...values, entries: { ...values.entries, [field.id]: next } });
  const lateFields = entryFields(field).filter((inner) => late.includes(inner.id));
  const first = entryFields(field).find((inner) => inner.kind === 'text');
  return (
    <CollapseCard title="После разбора">
      <div className="tf-body tf-body--tiles">
        <ol className="tf-entries">
          {list.map((entry, i) => {
            const title = `${field.title} ${i + 1}`;
            const said = first ? (entry.text[first.id] ?? '').trim() : '';
            return (
              <li key={i} className="tf-entry">
                <div className="tf-entry__head">
                  <h5 className="tf-entry__title">{title}</h5>
                </div>
                {said && <p className="tf-quote">{said}</p>}
                {lateFields.map((inner) => (
                  <FieldBody key={inner.id} field={inner} number={0} values={entry} scope={title} onChange={onChange && ((next) => set(list.map((e, j) => (j === i ? next : e))))} />
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
          <div className="tf-body">
            {onChange ? (
              <div className="tf-q">
                <Ask hint={data.blank.commentHint} />
                <AnswerField value={values.comment} onChange={(comment) => onChange({ ...values, comment })} label="Комментарий" rows={3} />
              </div>
            ) : (
              <Answer text={values.comment} />
            )}
          </div>
        </CollapseCard>
      )}
      {options.state && (!only || ids.includes('state')) && (
        <CollapseCard title="Как вы себя чувствуете?">
          <div className="tf-body">
            <StateScale labels={data.blank.state} value={values.state} onChange={onChange && ((state) => onChange({ ...values, state }))} />
          </div>
        </CollapseCard>
      )}
      {(!only || only === 'form' || sections.some((section) => ids.includes(section.id))) && after}
    </>
  );
}
