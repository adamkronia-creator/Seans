import { IconBack } from '../icons';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { TASK_LIBRARY } from '../../data/library';
import { useTaskResult } from '../../data/selfTask';
import { fullValues, progressOf, taskSettings } from '../../data/taskSettings';
import { TaskForm } from './TaskForm';
import { Paragraphs } from './TaskParts';
import { CollapseCard } from './TestBlank';
import { TestHeader } from './TestHeader';
import './TestSettings.css';
import './TestConclusion.css';

interface TaskResultProps {
  resultId: string;
  onBack: () => void;
}

/**
 * Результат задания: сведения о выполнении, заполненный клиентом бланк и подсказка для анализа материалов.
 * Открывается для собственного выполнения психолога и для задания, которое выполнил клиент
 * (кнопка «Посмотреть» под сообщением, карточка во вкладке «Задания», «События», «История взаимодействия»).
 * Если при выполнении была выключена «Сохранить бланк», вместо ответов показано пояснение.
 */
export function TaskResult({ resultId, onBack }: TaskResultProps) {
  const own = useTaskResult(resultId);
  const result = own ?? findClientTaskResult(resultId);
  const task = result && TASK_LIBRARY.find((t) => t.id === result.taskId);
  const data = task && taskSettings(task);

  // Результаты своих выполнений живут, пока открыта страница: после перезагрузки по прямой ссылке их уже нет
  if (!result || !task || !data) {
    return (
      <section className="test-settings">
        <header className="test-settings__header">
          <button type="button" className="test-settings__button" aria-label="Назад" onClick={onBack}>
            <IconBack />
          </button>
          <h1 className="test-settings__name">Результат задания</h1>
        </header>
        <p className="chat__empty chat__empty--grow">Результат не найден</p>
      </section>
    );
  }

  const values = result.values && fullValues(result.values);
  const { info, form } = result;
  const progress = values ? progressOf(data.blank.sections(form), values) : null;
  const summary = (values && data.summary?.(values)) ?? [];
  const rows: { label: string; value: string }[] = [
    { label: 'Дата выполнения', value: info.date },
    { label: 'Время выполнения', value: info.time },
    { label: 'Длительность', value: info.duration },
    ...(info.age ? [{ label: 'Возраст', value: info.age }] : []),
    ...(form ? [{ label: 'Форма бланка', value: form }] : []),
    ...(progress ? [{ label: 'Заполнено полей', value: `${progress.done} из ${progress.total}` }] : []),
    ...summary,
  ];

  return (
    <section className="test-settings">
      <TestHeader test={task} kind="task" status={own ? 'Результат задания' : 'Результат клиента'} onBack={onBack} />
      <div className="cc-wrap" key="result">
        <div className="test-settings__scroll">
          <CollapseCard title="Общая информация" id="cc-info">
            <ul className="cc-info">
              {rows.map(({ label, value }) => (
                <li key={label}>
                  <span className="cc-info__label">{label}</span>
                  <span className="cc-info__value">{value}</span>
                </li>
              ))}
            </ul>
          </CollapseCard>

          {values ? (
            <TaskForm data={data} form={form} options={{ comment: values.comment.trim() !== '', state: values.state !== undefined }} values={values} />
          ) : (
            <CollapseCard title="Бланк задания">
              <div className="task-pad">
                <p className="task-hint">Бланк не сохранён: при выполнении была выключена настройка «Сохранить бланк». Остались только сведения о выполнении.</p>
              </div>
            </CollapseCard>
          )}

          <CollapseCard title="Анализ материалов">
            <div className="task-pad">
              <Paragraphs text={data.analysis} />
            </div>
          </CollapseCard>

          <p className="cc-note">Задание помогает понять человека, но не ставит диагноз. Выводы по ответам делайте вместе с клиентом, учитывая его обстоятельства.</p>
        </div>
      </div>
    </section>
  );
}
