import { useEffect, useRef, useState } from 'react';
import type { ResultMode } from '../../data/resultMode';
import { answerQuestion, finishRun, resetRun, useSelfRun } from '../../data/selfTest';
import type { TestBlankData } from '../../data/testBlank';
import { Toast } from '../Toast/Toast';
import { useSheet } from '../EditSheet/useSheet';
import { ClientIntro, testFacts } from './ClientParts';
import { FillMeter } from './PassParts';
import { BlankRules, CollapseCard } from './TestBlank';
import { TestDone } from './TestDone';
import { ADVANCE_MS, JumpSheet, PassQuestion } from './TestPassSingle';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import '../EditSheet/EditSheet.css';
import './TestPass.css';

/** Экран клиента: тест, присланный специалистом (или отправленный себе). Прохождение то же, что у специалиста, только с его сообщением и «Спасибо» в конце */
export interface TestClient {
  /** Сообщение специалиста; пустое, если оно выключено */
  message: string;
  /** Что клиент увидит после теста */
  result: ResultMode;
  /** Время выполнения из описания теста («15–20 мин.») */
  duration?: string;
  /** «Завершить» на экране «Спасибо» */
  onExit: () => void;
}

interface TestPassProps {
  testId: string;
  blank: TestBlankData;
  /** Форма бланка выбрана заранее в настройках теста: при прохождении ее не спрашивают */
  form: string;
  /** Переключатель «Сохранить бланк» из настроек: сохранять ли ответы вместе с результатом */
  saveBlank: boolean;
  /** Результат посчитан и сохранён: id результата (у клиента не вызывается: он остаётся на экране «Спасибо») */
  onDone?: (resultId: string) => void;
  client?: TestClient;
}

function ResetSheet({ answered, onConfirm, onClose }: { answered: number; onConfirm: () => void; onClose: () => void }) {
  useSheet(onClose);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Сбросить ответы">
        <div className="sheet__header">
          <h2 className="sheet__heading">Сбросить ответы?</h2>
        </div>
        <div className="sheet__body">
          <p className="test-pass__confirm">Отмеченные ответы ({answered}) будут удалены, и тест придётся начать сначала.</p>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={onConfirm}>
            Сбросить
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}

/**
 * Прохождение теста самому: внизу счётчик и кнопки, ответы отмечаются в бланке.
 * Вопросы идут по одному: сначала инструкция, затем вопрос за вопросом с кнопками «Назад» и «Далее».
 * У клиента тот же экран: на первом шаге добавляются сообщение специалиста и сведения, после завершения — «Спасибо».
 */
