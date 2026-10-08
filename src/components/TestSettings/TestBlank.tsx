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
        {data.rules.length === 1 ? (
          // Одно правило не нумеруем: «1.» перед единственным пунктом лишнее
          <p className="blank-rules blank-rules--single">{data.rules[0]}</p>
        ) : (
          <ol className="blank-rules">
            {data.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        )}
      </CollapseCard>

      <CollapseCard title="Вопросы и ответы" id="blank-qa">
        <ol className="blank-questions">
          {data.questions.map((q, i) => (
            <Fragment key={i}>
            {q.heading && <li className="blank-heading">{q.heading}</li>}
            <li
              id={`blank-q-${i + 1}`}
              className={`blank-question${q.opposite !== undefined ? ' blank-question--pair' : ''}${fill?.missing === i ? ' blank-question--missing' : ''}`}
            >
              <p className="blank-question__prompt">
                <strong>{i + 1}.</strong> {q.prompt}
              </p>
              {q.opposite !== undefined ? (
                // Пара утверждений (5PFQ): между ними шкала −2 … 2, левые значения тянут к верхнему утверждению, правые — к нижнему
                <>
                  <ul className="blank-scale" role="radiogroup" aria-label="Какое утверждение ближе">
                    {q.answers.map((answer, j) => (
                      <li key={j}>
                        <label className={`blank-scale__item${locked ? ' blank-answer--locked' : ''}`}>
                          <input
                            type="radio"
                            className="blank-answer__input"
                            name={`blank-q${i}`}
                            checked={answers[i] === j}
                            disabled={locked}
                            onChange={() => choose(i, j)}
                          />
                          <span className="blank-answer__radio" aria-hidden="true" />
                          <span className="blank-scale__value">{answer}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="blank-question__prompt">{q.opposite}</p>
                </>
              ) : (
                <ul className="blank-answers">
                  {q.answers.map((answer, j) => (
                    <li key={j}>
                      <label className={`blank-answer${locked ? ' blank-answer--locked' : ''}`}>
                        <input
                          type="radio"
                          className="blank-answer__input"
                          name={`blank-q${i}`}
                          checked={answers[i] === j}
                          disabled={locked}
                          onChange={() => choose(i, j)}
                        />
                        <span className="blank-answer__radio" aria-hidden="true" />
                        <span className="blank-answer__text">
                          {data.numbered === false ? answer : `${j + 1}. ${answer}`}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            </Fragment>
          ))}
        </ol>
      </CollapseCard>
    </>
  );
}
