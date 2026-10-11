import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { conclusionFor, levelOf, type ConclusionScale } from '../../data/conclusions';
import type { LibraryTest } from '../../data/library';
import { BLIND_TITLE, RESULT_FACT, type ResultMode } from '../../data/resultMode';
import { answerQuestion, finishRun, resetRun } from '../../data/selfTest';
import { IconBack } from '../icons';
import type { TestBlankData } from '../../data/testBlank';
import { BlankQuestionBody, BlankRules } from './TestBlank';
import { shortTitle } from './TestHeader';
import './TestPreview.css';

type Stage = 'start' | 'progress' | 'end';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'start', label: 'Начало' },
  { id: 'progress', label: 'В процессе' },
  { id: 'end', label: 'Конец' },
];

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** «1 вопрос», «2 вопроса», «5 вопросов» */
function questionsWord(n: number) {
  const last = n % 10;
  if (n % 100 >= 11 && n % 100 <= 14) return 'вопросов';
  if (last === 1) return 'вопрос';
  return last >= 2 && last <= 4 ? 'вопроса' : 'вопросов';
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg className="tp__fact-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const IconClock = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const IconUndo = () => (
  <Icon>
    <path d="M4 12a8 8 0 1 1 2.6 5.9" />
    <path d="M4 5v5h5" />
  </Icon>
);
const IconLock = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
const IconEyeOff = () => (
  <Icon>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.7A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.6M6.4 7.2A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);
const IconEye = () => (
  <Icon>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);

/** Пример итога на экране завершения: баллы или баллы с уровнями (по образцу заключения теста) */
function SampleResult({ testId, mode }: { testId: string; mode: Exclude<ResultMode, 'thanks'> }) {
  const data = conclusionFor(testId);
  if (!data) return null;
  const main = data.scales.filter((s) => s.group === 'main');
  const shown: ConclusionScale[] = (main.length > 0 ? main : data.scales).slice(0, 3);
  return (
    <div className="tp__sample">
      <p className="tp__sample-label">Пример результата</p>
      <ul className="tp__sample-list">
        {shown.map((scale) => (
          <li key={scale.code} className="tp__sample-row">
            <span className="tp__sample-name">
              {scale.name}
              {mode === 'full' && scale.leveled && <span className="tp__sample-level">{levelOf(data, scale.score, scale).chip}</span>}
            </span>
            <span className="tp__sample-score">
              {fmt(scale.score)} <span className="tp__sample-max">из {fmt(scale.max)}</span>
            </span>
          </li>
        ))}
      </ul>
      {mode === 'full' && <p className="tp__sample-more">Ниже — расшифровка каждой шкалы</p>}
    </div>
  );
}

interface TestPreviewProps {
  test: LibraryTest;
  blank: TestBlankData;
  /** Слепое тестирование: клиент не видит название теста и его цель */
  blind: boolean;
  /** Сообщение клиенту; пустая строка, если оно выключено */
  message: string;
  /** Что клиент увидит после теста */
  result: ResultMode;
  /** Время выполнения из описания теста («15–20 мин.») */
  duration?: string;
  /** Свайп вправо на первом экране и стрелка «назад» */
  onExit: () => void;
  /** Тест, отправленный себе: экран без рамки и подписей специалиста, как у клиента; ответы считаются и сохраняются */
  live?: { form: string; saveBlank: boolean };
}

/**
 * Предпросмотр теста в рамке телефона: начало (инструкция, число вопросов, время, кто увидит результат),
 * вопрос с ответами и завершение. Ответы здесь никуда не сохраняются. При слепом тестировании название теста скрыто.
 */
