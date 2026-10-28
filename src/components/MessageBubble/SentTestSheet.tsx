import type { ComponentType, SVGProps } from 'react';
import { DEFAULT_SENT_OPTIONS, type Message } from '../../data/messages';
import type { LibraryTest } from '../../data/library';
import { RESULT_MODES } from '../../data/resultMode';
import { testSettings } from '../../data/testSettings';
import { SAVE_BLANK_LABEL } from '../../data/optionHelp';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import './SentTestSheet.css';

interface SentTestSheetProps {
  /** Карточка отправленного вами теста */
  message: Message;
  test?: LibraryTest;
  onClose: () => void;
}

type Svg = ComponentType<SVGProps<SVGSVGElement>>;

interface Row {
  label: string;
  value: string;
  /** Включено: значение акцентным цветом, как включённый переключатель; выключено: серым */
  on?: boolean;
  Icon?: Svg;
}

/**
 * Окно «Настройки теста» под карточкой отправленного клиенту теста: с какими настройками он ушёл.
 * Только просмотр: тест уже у клиента, поменять настройки нельзя (для другого набора отправляют тест заново).
 */
export function SentTestSheet({ message, test, onClose }: SentTestSheetProps) {
  useSheet(onClose);
  const options = message.testOptions ?? DEFAULT_SENT_OPTIONS;
  const forms = test ? testSettings(test).forms : undefined;
  const form = options.form ?? forms?.[0];
  const onOff = (on: boolean) => ({ value: on ? 'Включено' : 'Выключено', on });

  // Порядок и подписи те же, что на экране «Настройка теста»
  const rows: Row[] = [
    ...(forms && form ? [{ label: 'Форма бланка', value: form }] : []),
    { label: 'Слепое тестирование', ...onOff(options.blind) },
    { label: 'Итог для клиента', value: RESULT_MODES.find((m) => m.id === options.result)?.value ?? '' },
    { label: 'Перемешать вопросы', ...onOff(Boolean(options.shuffle)) },
    { label: SAVE_BLANK_LABEL, ...onOff(options.saveBlank) },
    { label: 'Сообщение для клиента', ...onOff(message.text.trim() !== '') },
  ];

  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Настройки теста">
        <div className="sheet__header">
          <h2 className="sheet__heading">Настройки теста</h2>
          {test && <p className="frame-subtitle">{test.title}</p>}
        </div>
        <div className="sheet__body">
          <ul className="sheet__card sent-sheet__rows">
            {rows.map(({ label, value, on, Icon }) => (
              <li key={label} className="sheet__row">
                <span className="sheet__row-label">{label}</span>
                <span className={`sent-sheet__value${on === true ? ' sent-sheet__value--on' : on === false ? ' sent-sheet__value--off' : ''}`}>
                  {Icon && <Icon className="sent-sheet__icon" aria-hidden="true" />}
                  {value}
                </span>
              </li>
            ))}
          </ul>
          <p className="sent-sheet__hint">Так тест ушёл клиенту. Чтобы отправить с другими настройками, отправьте его заново.</p>
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
