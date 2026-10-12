import { useEffect, useRef, useState, type TouchEvent } from 'react';
import type { LibraryTask } from '../../data/library';
import { emptyValues, progressOf, type TaskSettingsData, type TaskValues } from '../../data/taskValues';
import { ClientIntro, IconEye, TaskDone, taskFacts } from './ClientParts';
import { FillMeter, taskSteps } from './PassParts';
import { TaskForm } from './TaskForm';
import { TestHeader } from './TestHeader';
import './TestPreview.css';

type Stage = 'start' | 'progress' | 'end';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'start', label: 'Начало' },
  { id: 'progress', label: 'В процессе' },
  { id: 'end', label: 'Конец' },
];

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
}

/**
 * Предпросмотр задания в рамке телефона: начало (сообщение, инструкция, объём, время, срок), бланк и завершение.
 * Внутри рамки тот же интерфейс, что у клиента и при прохождении самому. Написанное здесь никуда не сохраняется.
 */
export function TaskPreview({ task, data, form, options, message, deadline, onExit }: TaskPreviewProps) {
  const [stage, setStage] = useState<Stage>('start');
  const [values, setValues] = useState<TaskValues>(emptyValues);
  // В процессе бланк идёт страницами, как при выполнении: поля, комментарий, состояние
  const parts = taskSteps(options).slice(1) as ('form' | 'comment' | 'state')[];
  const [partAt, setPartAt] = useState(0);
  const part = Math.min(partAt, parts.length - 1);
  const { done, total } = progressOf(data.blank.sections(form), values);
  const screenRef = useRef<HTMLDivElement>(null);

  // Новый этап открывается с начала экрана
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [stage, part]);

  // Свайпы переключают этапы целиком, как вкладки «Начало / В процессе / Конец»; с первого этапа вправо — к настройкам.
  // На полях ввода и ползунках свайп не работает
  const touch = useRef<{ x: number; y: number } | null>(null);
  const step = (dir: 1 | -1) => {
    const order: Stage[] = ['start', 'progress', 'end'];
    const next = order.indexOf(stage) + dir;
    if (next < 0) return onExit();
    if (next < order.length) setStage(order[next]);
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
    <div className="test-settings__scroll tp" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="tp__tabs" role="group" aria-label="Этап выполнения">
        {STAGES.map(({ id, label }) => (
          <button key={id} type="button" className={`tp__tab${stage === id ? ' tp__tab--on' : ''}`} aria-pressed={stage === id} onClick={() => setStage(id)}>
            {label}
          </button>
        ))}
      </div>

      <p className="tp__badge">
        <IconEye />
        <span>Ответы в предпросмотре не сохраняются</span>
      </p>

      <div className="tp__phone">
        <div className="tp__status" aria-hidden="true">
          <span className="tp__notch" />
        </div>
        <TestHeader test={task} kind="task" client={{}} status="Задание от вашего специалиста" onBack={onExit} />
        <div className="test-settings__scroll tp__screen" key={`${stage}${part}`} ref={screenRef}>
          {stage === 'start' && <ClientIntro message={message} rules={data.blank.rules(form)} facts={taskFacts(data, form, deadline)} />}
          {stage === 'progress' && <TaskForm data={data} form={form} options={options} only={parts[part]} values={values} onChange={setValues} />}
          {stage === 'end' && <TaskDone />}
        </div>

        {stage !== 'end' && (
          <div className="test-settings__cta test-pass__cta tp__footer">
            <FillMeter done={done} total={total} />
            <div className="test-pass__buttons">
              {stage === 'progress' && (
                <button type="button" className="test-pass__back" onClick={() => (part > 0 ? setPartAt(part - 1) : setStage('start'))}>
                  Назад
                </button>
              )}
              {stage === 'start' ? (
                <button
                  type="button"
                  className="test-settings__cta-button"
                  onClick={() => {
                    setPartAt(0);
                    setStage('progress');
                  }}
                >
                  Начать
                </button>
              ) : part < parts.length - 1 ? (
                <button type="button" className="test-settings__cta-button" onClick={() => setPartAt(part + 1)}>
                  Далее
                </button>
              ) : (
                <button type="button" className="test-settings__cta-button" onClick={() => setStage('end')}>
                  Завершить задание
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
