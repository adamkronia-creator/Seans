import { useState } from 'react';
import { IconTlDoc } from '../icons';
import type { LibraryTest } from '../../data/library';
import type { TestBlankData } from '../../data/testBlank';
import { BlankQuestionBody, BlankRules, CollapseCard } from './TestBlank';
import { shortTitle } from './TestHeader';
import './TestPreview.css';

type Stage = 'start' | 'progress' | 'end';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'start', label: 'Начало' },
  { id: 'progress', label: 'В процессе' },
  { id: 'end', label: 'Конец' },
];

interface TestPreviewProps {
  test: LibraryTest;
  blank: TestBlankData;
  /** Слепое тестирование: клиент не видит название теста и его цель */
  blind: boolean;
  /** Сообщение клиенту; пустая строка, если оно выключено */
  message: string;
  hideConclusion: boolean;
}

/**
 * Предпросмотр теста глазами клиента: начало (сообщение и инструкция), прохождение (вопросы с ответами) и завершение.
 * Ответы здесь никуда не сохраняются. При слепом тестировании название, значок и описание теста скрыты.
 */
export function TestPreview({ test, blank, blind, message, hideConclusion }: TestPreviewProps) {
  const [stage, setStage] = useState<Stage>('start');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const total = blank.questions.length;
  const answered = Object.keys(picked).length;
  const last = index >= total - 1;

  return (
    <>
      <div className="test-settings__scroll" key={stage}>
        <div className="tp__tabs" role="group" aria-label="Этап прохождения">
          {STAGES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`chip${stage === id ? ' chip--active' : ''}`}
              aria-pressed={stage === id}
              onClick={() => setStage(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="tp__note">
          {blind
            ? 'Слепое тестирование: клиент не увидит название теста и его цель'
            : 'Так клиент увидит тест. Название теста ему показано'}
        </p>

        <section className="ts-card tp__who">
          <span className={`tp__avatar${blind ? ' tp__avatar--blind' : ''}`}>
            {blind ? <IconTlDoc aria-hidden="true" /> : <img src={test.icon} alt="" />}
          </span>
          <span className="tp__who-text">
            <span className="tp__who-label">Присланный тест</span>
            <span className="tp__who-title">{blind ? 'Тест' : shortTitle(test.title)}</span>
          </span>
        </section>

        {stage === 'start' && (
          <>
            {message.trim() !== '' && (
              <section className="ts-card tp__message">
                <p className="tp__message-label">Сообщение психолога</p>
                <p className="tp__message-text">{message}</p>
              </section>
            )}
            <CollapseCard title="Инструкция" id="blank-rules">
              <BlankRules rules={blank.rules} />
            </CollapseCard>
          </>
        )}

        {stage === 'progress' && (
          <section className="blank-card pass-q">
            <div className="blank-card__head pass-q__head">
              <h2 className="blank-card__title">
                Вопрос {index + 1} из {total}
              </h2>
            </div>
            <div className="pass-q__body" key={index}>
              {blank.questions[index].heading && <p className="blank-heading">{blank.questions[index].heading}</p>}
              <div className="blank-question">
                <BlankQuestionBody
                  data={blank}
                  index={index}
                  answer={picked[index]}
                  locked={false}
                  numberedPrompt={false}
                  onChoose={(answer) => setPicked({ ...picked, [index]: answer })}
                />
              </div>
            </div>
          </section>
        )}

        {stage === 'end' && (
          <section className="ts-card tp__done">
            <span className="tp__done-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 className="tp__done-title">Тест завершен</h2>
            <p className="tp__done-text">Спасибо, ответы переданы психологу.</p>
            <p className="tp__done-text">
              {hideConclusion
                ? 'Результат вам не покажут: заключение останется у психолога.'
                : 'Заключение теста будет доступно вам в результате.'}
            </p>
          </section>
        )}
      </div>

      {stage !== 'end' && (
        <div className="test-settings__cta test-pass__cta">
          {stage === 'progress' && (
            <>
              <div className="test-pass__meta">
                <span>
                  Отвечено: {answered} из {total}
                </span>
              </div>
              <div className="test-pass__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
                <span style={{ width: `${(answered / total) * 100}%` }} />
              </div>
            </>
          )}
          <div className="test-pass__buttons">
            {stage === 'progress' && (
              <button type="button" className="test-pass__back" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                Назад
              </button>
            )}
            {stage === 'start' ? (
              <button type="button" className="test-settings__cta-button" onClick={() => setStage('progress')}>
                Начать
              </button>
            ) : last ? (
              <button type="button" className="test-settings__cta-button" onClick={() => setStage('end')}>
                Завершить тест
              </button>
            ) : (
              <button
                type="button"
                className="test-settings__cta-button"
                disabled={picked[index] === undefined}
                onClick={() => setIndex(index + 1)}
              >
                Далее
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
