import { useState } from 'react';
import type { LibraryTask, LibraryTest } from '../../data/library';
import { blindTitle, type ResultMode } from '../../data/resultMode';
import { emptyValues, type PermanentRule, type TaskSettingsData, type TaskValues } from '../../data/taskValues';
import type { TestBlankData } from '../../data/testBlank';
import { ClientIntro, TaskDone, taskFacts, testFacts } from './ClientParts';
import { taskSteps } from './PassParts';
import { TaskForm } from './TaskForm';
import { TestDone } from './TestDone';
import { TestHeader } from './TestHeader';
import { PassQuestion } from './TestPassSingle';
import './TestPreview.css';

/** Сколько первых вопросов теста показывает предпросмотр: остальные устроены так же */
export const PREVIEW_QUESTIONS = 5;

/**
 * Предпросмотр теста: экран клиента целиком, в нижнем окне без рамки телефона. Шапка, инструкция и сведения, первые вопросы и
 * экран завершения идут одной лентой — её листают. Ответы никуда не сохраняются. При слепом тестировании название и значок скрыты.
 */
export function TestPreviewScreen({ test, blank, blind, result, duration }: { test: LibraryTest; blank: TestBlankData; blind: boolean; result: ResultMode; duration?: string }) {
  // Номер слепого теста в предпросмотре: время открытия окна; у настоящего теста он ставится при отправке
  const [title] = useState(() => blindTitle());
  const [picked, setPicked] = useState<Record<number, number>>({});
  const total = blank.questions.length;
  const shown = Math.min(total, PREVIEW_QUESTIONS);
  return (
    <div className="pv">
      <TestHeader test={test} client={{ blind, title }} status="Тест от вашего специалиста" />
      <div className="test-settings__scroll pv__scroll">
        <ClientIntro message="" rules={blank.rules} facts={testFacts(total, duration)} />
        {Array.from({ length: shown }, (_, i) => (
          <PassQuestion key={i} data={blank} index={i} answer={picked[i]} dir="next" missing={false} onChoose={(answer) => setPicked((p) => ({ ...p, [i]: answer }))} onPick={() => undefined} />
        ))}
        {total > shown && <p className="pv__more">Это первые {shown} вопросов из {total}, остальные устроены так же</p>}
        <TestDone testId={test.id} result={result} />
      </div>
    </div>
  );
}

/**
 * Предпросмотр задания: то же для задания. Инструкция и сведения, затем бланк шаг за шагом (как при выполнении) и экран «Спасибо» — одной лентой.
 * Написанное здесь никуда не сохраняется.
 */
export function TaskPreviewScreen({
  task,
  data,
  form,
  options,
  deadline,
  permanent,
}: {
  task: LibraryTask;
  data: TaskSettingsData;
  form: string;
  options: { comment: boolean; state: boolean };
  deadline: string;
  permanent?: PermanentRule;
}) {
  const [values, setValues] = useState<TaskValues>(emptyValues);
  const parts = taskSteps(options, data.blank.pages, data.blank.sections(form), values).slice(1);
  return (
    <div className="pv">
      <TestHeader test={task} kind="task" client={{}} status="Задание от вашего специалиста" />
      <div className="test-settings__scroll pv__scroll">
        <ClientIntro message="" rules={data.blank.rules(form)} facts={taskFacts(data, deadline, permanent)} />
        {parts.map((part) => (
          <TaskForm key={part} data={data} form={form} options={options} only={part} values={values} onChange={setValues} />
        ))}
        <TaskDone record={permanent ? 1 : undefined} limit={permanent?.limit} />
      </div>
    </div>
  );
}
