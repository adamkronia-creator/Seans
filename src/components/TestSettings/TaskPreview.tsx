import { useEffect, useRef, useState, type TouchEvent } from 'react';
import type { LibraryTask } from '../../data/library';
import { emptyValues, progressOf, type PermanentRule, type TaskSettingsData, type TaskValues } from '../../data/taskValues';
import { ClientIntro, TaskDone, taskFacts } from './ClientParts';
import { CollapseCard } from './TestBlank';
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
  /** Срок выполнения из настроек («Без срока», «Сутки»…) */
  deadline: string;
  /** Правило постоянного задания, если оно включено в «Правилах назначения» */
  permanent?: PermanentRule;
}

/**
 * Блок «Предпросмотр» внизу настроек задания (как у теста): то, что увидит клиент, в рамке телефона, и меняется вместе с настройками выше.
 * Внутри: начало (инструкция и сведения), бланк страницами и завершение; сообщения специалиста в рамке нет.
 * Внутри рамки тот же интерфейс, что у клиента и при прохождении самому. Написанное здесь никуда не сохраняется.
 */
export function TaskPreview({ task, data, form, options, deadline, permanent }: TaskPreviewProps) {
  const [stage, setStage] = useState<Stage>('start');
  const [values, setValues] = useState<TaskValues>(emptyValues);
  // В процессе бланк идёт страницами, как при выполнении: поля, комментарий, состояние
  const sections = data.blank.sections(form);
  const parts = taskSteps(options, data.blank.pages, sections, values).slice(1);
  const [partId, setPartId] = useState('');
  const part = Math.max(0, parts.indexOf(partId));
  const setPartAt = (n: number) => setPartId(parts[n]);
  const { done, total } = progressOf(sections, values);
  const screenRef = useRef<HTMLDivElement>(null);

  // Новый этап открывается с начала экрана
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 });
  }, [stage, part]);

  // Свайпы переключают этапы целиком, как вкладки «Начало / В процессе / Конец»; на первом этапе вправо — ничего.
  // На полях ввода и ползунках свайп не работает
  const touch = useRef<{ x: number; y: number } | null>(null);
  const step = (dir: 1 | -1) => {
    const order: Stage[] = ['start', 'progress', 'end'];
    const next = order.indexOf(stage) + dir;
    if (next < 0) return;
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
    <CollapseCard title="Предпросмотр" id="preview">
    <div className="tp tp--inline" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="tp__tabs" role="group" aria-label="Этап выполнения">
        {STAGES.map(({ id, label }) => (
          <button key={id} type="button" className={`tp__tab${stage === id ? ' tp__tab--on' : ''}`} aria-pressed={stage === id} onClick={() => setStage(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="tp__phone" data-hscroll>
        <div className="tp__status" aria-hidden="true">
          <span className="tp__notch" />
        </div>
        <TestHeader test={task} kind="task" client={{}} status="Задание от вашего специалиста" />
        <div className="test-settings__scroll tp__screen" key={`${stage}${part}`} ref={screenRef}>
          {stage === 'start' && <ClientIntro message="" rules={data.blank.rules(form)} facts={taskFacts(data, deadline, permanent)} />}
          {stage === 'progress' && <TaskForm data={data} form={form} options={options} only={parts[part]} values={values} onChange={setValues} onEntryStep={(sectionId, index) => setPartId(`each:${sectionId}:${index}`)} />}
          {stage === 'end' && <TaskDone record={permanent ? 1 : undefined} limit={permanent?.limit} />}
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
    </CollapseCard>
  );
}
