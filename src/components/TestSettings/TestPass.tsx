import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { answerQuestion, finishRun, resetRun, useSelfRun } from '../../data/selfTest';
import type { TestBlankData } from '../../data/testBlank';
import { SectionNav } from '../SectionNav/SectionNav';
import { useSheet } from './TestActions';
import { CollapseCard, TestBlank, blankSections } from './TestBlank';
import '../EditSheet/EditSheet.css';
import './TestPass.css';

interface TestPassProps {
  testId: string;
  blank: TestBlankData;
  /** Формы бланка; если их больше одной, выбор показан в начале: от формы зависят нормы подсчёта */
  forms?: string[];
  form: string;
  /** Переключатель «Сохранить бланк» из настроек: сохранять ли ответы вместе с результатом */
  saveBlank: boolean;
  onFormChange: (form: string) => void;
  /** Результат посчитан и сохранён */
  onDone: () => void;
}

function ResetSheet({ answered, onConfirm, onClose }: { answered: number; onConfirm: () => void; onClose: () => void }) {
  useSheet(onClose);
  return createPortal(
    <div className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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
    </div>,
    document.body,
  );
}

/**
 * Прохождение теста самому: бланк с выбором ответов, внизу счётчик и кнопка «Завершить тест».
 * Пока не отвечено на всё, кнопка ведёт к первому вопросу без ответа.
 */
export function TestPass({ testId, blank, forms, form, saveBlank, onFormChange, onDone }: TestPassProps) {
  const run = useSelfRun(testId);
  const total = blank.questions.length;
  const answered = Object.keys(run.answers).length;
  const [missing, setMissing] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const finish = () => {
    const first = blank.questions.findIndex((_, i) => run.answers[i] === undefined);
    if (first >= 0) {
      setMissing(first);
      setToast(`Осталось ответить: ${total - answered}`);
      document.getElementById(`blank-q-${first + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      later(() => setToast(null), 2600);
      later(() => setMissing((m) => (m === first ? null : m)), 3000);
      return;
    }
    if (finishRun(testId, total, form, saveBlank)) onDone();
  };

  const onAnswer = (question: number, answer: number) => {
    if (missing === question) setMissing(null);
    answerQuestion(testId, question, answer);
  };

  const showForms = forms !== undefined && forms.length > 1;
  const sections = [...(showForms ? [{ id: 'pass-form', title: 'Форма бланка' }] : []), ...blankSections(blank)];

  return (
    <>
      <div className="test-settings__scroll" key="pass">
        {showForms && (
          <CollapseCard title="Форма бланка" id="pass-form">
            <div className="test-pass__form">
              <ul className="blank-answers" role="radiogroup" aria-label="Форма бланка">
                {forms.map((f) => (
                  <li key={f}>
                    <label className="blank-answer">
                      <input
                        type="radio"
                        className="blank-answer__input"
                        name="pass-form"
                        checked={form === f}
                        onChange={() => onFormChange(f)}
                      />
                      <span className="blank-answer__radio" aria-hidden="true" />
                      <span className="blank-answer__text">{f}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="test-pass__hint">От формы бланка зависит перевод баллов в Т-баллы.</p>
            </div>
          </CollapseCard>
        )}
        <TestBlank data={blank} fill={{ answers: run.answers, onAnswer, missing }} />
      </div>
      <SectionNav sections={sections} scroller=".test-settings__scroll" />

      <div className="test-settings__cta test-pass__cta">
        <div className="test-pass__meta">
          <span>
            Отвечено: {answered} из {total}
          </span>
          {answered > 0 && (
            <button type="button" className="test-pass__reset" onClick={() => setResetOpen(true)}>
              Сбросить
            </button>
          )}
        </div>
        <div className="test-pass__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
          <span style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <button type="button" className="test-settings__cta-button" onClick={finish}>
          Завершить тест
        </button>
        {toast && (
          <p className="test-settings__toast test-pass__toast" role="status">
            {toast}
          </p>
        )}
      </div>

      {resetOpen && (
        <ResetSheet
          answered={answered}
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            resetRun(testId);
            setMissing(null);
            setResetOpen(false);
          }}
        />
      )}
    </>
  );
}
