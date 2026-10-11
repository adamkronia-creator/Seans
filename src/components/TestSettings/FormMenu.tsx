import { useState } from 'react';
import { IconTestChevronDown } from '../icons';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';

interface FormSheetProps {
  forms: string[];
  value: string;
  /** Чем форма бланка важна для теста: пояснение стоит под вариантами */
  hint?: string;
  onPick: (form: string) => void;
  onClose: () => void;
}

/** Окно выбора формы бланка: варианты («Мужская» / «Женская») и пояснение, зачем форма нужна */
function FormSheet({ forms, value, hint, onPick, onClose }: FormSheetProps) {
  useSheet(onClose);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Форма бланка">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">Форма бланка</h2>
        </div>
        <div className="sheet__body">
          <section className="sheet__card form-menu__card">
            <ul className="blank-answers" role="radiogroup" aria-label="Форма бланка">
              {forms.map((f) => (
                <li key={f}>
                  <label className="blank-answer">
                    <input
                      type="radio"
                      className="blank-answer__input"
                      name="form-menu"
                      checked={value === f}
                      onChange={() => onPick(f)}
                    />
                    <span className="blank-answer__radio" aria-hidden="true" />
                    <span className="blank-answer__text">{f}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
          {hint && <p className="form-menu__hint">{hint}</p>}
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
  onChange: (form: string) => void;
}

/** Кнопка с выбранной формой бланка; по нажатию открывается меню с вариантами и пояснением */
export function FormMenu({ forms, value, hint, onChange }: FormMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="ts-select" aria-haspopup="dialog" aria-label={`Форма бланка: ${value}`} onClick={() => setOpen(true)}>
        <span className="ts-select__value">{value}</span>
        <IconTestChevronDown className="ts-select__chevron" />
      </button>
      {open && (
        <FormSheet
          forms={forms}
          value={value}
          hint={hint}
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
