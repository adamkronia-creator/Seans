import { entriesOf, type EntriesField, type TaskSection, type TaskValues } from '../../data/taskValues';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
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

/** «Заполнено: 3 из 10» (у теста «Отвечено») и полоса: сколько уже сделано; «Сбросить» стоит справа, когда есть что сбрасывать */
export function FillMeter({ label = 'Заполнено', done, total, onReset }: { label?: string; done: number; total: number; onReset?: () => void }) {
  return (
    <>
      <div className="test-pass__meta">
        <span>
          {label}: {done} из {total}
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
export const unfilledText = (done: number, total: number) => `Заполнено ${done} из ${total}. Пустые поля в результате будут отмечены как «Не заполнено»: их можно пропустить.`;

/** Страницы выполнения задания: инструкция, поля, затем комментарий и «Как вы себя чувствуете?», если они включены в настройках */
export type TaskStep = string;
/**
 * Страницы: 'rules', затем 'form' (всё сразу, комментарий отдельно) или группы из `pages` (через «+»), затем 'state'.
 * 'each:<раздел>' — по странице на каждую запись раздела ('each:worries:2'), поэтому страниц столько, сколько записей.
 */
export const taskSteps = (options: { comment: boolean; state: boolean }, pages: string[][] | undefined, sections: TaskSection[], values: TaskValues): TaskStep[] => [
  'rules',
  ...(pages
    ? pages.flatMap((group) => {
        const each = /^each:(.+)$/.exec(group[0]);
        if (each) {
          const field = sections.find((section) => section.id === each[1])?.fields.find((f): f is EntriesField => f.kind === 'entries');
          return Array.from({ length: field ? entriesOf(field, values).length : 1 }, (_, i) => `${group[0]}:${i}`);
        }
        const ids = group.filter((id) => id !== 'comment' || options.comment).join('+');
        return ids ? [ids] : [];
      })
    : ['form', ...(options.comment ? ['comment'] : [])]),
  ...(options.state ? ['state'] : []),
];
