import { EmptyState } from '../EmptyState/EmptyState';
import { IconBack, IconSearch } from '../icons';
import { findClientTaskResult } from '../../data/clientTaskResults';
import { TASK_LIBRARY } from '../../data/library';
import { useTaskResult } from '../../data/selfTask';
import { formText, progressOf, taskSettings } from '../../data/taskSettings';
import { TaskForm } from './TaskForm';
import { Paragraphs } from './TaskParts';
import { CollapseCard } from './TestBlank';
import { TestHeader } from './TestHeader';
import './TestSettings.css';
import './TestSettings.pm.css';
import './TestConclusion.css';

interface TaskResultProps {
  resultId: string;
  onBack: () => void;
}

/**
 * Результат задания: сведения о выполнении, заполненный клиентом бланк и подсказка для анализа материалов.
 * Открывается для собственного выполнения психолога и для задания, которое выполнил клиент
 * (кнопка «Посмотреть» под сообщением, карточка во вкладке «Задания», «События», «История взаимодействия»).
 * У постоянного задания так же открывается каждая запись: в общей информации у неё указан номер.
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
        <EmptyState icon={<IconSearch />} title="Результат не найден" text="Результаты хранятся, пока приложение открыто: после перезагрузки страницы они пропадают." />
      </section>
    );
  }

  const { info, form, values } = result;
  const progress = progressOf(data.blank.sections(form), values);
  const summary = data.summary?.(values) ?? [];
  const rows: { label: string; value: string }[] = [
    ...(result.record ? [{ label: 'Запись задания', value: `№${result.record}` }] : []),
    { label: 'Дата выполнения', value: info.date },
    { label: 'Время выполнения', value: info.time },
    { label: 'Длительность', value: info.duration },
    ...(info.age ? [{ label: 'Возраст', value: info.age }] : []),
    ...(form ? [{ label: data.formLabel ?? 'Форма бланка', value: formText(data, form) }] : []),
    { label: 'Заполнено полей', value: `${progress.done} из ${progress.total}` },
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

          <TaskForm data={data} form={form} options={{ comment: values.comment.trim() !== '', state: values.state !== undefined }} values={values} />

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
