import { useEffect, useRef, useState } from 'react';
import { editTaskRun, finishTaskRun, resetTaskRun, useTaskRun } from '../../data/selfTask';
import { progressOf, type PermanentRule, type TaskSettingsData } from '../../data/taskValues';
import { Toast } from '../Toast/Toast';
import { ClientIntro, TaskDone, taskFacts } from './ClientParts';
import { ConfirmSheet, FillMeter, taskSteps, unfilledText, type TaskStep } from './PassParts';
import { TaskForm } from './TaskForm';
import { BlankRules, CollapseCard } from './TestBlank';
import './TestPass.css';

/** Экран клиента: задание, присланное специалистом (или отправленное себе). Прохождение то же, что у специалиста, только с его сообщением и «Спасибо» в конце */
export interface TaskClient {
  /** Сообщение специалиста без строки про срок; пустое, если оно выключено */
  message: string;
  /** Срок выполнения из настроек («Без срока», «Сутки»…) */
  deadline: string;
  /** Постоянное задание: правило и карточка-назначение в чате, к которой добавляется запись */
  permanent?: PermanentRule;
  assignment?: string;
  /** «Завершить» на экране «Спасибо» */
  onExit: () => void;
}

interface TaskPassProps {
  taskId: string;
  data: TaskSettingsData;
  /** Форма бланка выбрана заранее в настройках задания: при выполнении её не спрашивают */
  form: string;
  /** Что включено в настройках: комментарий и оценка состояния */
  options: { comment: boolean; state: boolean };
  /** Задание выполнено и сохранено: номер результата (у клиента не вызывается: он остаётся на экране «Спасибо») */
  onDone?: (resultId: string) => void;
  client?: TaskClient;
}

/**
 * Выполнение задания: сначала инструкция, затем бланк целиком. Написанное остаётся, если выйти и вернуться.
 * Внизу счётчик заполненных полей и кнопки; пустые поля можно пропустить, но не все сразу.
 * У клиента тот же экран: на первом шаге добавляются сообщение специалиста и сведения, после завершения — «Спасибо».
 */
export function TaskPass({ taskId, data, form, options, onDone, client }: TaskPassProps) {
  const run = useTaskRun(taskId);
  const sections = data.blank.sections(form);
  const { done, total } = progressOf(sections, run.values);
  const started = run.startedAt !== undefined;
  // Если что-то уже написано (вышли и вернулись), открываем бланк, а не инструкцию
  const steps = taskSteps(options, data.blank.pages, sections, run.values);
  const [step, setStep] = useState<TaskStep>(started ? steps[1] : 'rules');
  const at = steps.indexOf(step);
  const lastStep = at === steps.length - 1;
  const [sheet, setSheet] = useState<'reset' | 'finish' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Клиент выполнил задание: вместо результата экран «Спасибо»; у постоянного задания в нём номер записи
  const [finished, setFinished] = useState(false);
  const [record, setRecord] = useState<number>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Новый экран всегда открывается с начала
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step, finished]);

  const finish = () => {
    setSheet(null);
    const result = finishTaskRun(taskId, form, client?.assignment);
    if (client) {
      setRecord(result.record);
      setFinished(true);
    } else onDone?.(result.id);
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

  const rules = data.blank.rules(form);

  return (
    <>
      <div className="test-settings__scroll" key={finished ? 'thanks' : step} ref={scrollRef}>
        {finished ? (
          <TaskDone record={record} limit={client?.permanent?.limit} />
        ) : step === 'rules' ? (
          client ? (
            <ClientIntro message={client.message} rules={rules} facts={taskFacts(data, form, client.deadline, client.permanent)} />
          ) : (
            <CollapseCard title="Инструкция" id="blank-rules">
              <BlankRules rules={rules} />
            </CollapseCard>
          )
        ) : (
          <TaskForm data={data} form={form} options={options} only={step} onEntryStep={(sectionId, index) => setStep(`each:${sectionId}:${index}`)} values={run.values} onChange={(next) => editTaskRun(taskId, () => next)} />
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
            <FillMeter done={done} total={total} onReset={started ? () => setSheet('reset') : undefined} />
            <div className="test-pass__buttons">
              {step !== 'rules' && (
                <button type="button" className="test-pass__back" onClick={() => setStep(steps[at - 1])}>
                  Назад
                </button>
              )}
              {step === 'rules' ? (
                <button type="button" className="test-settings__cta-button" onClick={() => setStep(steps[1])}>
                  {started ? 'Продолжить' : 'Начать'}
                </button>
              ) : !lastStep ? (
                <button type="button" className="test-settings__cta-button" onClick={() => setStep(steps[at + 1])}>
                  Далее
                </button>
              ) : (
                <button type="button" className="test-settings__cta-button" onClick={tryFinish}>
                  Завершить задание
                </button>
              )}
            </div>
          </>
        )}

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
