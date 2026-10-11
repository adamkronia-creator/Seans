import type { Message, SentTaskOptions } from '../../data/messages';
import type { LibraryTask } from '../../data/library';
import { TASK_DEADLINES } from '../../data/taskValues';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import './SentTestSheet.css';

interface SentTaskSheetProps {
  /** Карточка отправленного вами задания */
  message: Message;
  task?: LibraryTask;
  onClose: () => void;
}

/** Настройки по умолчанию: как на экране «Настройка задания» до того, как их тронули (у сообщений, отправленных до появления настроек) */
const DEFAULT_OPTIONS: SentTaskOptions = { comment: true, state: true, saveBlank: true, deadline: TASK_DEADLINES[0], remind: true, note: '' };

interface Row {
  label: string;
  value: string;
  /** Включено: значение акцентным цветом, как включённый переключатель; выключено: серым */
  on?: boolean;
}

/**
 * Окно «Настройки задания» под карточкой отправленного клиенту задания: с какими настройками оно ушло.
 * Только просмотр: задание уже у клиента, поменять настройки нельзя (для другого набора отправляют задание заново).
 */
export function SentTaskSheet({ message, task, onClose }: SentTaskSheetProps) {
  useSheet(onClose);
  const options = message.taskOptions ?? DEFAULT_OPTIONS;
  const hasDeadline = options.deadline !== TASK_DEADLINES[0];
  const onOff = (on: boolean) => ({ value: on ? 'Включено' : 'Выключено', on });

  // Порядок и подписи те же, что на экране «Настройка задания»
  const rows: Row[] = [
    ...(options.form ? [{ label: options.formLabel ?? 'Форма бланка', value: options.form }] : []),
    { label: 'Комментарий клиента', ...onOff(options.comment) },
    { label: 'Оценка состояния', ...onOff(options.state) },
    { label: 'Сохранить бланк', ...onOff(options.saveBlank) },
    { label: 'Срок выполнения', value: options.deadline },
    { label: 'Напоминание', ...onOff(options.remind && hasDeadline) },
    { label: 'Сообщение для клиента', ...onOff(options.note !== '') },
  ];

  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Настройки задания">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">Настройки задания</h2>
          {task && <p className="sent-sheet__subtitle">{task.title}</p>}
        </div>
        <div className="sheet__body">
          <ul className="sheet__card sent-sheet__rows">
            {rows.map(({ label, value, on }) => (
              <li key={label} className="sheet__row">
                <span className="sheet__row-label">{label}</span>
                <span className={`sent-sheet__value${on === true ? ' sent-sheet__value--on' : on === false ? ' sent-sheet__value--off' : ''}`}>{value}</span>
              </li>
            ))}
          </ul>
          <p className="sent-sheet__hint">Так задание ушло клиенту. Чтобы отправить с другими настройками, отправьте его заново.</p>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
