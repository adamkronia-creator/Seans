import { useState, type ReactNode } from 'react';
import { IconTestChevronUp } from '../icons';
import type { TestBlankData } from '../../data/testBlank';
import './TestBlank.css';

/** Карточка бланка: заголовок с кнопкой «свернуть», содержимое плавно сворачивается */
export function CollapseCard({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="blank-card">
      <button
        type="button"
        className="blank-card__head"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="blank-card__title">{title}</span>
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

/** Бланк тестирования: правила и все вопросы с вариантами ответов (как их увидит клиент) */
export function TestBlank({ data }: { data: TestBlankData }) {
  // Выбранные ответы нужны только для просмотра: отметка никуда не сохраняется
  const [picked, setPicked] = useState<Record<number, number>>({});
  return (
    <>
      <CollapseCard title="Правила тестирования">
        <ol className="blank-rules">
          {data.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </CollapseCard>

      <CollapseCard title="Вопросы и ответы">
        <ol className="blank-questions">
          {data.questions.map((q, i) => (
            <li key={i} className="blank-question">
              <p className="blank-question__prompt">
                <strong>{i + 1}.</strong> {q.prompt}
              </p>
              <ul className="blank-answers">
                {q.answers.map((answer, j) => (
                  <li key={j}>
                    <label className="blank-answer">
                      <input
                        type="radio"
                        className="blank-answer__input"
                        name={`blank-q${i}`}
                        checked={picked[i] === j}
                        onChange={() => setPicked({ ...picked, [i]: j })}
                      />
                      <span className="blank-answer__radio" aria-hidden="true" />
                      <span className="blank-answer__text">
                        {data.numbered === false ? answer : `${j + 1}. ${answer}`}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </CollapseCard>
    </>
  );
}
