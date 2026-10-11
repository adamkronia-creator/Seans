import { useEffect, useRef, useState } from 'react';
import { editTaskRun, finishTaskRun, resetTaskRun, useTaskRun } from '../../data/selfTask';
import { progressOf, type TaskSettingsData } from '../../data/taskValues';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import { Toast } from '../Toast/Toast';
import { TaskForm } from './TaskForm';
import { BlankRules, CollapseCard } from './TestBlank';
import '../EditSheet/EditSheet.css';
import './TestPass.css';

/** Окно с вопросом и двумя кнопками: подтвердить сброс или завершение с пустыми полями */
export function ConfirmSheet({
  title,
  text,
  confirm,
  cancel = 'Отмена',
  onConfirm,
  onClose,
}: {
  title: string;
  text: string;
  confirm: string;
  cancel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useSheet(onClose);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__header">
          <h2 className="sheet__heading">{title}</h2>
        </div>
        <div className="sheet__body">
          <p className="test-pass__confirm">{text}</p>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            {cancel}
          </button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}

/** «Заполнено 3 из 10» и полоса: сколько полей бланка уже написано */
export function FillMeter({ done, total, onReset }: { done: number; total: number; onReset?: () => void }) {
  return (
    <>
      <div className="test-pass__meta">
        <span>
          Заполнено: {done} из {total}
        </span>
        {onReset && (
          <button type="button" className="test-pass__reset" onClick={onReset}>
            Сбросить
          </button>
        )}
      </div>
      <div className="test-pass__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
    </>
  );
}

/** Текст окна «Завершить задание?», когда заполнены не все поля */
export const unfilledText = (done: number, total: number) =>
  `Заполнено ${done} из ${total}. Пустые поля в результате будут отмечены как «Не заполнено»: их можно пропустить.`;

interface TaskPassProps {
  taskId: string;
  data: TaskSettingsData;
  /** Форма бланка выбрана заранее в настройках задания: при выполнении её не спрашивают */
  form: string;
  /** Что включено в настройках: комментарий и оценка состояния */
  options: { comment: boolean; state: boolean };
  /** Переключатель «Сохранить бланк» из настроек: сохранять ли написанное вместе с результатом */
  saveBlank: boolean;
  /** Задание выполнено и сохранено: номер результата */
  onDone: (resultId: string) => void;
}

/**
 * Выполнение задания самому: сначала инструкция, затем бланк целиком. Написанное остаётся, если выйти и вернуться.
 * Внизу счётчик заполненных полей и кнопки; пустые поля можно пропустить, но не все сразу.
 */
export function TaskPass({ taskId, data, form, options, saveBlank, onDone }: TaskPassProps) {
  const run = useTaskRun(taskId);
  const sections = data.blank.sections(form);
  const { done, total } = progressOf(sections, run.values);
  const started = run.startedAt !== undefined;
  // Если что-то уже написано (вышли и вернулись), открываем бланк, а не инструкцию
  const [step, setStep] = useState<'rules' | 'form'>(started ? 'form' : 'rules');
  const [sheet, setSheet] = useState<'reset' | 'finish' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Новый экран всегда открывается с начала
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const finish = () => {
    setSheet(null);
    onDone(finishTaskRun(taskId, form, saveBlank).id);
  };

  const tryFinish = () => {
    if (done === 0) {
      setToast('Заполните хотя бы одно поле');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 2600);
      return;
    }
    if (done < total) setSheet('finish');
    else finish();
  };

  return (
    <>
      <div className="test-settings__scroll" key={step} ref={scrollRef}>
        {step === 'rules' ? (
          <CollapseCard title="Инструкция" id="blank-rules">
            <BlankRules rules={data.blank.rules(form)} />
          </CollapseCard>
        ) : (
          <TaskForm data={data} form={form} options={options} values={run.values} onChange={(next) => editTaskRun(taskId, () => next)} />
        )}
      </div>

      <div className="test-settings__cta test-pass__cta">
        <FillMeter done={done} total={total} onReset={started ? () => setSheet('reset') : undefined} />
        <div className="test-pass__buttons">
          {step === 'form' && (
            <button type="button" className="test-pass__back" onClick={() => setStep('rules')}>
              Назад
            </button>
          )}
          {step === 'rules' ? (
            <button type="button" className="test-settings__cta-button" onClick={() => setStep('form')}>
              {started ? 'Продолжить' : 'Начать'}
            </button>
          ) : (
            <button type="button" className="test-settings__cta-button" onClick={tryFinish}>
              Завершить задание
            </button>
          )}
        </div>

        {toast && <Toast text={toast} className="test-pass__toast" />}
      </div>

      {sheet === 'finish' && (
        <ConfirmSheet title="Завершить задание?" text={unfilledText(done, total)} confirm="Завершить" cancel="Вернуться" onConfirm={finish} onClose={() => setSheet(null)} />
      )}
      {sheet === 'reset' && (
        <ConfirmSheet
          title="Сбросить написанное?"
          text="Всё, что вы написали, будет удалено, и задание придётся начать сначала."
          confirm="Сбросить"
          onClose={() => setSheet(null)}
          onConfirm={() => {
            resetTaskRun(taskId);
            setSheet(null);
            setStep('rules');
          }}
        />
      )}
    </>
  );
}
