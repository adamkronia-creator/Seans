import { Fragment, useState, type ReactNode } from 'react';
import { IconTestChevronUp } from '../icons';
import type { TestBlankData } from '../../data/testBlank';
import './TestBlank.css';

/** Карточка бланка: заголовок с кнопкой «свернуть», содержимое плавно сворачивается */
export function CollapseCard({ title, badge, id, children }: { title: string; badge?: ReactNode; id?: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="blank-card" id={id}>
      <button
        type="button"
        className="blank-card__head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="blank-card__title">{title}</span>
        {badge}
        <IconTestChevronUp className={`blank-card__chevron${open ? '' : ' blank-card__chevron--closed'}`} />
      </button>
      <div className={`blank-card__collapse${open ? ' blank-card__collapse--open' : ''}`} aria-hidden={!open}>
        <div className="blank-card__inner">
          <div className="blank-card__body">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Разделы бланка для оглавления: два блока и каждый десятый вопрос */
export function blankSections(data: TestBlankData) {
  const sections = [
    { id: 'blank-rules', title: 'Правила тестирования' },
    { id: 'blank-qa', title: 'Вопросы и ответы' },
  ];
  for (let n = 10; n <= data.questions.length; n += 10) sections.push({ id: `blank-q-${n}`, title: `Вопрос ${n}` });
  return sections;
}

/** Прохождение: ответы хранятся снаружи, чтобы можно было посчитать результат */
export interface BlankFill {
  answers: Record<number, number>;
  /** Без обработчика бланк показан только для просмотра: отмеченные ответы видны, менять их нельзя */
  onAnswer?: (question: number, answer: number) => void;
  /** Вопрос без ответа, к которому ведёт «Завершить тест»: он подсвечивается */
  missing?: number | null;
}

/** Правила бланка: одно правило — обычный абзац, несколько — нумерованный список */
export function BlankRules({ rules }: { rules: string[] }) {
  if (rules.length === 1) {
    // Одно правило не нумеруем: «1.» перед единственным пунктом лишнее
    return <p className="blank-rules blank-rules--single">{rules[0]}</p>;
  }
  return (
    <ol className="blank-rules">
      {rules.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ol>
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
  onChoose: (answer: number) => void;
}

/** Вопрос с вариантами ответов: список вариантов или пара утверждений со шкалой (5PFQ) */
export function BlankQuestionBody({ data, index, answer, locked, numberedPrompt = true, onChoose }: BlankQuestionBodyProps) {
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
 * Бланк тестирования: правила и все вопросы с вариантами ответов (как их увидит клиент).
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
      <CollapseCard title="Правила тестирования" id="blank-rules">
        <BlankRules rules={data.rules} />
      </CollapseCard>

      <CollapseCard title="Вопросы и ответы" id="blank-qa">
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
