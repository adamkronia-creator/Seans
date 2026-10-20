import { Fragment, useState, type ReactNode } from 'react';
import type { TestBlankData } from '../../data/testBlank';
import './TestBlank.css';

/** Карточка бланка, настройки или заключения: заголовок и содержимое; сворачивать её не нужно, всё всегда раскрыто */
export function CollapseCard({ title, badge, help, id, children }: { title: string; badge?: ReactNode; /** «?» сразу за названием */ help?: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section className="blank-card" id={id}>
      <div className="blank-card__head">
        <span className="blank-card__title">
          {title}
          {help}
        </span>
        {badge}
      </div>
      <div className="blank-card__collapse blank-card__collapse--open">
        <div className="blank-card__inner">
          <div className="blank-card__body">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Прохождение: ответы хранятся снаружи, чтобы можно было посчитать результат */
export interface BlankFill {
  answers: Record<number, number>;
  /** Без обработчика бланк показан только для просмотра: отмеченные ответы видны, менять их нельзя */
  onAnswer?: (question: number, answer: number) => void;
  /** Вопрос без ответа, к которому ведёт «Завершить тест»: он подсвечивается */
  missing?: number | null;
}

/** Варианты ответов в правилах («Совсем нет») набраны курсивом */
function ruleText(rule: string) {
  return rule.split(/(«[^»]*»)/).map((part, i) => (part.startsWith('«') ? <em key={i}>{part}</em> : part));
}

/** Инструкция бланка: обычные абзацы без номеров и лишних отступов */
export function BlankRules({ rules }: { rules: string[] }) {
  return (
    <div className="blank-rules">
      {rules.map((rule) => (
        <p key={rule}>{ruleText(rule)}</p>
      ))}
    </div>
  );
}

interface BlankQuestionBodyProps {
  data: TestBlankData;
  /** Номер вопроса (с 0) */
  index: number;
  /** Номер выбранного ответа */
  answer: number | undefined;
  /** Ответы видны, но менять их нельзя */
  locked: boolean;
  /** Номер перед формулировкой («12.»): в списке нужен, на экране одного вопроса номер уже стоит в заголовке */
  numberedPrompt?: boolean;
  /** Пара утверждений 5PFQ при прохождении: между утверждениями волны-зоны вместо ряда кнопок */
  waves?: boolean;
  onChoose: (answer: number) => void;
}

/** Подписи пяти ответов: чем ближе к утверждению, тем сильнее оно выражено */
const WAVE_LABELS = ['+2', '+1', '0', '+1', '+2'];
/** Цвет ответа: крайние зелёные, соседние синие, средний серый */
const WAVE_TONES = ['green', 'blue', 'gray', 'blue', 'green'];

/**
 * Шкала 5PFQ при прохождении: между двумя утверждениями пять дуг, посередине каждой «таблетка» со значением (+2, +1, 0, +1, +2).
 * Ряд — радио-кнопка целиком; значение хранится номером ряда сверху вниз, как у списка вариантов.
 */
function WaveScale({ name, answer, locked, onChoose }: { name: string; answer: number | undefined; locked: boolean; onChoose: (answer: number) => void }) {
  return (
    <div className="wave-scale" role="radiogroup" aria-label="Какое утверждение ближе">
      {WAVE_LABELS.map((label, j) => (
        <label key={j} className={`blank-scale__item wave-scale__zone wave-scale__zone--${WAVE_TONES[j]}${answer === j ? ' wave-scale__zone--on' : ''}${locked ? ' blank-answer--locked' : ''}`}>
          <input
            type="radio"
            className="blank-answer__input"
            name={name}
            checked={answer === j}
            disabled={locked}
            aria-label={`${label}, ${j < 2 ? 'ближе верхнее утверждение' : j > 2 ? 'ближе нижнее утверждение' : 'ни то, ни другое'}`}
            onChange={() => onChoose(j)}
          />
          <svg className="wave-scale__arc" viewBox="0 0 300 38" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 32 Q 75 10 112 12" />
            <path d="M188 12 Q 225 10 296 32" />
          </svg>
          <span className="wave-scale__label">{label}</span>
        </label>
      ))}
    </div>
  );
}

/** Вопрос с вариантами ответов: список вариантов или пара утверждений со шкалой (5PFQ) */
export function BlankQuestionBody({ data, index, answer, locked, numberedPrompt = true, waves, onChoose }: BlankQuestionBodyProps) {
  const q = data.questions[index];
  const prompt = (
    <p className="blank-question__prompt">
      {numberedPrompt && (
        <>
          <strong>{index + 1}.</strong>{' '}
        </>
      )}
      {q.prompt}
    </p>
  );

  if (q.opposite !== undefined && waves) {
    return (
      <>
        {prompt}
        <WaveScale name={`blank-q${index}`} answer={answer} locked={locked} onChoose={onChoose} />
        <p className="blank-question__prompt">{q.opposite}</p>
      </>
    );
  }

  if (q.opposite !== undefined) {
    // Пара утверждений (5PFQ): между ними шкала −2 … 2, левые значения тянут к верхнему утверждению, правые — к нижнему
    return (
      <>
        {prompt}
        <ul className="blank-scale" role="radiogroup" aria-label="Какое утверждение ближе">
          {q.answers.map((text, j) => (
            <li key={j}>
              <label className={`blank-scale__item${locked ? ' blank-answer--locked' : ''}`}>
                <input
                  type="radio"
                  className="blank-answer__input"
                  name={`blank-q${index}`}
                  checked={answer === j}
                  disabled={locked}
                  onChange={() => onChoose(j)}
                />
                <span className="blank-answer__radio" aria-hidden="true" />
                <span className="blank-scale__value">{text}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="blank-question__prompt">{q.opposite}</p>
      </>
    );
  }

  return (
    <>
      {prompt}
      <ul className="blank-answers">
        {q.answers.map((text, j) => (
          <li key={j}>
            <label className={`blank-answer${locked ? ' blank-answer--locked' : ''}`}>
              <input
                type="radio"
                className="blank-answer__input"
                name={`blank-q${index}`}
                checked={answer === j}
                disabled={locked}
                onChange={() => onChoose(j)}
              />
              <span className="blank-answer__radio" aria-hidden="true" />
              <span className="blank-answer__text">{data.numbered === false ? text : `${j + 1}. ${text}`}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Бланк тестирования: инструкция и все вопросы с вариантами ответов (как их увидит клиент).
 * Без `fill` бланк только для просмотра: отметка никуда не сохраняется.
 */
export function TestBlank({ data, fill }: { data: TestBlankData; fill?: BlankFill }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const answers = fill ? fill.answers : picked;
  const locked = fill !== undefined && !fill.onAnswer;
  const choose = (question: number, answer: number) =>
    fill ? fill.onAnswer?.(question, answer) : setPicked({ ...picked, [question]: answer });
  return (
    <>
      <CollapseCard title="Инструкция" id="blank-rules">
        <BlankRules rules={data.rules} />
      </CollapseCard>

      <CollapseCard title="Вопросы и ответы" id="blank-qa" badge={<span className="blank-card__badge">{data.questions.length}</span>}>
        <ol className="blank-questions">
          {data.questions.map((q, i) => (
            <Fragment key={i}>
              {q.heading && <li className="blank-heading">{q.heading}</li>}
              <li
                id={`blank-q-${i + 1}`}
                className={`blank-question${fill?.missing === i ? ' blank-question--missing' : ''}`}
              >
                <BlankQuestionBody
                  data={data}
                  index={i}
                  answer={answers[i]}
                  locked={locked}
                  onChoose={(answer) => choose(i, answer)}
                />
              </li>
            </Fragment>
          ))}
        </ol>
      </CollapseCard>
    </>
  );
}
