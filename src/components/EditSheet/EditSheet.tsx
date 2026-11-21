import { useEffect, useId, useState, type CSSProperties } from 'react';
import { LineInput } from '../LineInput/LineInput';
import { CASE_ICON_GROUPS, caseIcon } from '../ChatCase/caseIcons';
import { IconSheetIcon, IconSheetPalette } from '../icons';
import { RichEditor } from '../RichEditor/RichEditor';
import { TonePalette } from './TonePalette';
import { Switch } from '../Switch/Switch';
import type { CaseIconId } from '../../data/case';
import { editorToneId, toneOf, type ToneId } from '../../data/tones';
import { AutoTextarea } from './AutoTextarea';
import { SheetOverlay } from './SheetOverlay';
import './EditSheet.css';
import { plainText } from '../../utils/plainText';

export interface EditValues {
  title?: string;
  text?: string;
  /** null — иконка выключена */
  icon?: CaseIconId | null;
  /** null — шапка без цвета */
  tone?: ToneId | null;
  /** Значения строк «Общей информации», в том же порядке */
  rows?: string[];
}

interface EditSheetProps {
  /** Заголовок окна: стоит наверху слева, как у остальных нижних окон */
  heading: string;
  /** Что показывать: поле появляется, если для него есть начальное значение */
  initial: EditValues;
  /** Подписи строк «Общей информации» */
  rowLabels?: string[];
  /** Подсказка в пустом поле текста (подписей над полями нет) */
  textPlaceholder?: string;
  /** Заголовок обязателен (для сведений и заметок), текст — нет */
  titleRequired?: boolean;
  onSave: (values: EditValues) => void;
  onClose: () => void;
}

/** Плавно сворачиваемый блок: высота анимируется от 0 до содержимого */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`sheet__collapse${open ? ' sheet__collapse--open' : ''}`} aria-hidden={!open}>
      <div className="sheet__collapse-inner">{children}</div>
    </div>
  );
}

/** Нижняя панель редактирования: заголовок прямо в шапке-превью, иконка, цвет, строки и текст */
export function EditSheet({
  heading,
  initial,
  rowLabels,
  textPlaceholder,
  titleRequired = true,
  onSave,
  onClose,
}: EditSheetProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [text, setText] = useState(initial.text ?? '');
  // Выбор иконки и цвета помнится, пока переключатель выключен: включил снова — всё на месте
  const [icon, setIcon] = useState<CaseIconId>(initial.icon ?? 'pin');
  const [tone, setTone] = useState<ToneId>(() => editorToneId(initial.tone ?? 'blue'));
  const [iconOn, setIconOn] = useState(initial.icon !== null);
  const [toneOn, setToneOn] = useState(initial.tone !== null);
  const [rows, setRows] = useState(initial.rows ?? []);
  const uid = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const hasTitle = initial.title !== undefined;
  const hasText = initial.text !== undefined;
  const hasLook = initial.icon !== undefined && initial.tone !== undefined;
  const canSave = !hasTitle || !titleRequired || title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      ...(hasTitle ? { title: title.trim() } : {}),
      ...(hasText ? { text: text.trim() } : {}),
      ...(hasLook ? { icon: iconOn ? icon : null, tone: toneOn ? tone : null } : {}),
      ...(initial.rows ? { rows: rows.map((r) => r.trim()) } : {}),
    });
  };

  const current = toneOf(toneOn ? tone : null);
  const previewIcon = iconOn ? caseIcon(icon) : undefined;

  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet sheet--edit" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="sheet__header">
          <h2 className="sheet__heading">{heading}</h2>
        </div>
        <div className="sheet__body">
          {hasTitle && (
            <div
              className="sheet__preview"
              style={{ '--head-bg': current.bg, '--head-fg': current.fg, '--head-icon-filter': current.iconFilter } as CSSProperties}
            >
              {previewIcon && (
                <span className="sheet__preview-icon">
                  <svg aria-hidden="true"><use href={previewIcon.href} /></svg>
                </span>
              )}
              <AutoTextarea
                className="sheet__preview-input"
                rows={1}
                value={title}
                onChange={(v) => setTitle(v.replace(/\n/g, ' '))}
                placeholder="Заголовок"
                aria-label="Заголовок"
                {...plainText}
              />
            </div>
          )}

          {hasLook && (
            <>
              <section className="sheet__card sheet__appearance" style={{ '--head-fg': current.fg, '--head-icon-filter': current.iconFilter } as CSSProperties}>
                <div className="sheet__toggle-row">
                  <IconSheetIcon className="sheet__toggle-icon" aria-hidden="true" />
                  <span className="sheet__toggle-label" id={`${uid}-icon`}>Иконка</span>
                  <Switch checked={iconOn} onChange={setIconOn} label="Иконка" />
                </div>
                <Collapse open={iconOn}>
                  <div className="sheet__icon-picker" role="radiogroup" aria-labelledby={`${uid}-icon`}>
                    {CASE_ICON_GROUPS.map(({ title, icons }) => (
                      <section key={title} aria-label={title}>
                        <h3 className="sheet__icon-heading">{title}</h3>
                        <div className="sheet__icons">
                          {icons.map(({ id, label, href }) => (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={id === previewIcon?.id}
                              aria-label={label}
                              title={label}
                              className={`sheet__icon${id === previewIcon?.id ? ' sheet__icon--active' : ''}`}
                              onClick={() => setIcon(id)}
                            >
                              <svg aria-hidden="true"><use href={href} /></svg>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </Collapse>
              </section>

              <section className="sheet__card sheet__appearance">
                <div className="sheet__toggle-row">
                  <IconSheetPalette className="sheet__toggle-icon" aria-hidden="true" />
                  <span className="sheet__toggle-label" id={`${uid}-tone`}>Цвет</span>
                  <Switch checked={toneOn} onChange={setToneOn} label="Цвет шапки" />
                </div>
                <Collapse open={toneOn}>
                  <TonePalette labelledBy={`${uid}-tone`} value={tone} onChange={setTone} />
                </Collapse>
              </section>
            </>
          )}

          {initial.rows && rowLabels && (
            <ul className="sheet__card sheet__rows">
              {rowLabels.map((label, i) => (
                <li key={label} className="sheet__row">
                  <label className="sheet__row-label" htmlFor={`${uid}-row-${i}`}>
                    {label}
                  </label>
                  <LineInput
                    id={`${uid}-row-${i}`}
                    className="sheet__row-input"
                    value={rows[i] ?? ''}
                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? e.target.value : r)))}
                    {...plainText}
                  />
                </li>
              ))}
            </ul>
          )}

          {hasText && (
            <section className="sheet__card sheet__text">
              <RichEditor
                initial={initial.text ?? ''}
                onChange={setText}
                placeholder={textPlaceholder}
                ariaLabel={heading}
              />
            </section>
          )}
        </div>

        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="sheet__button sheet__button--primary"
            disabled={!canSave}
            onClick={save}
          >
            Сохранить
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
