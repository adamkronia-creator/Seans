import { useId, useState } from 'react';
import { IconTestChevronDown } from '../icons';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';
import './TestSettings.css';
import './ResultChoice.css';
import './TestBlank.css';

interface FormSheetProps {
  forms: string[];
  value: string;
  /** Чем форма бланка важна для теста: пояснение стоит под вариантами */
  hint?: string;
  title: string;
  format: (v: string) => string;
  onPick: (form: string) => void;
  onClose: () => void;
}

const same = (v: string) => v;

const TEST_FORM_LABELS: Record<string, string> = { Мужская: 'Мужской', Женская: 'Женский' };

export const formatTestForm = (form: string) => TEST_FORM_LABELS[form] ?? form;

export function FormOptions({ forms, value, title, format = same, onChange, disabled = false }: {
  forms: string[];
  value: string;
  title: string;
  format?: (v: string) => string;
  onChange: (form: string) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <ul className="blank-answers" role="radiogroup" aria-label={title}>
      {forms.map((f) => (
        <li key={f}>
          <label className={disabled ? 'blank-answer blank-answer--locked' : 'blank-answer'}>
            <input type="radio" className="blank-answer__input" name={name} checked={value === f} disabled={disabled} onChange={() => onChange(f)} />
            <span className="blank-answer__radio" aria-hidden="true" />
            <span className="blank-answer__text">{format(f)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Окно выбора формы бланка: пояснение, зачем форма нужна, как вопрос и варианты («Мужская» / «Женская») как ответы */
function FormSheet({ forms, value, hint, title, format, onPick, onClose }: FormSheetProps) {
  useSheet(onClose);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__header">
          <h2 className="sheet__heading">{title}</h2>
        </div>
        <div className="sheet__body">
          <section className="sheet__card form-menu__card">
            {/* Как вопрос и ответы при прохождении: подпись (если есть) — вопрос, варианты — радиокнопки в рамке выбора */}
            <div className="form-menu__question">
              {hint && <p className="blank-question__prompt">{hint}</p>}
              <FormOptions forms={forms} value={value} title={title} format={format} onChange={onPick} />
            </div>
          </section>
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

interface FormMenuProps {
  forms: string[];
  value: string;
  hint?: string;
  /** Название окна и подпись кнопки; по умолчанию «Форма бланка» */
  title?: string;
  /** Как показать вариант: «50» → «50 мин» */
  format?: (v: string) => string;
  /** Как показать выбранное на кнопке, если короче, чем в окне (по умолчанию как `format`) */
  formatValue?: (v: string) => string;
  stableWidth?: boolean;
  onChange: (form: string) => void;
}

/** Кнопка с выбранной формой бланка; по нажатию открывается меню с вариантами и пояснением */
export function FormMenu({ forms, value, hint, title = 'Форма бланка', format = same, formatValue = format, stableWidth = false, onChange }: FormMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ts-select" aria-haspopup="dialog" aria-label={`${title}: ${formatValue(value)}`} onClick={() => setOpen(true)}>
        <span className="ts-select__value">
          {stableWidth && forms.filter((f) => f !== value).map((f) => (
            <span key={f} aria-hidden="true" className="ts-select__measure">{formatValue(f)}</span>
          ))}
          <span>{formatValue(value)}</span>
        </span>
        <IconTestChevronDown className="ts-select__chevron" />
      </button>
      {open && (
        <FormSheet
          forms={forms}
          value={value}
          hint={hint}
          title={title}
          format={format}
          onClose={() => setOpen(false)}
          onPick={(f) => {
            onChange(f);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