export function TestPreview({ test, blank, blind, message, result, duration, onExit, live }: TestPreviewProps) {
  const [stage, setStage] = useState<Stage>('start');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const total = blank.questions.length;
  const answered = Object.keys(picked).length;
  const last = index >= total - 1;
  const title = blind ? BLIND_TITLE : shortTitle(test.title);

  useEffect(() => {
    if (live) resetRun(test.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (answer: number) => {
    setPicked({ ...picked, [index]: answer });
    if (live) answerQuestion(test.id, index, answer);
  };
  const finish = () => {
    if (live) finishRun(test.id, total, live.form, live.saveBlank);
    setStage('end');
  };

  // Свайпы: влево — дальше (начало → вопросы → следующий вопрос → конец), вправо — назад, с первого экрана — к настройкам
  const touch = useRef<{ x: number; y: number } | null>(null);
  const step = (dir: 1 | -1) => {
    // Предпросмотр: свайп переключает этапы целиком, как вкладки «Начало / В процессе / Конец»
    if (!live) {
      const order: Stage[] = ['start', 'progress', 'end'];
      const next = order.indexOf(stage) + dir;
      if (next < 0) return onExit();
      if (next < order.length) setStage(order[next]);
      return;
    }
    // Свой тест: листаются вопросы, дальше нельзя без ответа
    if (stage === 'start') return dir > 0 ? setStage('progress') : onExit();
    if (stage === 'progress') {
      if (dir > 0) {
        if (picked[index] === undefined) return;
        return last ? finish() : setIndex(index + 1);
      }
      return index === 0 ? setStage('start') : setIndex(index - 1);
    }
  };
  const onTouchStart = (e: TouchEvent) => {
    touch.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    step(dx < 0 ? 1 : -1);
  };

  return (
    <div className={`test-settings__scroll tp${live ? ' tp--live' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {live && (
        <button type="button" className="tp__exit" aria-label="Назад" onClick={onExit}>
          <IconBack />
        </button>
      )}
      {!live && (
      <div className="tp__tabs" role="group" aria-label="Этап прохождения">
        {STAGES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`tp__tab${stage === id ? ' tp__tab--on' : ''}`}
            aria-pressed={stage === id}
            onClick={() => setStage(id)}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {!live && (
      <p className={`tp__badge${blind ? ' tp__badge--blind' : ''}`}>
        {blind ? <IconEyeOff /> : <IconEye />}
        <span>{blind ? 'Слепое тестирование: название скрыто' : 'Клиент увидит название теста'}</span>
      </p>
      )}

      <div className="tp__phone">
        {!live && (
          <div className="tp__status" aria-hidden="true">
            <span className="tp__notch" />
          </div>
        )}
        <div className="tp__screen" key={stage}>
          {stage === 'start' && (
            <>
              <p className="tp__eyebrow">Тест от вашего специалиста</p>
              <h3 className="tp__title">{title}</h3>
              {message.trim() !== '' && (
                <div className="tp__bubble">
                  <p className="tp__bubble-text">{message}</p>
                </div>
              )}
              <section className="tp__section">
                <h4 className="tp__label">Инструкция</h4>
                <div className="tp__rules">
                  <BlankRules rules={blank.rules} />
                </div>
              </section>
              <ul className="tp__facts">
                <li>
                  <IconClock />
                  <span>
                    {total} {questionsWord(total)}
                    {duration ? ` · ${duration.replace(/\.$/, '')}` : ''}
                  </span>
                </li>
                <li>
                  <IconUndo />
                  <span>Ответы можно менять до конца</span>
                </li>
                <li>
                  <IconLock />
                  <span>Ответы увидит только специалист</span>
                </li>
                <li>
                  <IconEye />
                  <span>{RESULT_FACT[result]}</span>
                </li>
              </ul>
            </>
          )}

          {stage === 'progress' && (
            <>
              <p className="tp__eyebrow">
                Вопрос {index + 1} из {total}
              </p>
              {blank.questions[index].heading && <p className="blank-heading tp__heading-pill">{blank.questions[index].heading}</p>}
              <div className="blank-question tp__question">
                <BlankQuestionBody
                  data={blank}
                  index={index}
                  answer={picked[index]}
                  locked={false}
                  numberedPrompt={false}
                  onChoose={choose}
                />
              </div>
            </>
          )}

          {stage === 'end' && (
            <div className="tp__done">
              <span className="tp__done-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <h3 className="tp__done-title">Спасибо, тест завершен</h3>
              <p className="tp__done-text">Ответы переданы вашему специалисту</p>
              {result === 'thanks' ? (
                <p className="tp__done-text">{RESULT_FACT.thanks}</p>
              ) : (
                <SampleResult testId={test.id} mode={result} />
              )}
            </div>
          )}
        </div>

        {(stage !== 'end' || live) && (
          <div className="tp__footer">
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
              {stage === 'end' && (
                <button type="button" className="test-settings__cta-button" onClick={onExit}>
                  Завершить
                </button>
              )}
              {stage === 'progress' && (
                <button type="button" className="test-pass__back" onClick={() => (index === 0 ? setStage('start') : setIndex(index - 1))}>
                  Назад
                </button>
              )}
              {stage === 'end' ? null : stage === 'start' ? (
                <button type="button" className="test-settings__cta-button" onClick={() => setStage('progress')}>
                  Начать
                </button>
              ) : last ? (
                <button type="button" className="test-settings__cta-button" onClick={finish}>
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
      </div>
    </div>
  );
}
