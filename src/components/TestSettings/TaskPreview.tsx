import { useState } from 'react';
import type { LibraryTask } from '../../data/library';
import { emptyValues, type PermanentRule, type TaskSettingsData, type TaskValues } from '../../data/taskValues';
import { ClientIntro, TaskDone, taskFacts } from './ClientParts';
import { TaskForm } from './TaskForm';
import { CollapseCard } from './TestBlank';
import { TestHeader } from './TestHeader';
import './TestPreview.css';

interface TaskPreviewProps {
  task: LibraryTask;
  data: TaskSettingsData;
  form: string;
  /** Что включено в настройках: комментарий и оценка состояния */
  options: { comment: boolean; state: boolean };
  /** Срок выполнения из настроек («Без срока», «Сутки»…) */
  deadline: string;
  /** Правило постоянного задания, если оно включено в настройках */
  permanent?: PermanentRule;
}

/**
 * Блок «Предпросмотр» внизу настроек задания: то, что увидит клиент, в рамке телефона. Все блоки идут подряд на одном экране
 * и прокручиваются по вертикали, без этапов: сведения и инструкция, бланк со всеми полями, комментарий и состояние (если включены) и «Спасибо» в конце.
 * Меняете настройку выше — рамка меняется сразу. Написанное здесь никуда не сохраняется; сообщения специалиста в рамке нет.
 */
export function TaskPreview({ task, data, form, options, deadline, permanent }: TaskPreviewProps) {
  const [values, setValues] = useState<TaskValues>(emptyValues);
  return (
    <CollapseCard title="Предпросмотр" id="preview">
      <div className="tp tp--inline">
        <div className="tp__phone" data-hscroll>
          <div className="tp__status" aria-hidden="true">
            <span className="tp__notch" />
          </div>
          <TestHeader test={task} kind="task" client={{}} status="Задание от вашего специалиста" />
          <div className="test-settings__scroll tp__screen">
            <ClientIntro message="" rules={data.blank.rules(form)} facts={taskFacts(data, deadline, permanent)} />
            <TaskForm data={data} form={form} options={options} values={values} onChange={setValues} />
            <TaskDone record={permanent ? 1 : undefined} limit={permanent?.limit} />
          </div>
        </div>
      </div>
    </CollapseCard>
  );
}
