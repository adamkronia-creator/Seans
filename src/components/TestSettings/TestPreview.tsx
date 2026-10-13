import { useEffect, useRef, useState, type TouchEvent } from 'react';
import type { LibraryTest } from '../../data/library';
import { blindTitle, type ResultMode } from '../../data/resultMode';
import type { TestBlankData } from '../../data/testBlank';
import { ClientIntro, testFacts } from './ClientParts';
import { CollapseCard } from './TestBlank';
import { FillMeter } from './PassParts';
import { TestDone } from './TestDone';
import { TestHeader } from './TestHeader';
import { ADVANCE_MS, JumpSheet, PassQuestion } from './TestPassSingle';
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
  /** Что клиент увидит после теста */
  result: ResultMode;
  /** Время выполнения из описания теста («15–20 мин.») */
  duration?: string;
}

/**
 * Блок «Предпросмотр» внизу настроек теста: то, что увидит клиент, в рамке телефона. Меняете настройку выше — рамка меняется сразу.
 * Внутри: начало (сообщение, инструкция, число вопросов, время, кто увидит результат),
 * вопрос с ответами и завершение. Внутри рамки тот же интерфейс, что у клиента и при прохождении самому.
 * Ответы здесь никуда не сохраняются. При слепом тестировании название и значок теста скрыты.
 */
export function TestPreview({ test, blank, blind, result, duration }: TestPreviewProps) {
  // Номер слепого теста в предпросмотре: время открытия настроек; у настоящего теста он ставится при отправке
  const [title] = useState(() => blindTitle());
  const [stage, setStage] = useState<Stage>('start');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [jumpOpen, setJumpOpen] = useState(false);
  const total = blank.questions.length;
  const answered = Object.keys(picked).length;
  const last = index >= total - 1;
  const screenRef = useRef<HTMLDivElement>(null);
  const advance = useRef<number>();

  useEffect(() => () => window.clearTimeout(advance.current), []);
  // Новый этап и новый вопрос открываются с начала экрана
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [stage, index]);

  const goTo = (target: number) => {
    window.clearTimeout(advance.current);
    const next = Math.min(Math.max(target, 0), total - 1);
    if (next === index) return;
    setDir(next > index ? 'next' : 'prev');
    setIndex(next);
  };
  /** Вариант нажат: чуть погодя открываем следующий вопрос, как при самостоятельном прохождении */
  const onPick = () => {
    if (last) return;
    window.clearTimeout(advance.current);
    advance.current = window.setTimeout(() => goTo(index + 1), ADVANCE_MS);
  };
  const toStage = (next: Stage) => {
    window.clearTimeout(advance.current);
    setStage(next);
  };

  // Свайпы переключают этапы целиком, как вкладки «Начало / В процессе / Конец»; на первом этапе вправо — ничего (экран настроек остаётся на месте)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const step = (way: 1 | -1) => {
    const order: Stage[] = ['start', 'progress', 'end'];
    const next = order.indexOf(stage) + way;
    if (next < 0) return;
    if (next < order.length) toStage(order[next]);
  };
  const onTouchStart = (e: TouchEvent) => {
    const onField = (e.target as Element).closest('input, textarea, select, [data-no-swipe]');
    touch.current = e.touches.length === 1 && !onField ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
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
    <>
      <CollapseCard title="Предпросмотр" id="preview">
      <div className="tp tp--inline" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="tp__tabs" role="group" aria-label="Этап прохождения">
          {STAGES.map(({ id, label }) => (
            <button key={id} type="button" className={`tp__tab${stage === id ? ' tp__tab--on' : ''}`} aria-pressed={stage === id} onClick={() => toStage(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="tp__phone" data-hscroll>
          <div className="tp__status" aria-hidden="true">
            <span className="tp__notch" />
          </div>
          <TestHeader test={test} client={{ blind, title }} status="Тест от вашего специалиста" />
          <div className="test-settings__scroll tp__screen" key={stage} ref={screenRef}>
            {stage === 'start' && <ClientIntro message="" rules={blank.rules} facts={testFacts(total, duration)} />}
            {stage === 'progress' && (
              <PassQuestion
                data={blank}
                index={index}
                answer={picked[index]}
                dir={dir}
                missing={false}
                onChoose={(answer) => setPicked({ ...picked, [index]: answer })}
                onPick={onPick}
                onOpenAll={() => {
                  window.clearTimeout(advance.current);
                  setJumpOpen(true);
                }}
              />
            )}
            {stage === 'end' && <TestDone testId={test.id} result={result} />}
          </div>

          {stage !== 'end' && (
            <div className="test-settings__cta test-pass__cta tp__footer">
              <FillMeter label="Отвечено" done={answered} total={total} />
              <div className="test-pass__buttons">
                {stage === 'progress' && (
                  <button type="button" className="test-pass__back" onClick={() => (index === 0 ? toStage('start') : goTo(index - 1))}>
                    Назад
                  </button>
                )}
                {stage === 'start' ? (
                  <button type="button" className="test-settings__cta-button" onClick={() => toStage('progress')}>
                    Начать
                  </button>
                ) : last ? (
                  <button type="button" className="test-settings__cta-button" onClick={() => toStage('end')}>
                    Завершить тест
                  </button>
                ) : (
                  <button type="button" className="test-settings__cta-button" disabled={picked[index] === undefined} onClick={() => goTo(index + 1)}>
                    Далее
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </CollapseCard>

      {jumpOpen && (
        <JumpSheet
          total={total}
          answers={picked}
          current={index}
          rulesLabel="Инструкция"
          onClose={() => setJumpOpen(false)}
          onPick={(i) => {
            setJumpOpen(false);
            setStage('progress');
            goTo(i);
          }}
          onRules={() => {
            setJumpOpen(false);
            toStage('start');
          }}
        />
      )}
    </>
  );
}
