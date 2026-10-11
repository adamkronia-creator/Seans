import { useEffect, useRef, useState, type TouchEvent } from 'react';
import type { LibraryTask } from '../../data/library';
import { editTaskRun, finishTaskRun, resetTaskRun, useTaskRun } from '../../data/selfTask';
import { TASK_DEADLINES, emptyValues, progressOf, volumeText, type TaskSettingsData, type TaskValues } from '../../data/taskValues';
import { IconBack } from '../icons';
import { Toast } from '../Toast/Toast';
import { TaskForm } from './TaskForm';
import { ConfirmSheet, FillMeter, unfilledText } from './TaskPass';
import { BlankRules } from './TestBlank';
import { shortTitle } from './TestHeader';
import { Icon, IconClock, IconEye, IconLock, IconUndo } from './TestPreview';
import './TestPreview.css';

type Stage = 'start' | 'progress' | 'end';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'start', label: 'Начало' },
  { id: 'progress', label: 'В процессе' },
  { id: 'end', label: 'Конец' },
];

const IconCalendar = () => (
  <Icon>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M8 3.5v4M16 3.5v4M4 10h16" />
  </Icon>
);

interface TaskPreviewProps {
  task: LibraryTask;
  data: TaskSettingsData;
  form: string;
  /** Что включено в настройках: комментарий и оценка состояния */
  options: { comment: boolean; state: boolean };
  /** Сообщение клиенту; пустая строка, если оно выключено */
  message: string;
  /** Срок выполнения из настроек («Без срока», «Сутки»…) */
  deadline: string;
  /** Свайп вправо на первом экране и стрелка «назад» */
  onExit: () => void;
  /** Задание, отправленное себе: экран без рамки и подписей специалиста, как у клиента; написанное считается и сохраняется */
  live?: { saveBlank: boolean };
}

/**
 * Предпросмотр задания в рамке телефона: начало (инструкция, объём, время, срок), бланк и завершение.
 * Написанное здесь никуда не сохраняется. У задания, отправленного себе, тот же экран без рамки: оно выполняется по-настоящему.
 */
export function TaskPreview({ task, data, form, options, message, deadline, onExit, live }: TaskPreviewProps) {
  const [stage, setStage] = useState<Stage>('start');
  const [local, setLocal] = useState<TaskValues>(emptyValues);
  const run = useTaskRun(task.id);
  const values = live ? run.values : local;
  const change = (next: TaskValues) => (live ? editTaskRun(task.id, () => next) : setLocal(next));
  const { done, total } = progressOf(data.blank.sections(form), values);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>();
  const screenRef = useRef<HTMLDivElement>(null);
  const hasDeadline = deadline !== TASK_DEADLINES[0];

  useEffect(() => {
    if (live) resetTaskRun(task.id);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Новый этап открывается с начала экрана
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [stage]);

  const complete = () => {
    setConfirm(false);
    if (live) finishTaskRun(task.id, form, live.saveBlank);
    setStage('end');
  };
  const tryFinish = () => {
    if (!live) return complete();
    if (done === 0) {
      setToast('Заполните хотя бы одно поле');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 2600);
      return;
    }
    if (done < total) setConfirm(true);
    else complete();
  };

  // Свайпы: влево — дальше, вправо — назад, с первого экрана — к настройкам. На полях ввода и ползунках свайп не работает
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
    // Своё задание: от начала к бланку и обратно; завершить можно только кнопкой
    if (stage === 'start') return dir > 0 ? setStage('progress') : onExit();
    if (stage === 'progress' && dir < 0) setStage('start');
  };
  const onTouchStart = (e: TouchEvent) => {
    const onField = (e.target as Element).closest('input, textarea, [data-no-swipe]');
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
    <div className={`test-settings__scroll tp${live ? ' tp--live' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {live && (
        <button type="button" className="tp__exit" aria-label="Назад" onClick={onExit}>
          <IconBack />
        </button>
      )}
      {!live && (
        <div className="tp__tabs" role="group" aria-label="Этап выполнения">
          {STAGES.map(({ id, label }) => (
            <button key={id} type="button" className={`tp__tab${stage === id ? ' tp__tab--on' : ''}`} aria-pressed={stage === id} onClick={() => setStage(id)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {!live && (
        <p className="tp__badge">
          <IconEye />
          <span>Ответы в предпросмотре не сохраняются</span>
        </p>
      )}

      <div className="tp__phone">
        {!live && (
          <div className="tp__status" aria-hidden="true">
            <span className="tp__notch" />
          </div>
        )}
        <div className="tp__screen" key={stage} ref={screenRef}>
          {stage === 'start' && (
            <>
              <p className="tp__eyebrow">Задание от вашего специалиста</p>
              <h3 className="tp__title">{shortTitle(task.title)}</h3>
              {message.trim() !== '' && (
                <div className="tp__bubble">
                  <p className="tp__bubble-text">{message}</p>
                </div>
              )}
              <section className="tp__section">
                <h4 className="tp__label">Инструкция</h4>
                <div className="tp__rules">
                  <BlankRules rules={data.blank.rules(form)} />
                </div>
              </section>
              <ul className="tp__facts">
                <li>
                  <IconClock />
                  <span>
                    {volumeText(data)} · {data.duration}
                  </span>
                </li>
                {hasDeadline && (
                  <li>
                    <IconCalendar />
                    <span>Срок выполнения: {deadline.toLowerCase()}</span>
                  </li>
                )}
                <li>
                  <IconUndo />
                  <span>Любое поле можно пропустить</span>
                </li>
                <li>
                  <IconLock />
                  <span>Ответы увидит только специалист</span>
                </li>
              </ul>
            </>
          )}

          {stage === 'progress' && (
            <>
              <p className="tp__eyebrow">Бланк задания</p>
              <div className="tp__form">
                <TaskForm data={data} form={form} options={options} values={values} onChange={change} flat />
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
              <h3 className="tp__done-title">Спасибо, задание выполнено</h3>
              <p className="tp__done-text">Ответы переданы вашему специалисту</p>
              <p className="tp__done-text">Вы обсудите их на ближайшей встрече</p>
            </div>
          )}
        </div>

        {(stage !== 'end' || live) && (
          <div className="tp__footer">
            {stage === 'progress' && <FillMeter done={done} total={total} />}
            <div className="test-pass__buttons">
              {stage === 'progress' && (
                <button type="button" className="test-pass__back" onClick={() => setStage('start')}>
                  Назад
                </button>
              )}
              {stage === 'end' ? (
                <button type="button" className="test-settings__cta-button" onClick={onExit}>
                  Завершить
                </button>
              ) : stage === 'start' ? (
                <button type="button" className="test-settings__cta-button" onClick={() => setStage('progress')}>
                  Начать
                </button>
              ) : (
                <button type="button" className="test-settings__cta-button" onClick={tryFinish}>
                  Завершить задание
                </button>
              )}
            </div>
            {toast && <Toast text={toast} className="test-pass__toast" />}
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmSheet title="Завершить задание?" text={unfilledText(done, total)} confirm="Завершить" cancel="Вернуться" onConfirm={complete} onClose={() => setConfirm(false)} />
      )}
    </div>
  );
}