export function TestPass({ testId, blank, form, saveBlank, onDone, client }: TestPassProps) {
  const run = useSelfRun(testId);
  const total = blank.questions.length;
  const answered = Object.keys(run.answers).length;
  // Первый вопрос без ответа (с 0), −1 если ответили на всё
  const firstOpen = blank.questions.findIndex((_, i) => run.answers[i] === undefined);
  const [missing, setMissing] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const timers = useRef<number[]>([]);

  // По одному: −1 — инструкция, дальше номер открытого вопроса (с 0).
  // Если ответы уже есть (вышли из теста и вернулись), продолжаем с первого вопроса без ответа
  const [step, setStep] = useState(() => (answered === 0 ? -1 : firstOpen >= 0 ? firstOpen : total - 1));
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  // Вопрос, с которого ушли к правилам: «Продолжить» вернёт на него
  const [returnTo, setReturnTo] = useState<number | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  // Клиент прошёл тест: вместо результата экран «Спасибо»
  const [finished, setFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const advance = useRef<number>();

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(advance.current);
    },
    [],
  );

  // Новый вопрос всегда открывается с начала, даже если предыдущий пришлось прокручивать
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step, finished]);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const goTo = (target: number) => {
    window.clearTimeout(advance.current);
    const next = Math.min(Math.max(target, -1), total - 1);
    if (next === step) return;
    setDir(next > step ? 'next' : 'prev');
    if (next < 0) setReturnTo(step);
    setStep(next);
  };

  /** С правил: на вопрос, с которого ушли, а в начале — на первый без ответа */
  const start = () => {
    const target = returnTo ?? (firstOpen >= 0 ? firstOpen : total - 1);
    setReturnTo(null);
    goTo(target);
  };

  const finish = () => {
    if (firstOpen >= 0) {
      setMissing(firstOpen);
      setToast(`Осталось ответить: ${total - answered}`);
      goTo(firstOpen);
      later(() => setToast(null), 2600);
      later(() => setMissing((m) => (m === firstOpen ? null : m)), 3000);
      return;
    }
    const result = finishRun(testId, total, form, saveBlank);
    if (!result) return;
    if (client) setFinished(true);
    else onDone?.(result.id);
  };

  const onAnswer = (question: number, answer: number) => {
    if (missing === question) setMissing(null);
    answerQuestion(testId, question, answer);
  };

  /** Вариант нажат пальцем или мышью: чуть погодя открываем следующий вопрос; на последнем остаёмся — дальше «Завершить тест» */
  const picked = (question: number) => {
    if (question >= total - 1) return;
    window.clearTimeout(advance.current);
    advance.current = window.setTimeout(() => goTo(question + 1), ADVANCE_MS);
  };

  const openAll = () => {
    window.clearTimeout(advance.current);
    setJumpOpen(true);
  };

  return (
    <>
      <div className="test-settings__scroll" key={finished ? 'thanks' : 'pass'} ref={scrollRef}>
        {finished && client ? (
          <TestDone testId={testId} result={client.result} />
        ) : step < 0 ? (
          client ? (
            <ClientIntro message="" rules={blank.rules} facts={testFacts(total, client.duration, client.result)} />
          ) : (
            <CollapseCard title="Инструкция" id="blank-rules">
              <BlankRules rules={blank.rules} />
            </CollapseCard>
          )
        ) : (
          <PassQuestion
            data={blank}
            index={step}
            answer={run.answers[step]}
            dir={dir}
            missing={missing === step}
            onChoose={(answer) => onAnswer(step, answer)}
            onPick={() => picked(step)}
            onOpenAll={openAll}
          />
        )}
      </div>

      <div className="test-settings__cta test-pass__cta">
        {finished && client ? (
          <div className="test-pass__buttons">
            <button type="button" className="test-settings__cta-button" onClick={client.onExit}>
              Завершить
            </button>
          </div>
        ) : (
          <>
            <FillMeter label="Отвечено" done={answered} total={total} onReset={answered > 0 ? () => setResetOpen(true) : undefined} />
            <div className="test-pass__buttons">
              {step >= 0 && (
                <button type="button" className="test-pass__back" onClick={() => goTo(step - 1)}>
                  Назад
                </button>
              )}
              {step < 0 ? (
                <button type="button" className="test-settings__cta-button" onClick={start}>
                  {answered > 0 || returnTo !== null ? 'Продолжить' : 'Начать'}
                </button>
              ) : step < total - 1 ? (
                <button
                  type="button"
                  className="test-settings__cta-button"
                  disabled={run.answers[step] === undefined}
                  onClick={() => goTo(step + 1)}
                >
                  Далее
                </button>
              ) : (
                <button type="button" className="test-settings__cta-button" onClick={finish}>
                  Завершить тест
                </button>
              )}
            </div>
          </>
        )}

        {toast && <Toast text={toast} className="test-pass__toast" />}
      </div>

      {jumpOpen && (
        <JumpSheet
          total={total}
          answers={run.answers}
          current={step}
          rulesLabel="Инструкция"
          onClose={() => setJumpOpen(false)}
          onPick={(index) => {
            setJumpOpen(false);
            goTo(index);
          }}
          onRules={() => {
            setJumpOpen(false);
            goTo(-1);
          }}
        />
      )}

      {resetOpen && (
        <ResetSheet
          answered={answered}
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            window.clearTimeout(advance.current);
            resetRun(testId);
            setMissing(null);
            setResetOpen(false);
            setStep(-1);
            setReturnTo(null);
          }}
        />
      )}
    </>
  );
}
