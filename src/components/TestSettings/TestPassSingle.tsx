import { useEffect, useRef } from 'react';
import { IconTestBlank, IconTestChevron } from '../icons';
import type { TestBlankData } from '../../data/testBlank';
import { useSheet } from './TestActions';
import { BlankQuestionBody } from './TestBlank';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import '../EditSheet/EditSheet.css';
import './TestPass.css';

/** Пояснение к группе вопросов («Сейчас, в данный момент:»): в данных оно стоит у первого вопроса группы, а на отдельном экране нужно у каждого */
function headingOf(data: TestBlankData, index: number): string | undefined {
  for (let i = index; i >= 0; i--) {
    const heading = data.questions[i].heading;
    if (heading) return heading;
  }
  return undefined;
}

interface PassQuestionProps {
  data: TestBlankData;
  /** Номер вопроса (с 0) */
  index: number;
  /** Номер выбранного ответа */
  answer: number | undefined;
  /** Куда идёт прохождение: от этого зависит, с какой стороны выезжает вопрос */
  dir: 'next' | 'prev';
  /** Вопрос без ответа, к которому привела кнопка «Завершить тест»: он подсвечивается */
  missing: boolean;
  onChoose: (answer: number) => void;
  /** Вариант нажат пальцем или мышью: можно открывать следующий вопрос */
  onPick: () => void;
  /** Открыть окно со всеми вопросами */
  onOpenAll: () => void;
}

/** Экран одного вопроса: заголовок «Вопрос 12 из 90» со ссылкой на все вопросы, ниже сам вопрос с вариантами ответов */
export function PassQuestion({ data, index, answer, dir, missing, onChoose, onPick, onOpenAll }: PassQuestionProps) {
  const heading = headingOf(data, index);
  // Время последнего нажатия пальцем или мышью: по нему отличаем нажатие от выбора клавишей
  const pointerAt = useRef(-Infinity);

  return (
    <section className="blank-card pass-q">
      <div className="blank-card__head pass-q__head">
        <h2 className="blank-card__title" aria-live="polite">
          Вопрос {index + 1} из {data.questions.length}
        </h2>
        <button type="button" className="pass-q__all" onClick={onOpenAll}>
          Все вопросы
        </button>
      </div>
      <div className={`pass-q__body pass-q__body--${dir}`} key={index}>
        {heading && <p className="blank-heading">{heading}</p>}
        <div
          className={`blank-question${missing ? ' blank-question--missing' : ''}`}
          onPointerDown={() => {
            pointerAt.current = performance.now();
          }}
          onClick={(e) => {
            // Выбор стрелками или пробелом тоже даёт «клик» по радиокнопке, но листать после него нельзя:
            // человек ещё выбирает. Листают только нажатия пальцем или мышью, в том числе по уже выбранному ответу.
            const onAnswer = (e.target as HTMLElement).closest('.blank-answer, .blank-scale__item');
            if (onAnswer && performance.now() - pointerAt.current < 1500) onPick();
          }}
        >
          <BlankQuestionBody
            data={data}
            index={index}
            answer={answer}
            locked={false}
            numberedPrompt={false}
            onChoose={onChoose}
          />
        </div>
      </div>
    </section>
  );
}

interface JumpSheetProps {
  total: number;
  answers: Record<number, number>;
  /** Открытый сейчас вопрос (с 0) */
  current: number;
  /** Подпись строки с правилами: если в начале выбирают форму бланка, она упомянута здесь же */
  rulesLabel: string;
  onPick: (index: number) => void;
  onRules: () => void;
  onClose: () => void;
}

/** Окно «Все вопросы»: строка «Правила» и сетка номеров; с ответом — синие, открытый обведён */
export function JumpSheet({ total, answers, current, rulesLabel, onPick, onRules, onClose }: JumpSheetProps) {
  useSheet(onClose);
  const answered = Object.keys(answers).length;
  const currentRef = useRef<HTMLButtonElement>(null);

  // Открытый вопрос виден сразу, даже если их несколько сотен
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Все вопросы">
        <div className="sheet__header">
          <h2 className="sheet__heading">Все вопросы</h2>
        </div>
        <div className="sheet__body">
          <ul className="ts-card">
            <li>
              <button type="button" className="ts-row ts-row--link pass-jump__rules" onClick={onRules}>
                <IconTestBlank className="ts-row__icon" aria-hidden="true" />
                <span className="ts-row__link">{rulesLabel}</span>
                <IconTestChevron className="ts-row__chevron" aria-hidden="true" />
              </button>
            </li>
          </ul>
          <section className="sheet__card pass-jump">
            <p className="test-pass__hint">
              Отвечено: {answered} из {total}. Вопросы с ответом выделены синим.
            </p>
            <ul className="pass-jump__grid">
              {Array.from({ length: total }, (_, i) => {
                const done = answers[i] !== undefined;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      ref={i === current ? currentRef : undefined}
                      className={`pass-jump__cell${done ? ' pass-jump__cell--done' : ''}${i === current ? ' pass-jump__cell--current' : ''}`}
                      aria-label={`Вопрос ${i + 1}${done ? ', есть ответ' : ''}`}
                      aria-current={i === current ? 'true' : undefined}
                      onClick={() => onPick(i)}
                    >
                      {i + 1}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
