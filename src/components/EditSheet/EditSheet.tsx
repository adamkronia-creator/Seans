import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { HEAD_ICONS } from '../ChatCase/caseIcons';
import { IconSheetIcon, IconSheetPalette } from '../icons';
import { RichEditor } from '../RichEditor/RichEditor';
import { Switch } from '../Switch/Switch';
import type { CaseIconId } from '../../data/case';
import { TONES, toneOf, type ToneId } from '../../data/tones';
import './EditSheet.css';

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
  /** Название окна для экранных читалок; на экране заголовка нет */
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
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`sheet__collapse${open ? ' sheet__collapse--open' : ''}`} aria-hidden={!open}>
      <div className="sheet__collapse-inner">{children}</div>
    </div>
  );
}

/** Textarea, которая растёт по тексту: виден весь текст без внутренней прокрутки */
function AutoTextarea({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Высота по тексту плюс рамка: иначе появляется лишняя полоса прокрутки
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + border}px`;
  }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
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
  const [tone, setTone] = useState<ToneId>(initial.tone ?? 'blue');
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
  const PreviewIcon = iconOn ? HEAD_ICONS[icon].Icon : undefined;
  const previewSize = iconOn ? HEAD_ICONS[icon].size : 22;

  return createPortal(
    <div className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="sheet__grab" aria-hidden="true" />

        <div className="sheet__body">
          {hasTitle && (
            <div
              className="sheet__preview"
              style={{ '--head-bg': current.bg, '--head-fg': current.fg } as CSSProperties}
            >
              {PreviewIcon && (
                <span className="sheet__preview-icon" style={{ fontSize: previewSize }}>
                  <PreviewIcon />
                </span>
              )}
              <AutoTextarea
                className="sheet__preview-input"
                rows={1}
                value={title}
                onChange={(v) => setTitle(v.replace(/\n/g, ' '))}
                placeholder="Заголовок"
                aria-label="Заголовок"
                autoComplete="off"
              />
            </div>
          )}

          {hasLook && (
            <>
              <section className="sheet__card" style={{ '--head-fg': current.fg } as CSSProperties}>
                <div className="sheet__toggle-row">
                  <IconSheetIcon className="sheet__toggle-icon" />
                  <span className="sheet__toggle-label" id={`${uid}-icon`}>Иконка</span>
                  <Switch checked={iconOn} onChange={setIconOn} label="Иконка" />
                </div>
                <Collapse open={iconOn}>
                  <div className="sheet__icons" role="radiogroup" aria-labelledby={`${uid}-icon`}>
                    {(Object.keys(HEAD_ICONS) as CaseIconId[]).map((id) => {
                      const { Icon, label, size } = HEAD_ICONS[id];
                      const active = id === icon;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={label}
                          className={`sheet__icon${active ? ' sheet__icon--active' : ''}`}
                          style={{ fontSize: size }}
                          onClick={() => setIcon(id)}
                        >
                          <Icon />
                        </button>
                      );
                    })}
                  </div>
                </Collapse>
              </section>

              <section className="sheet__card">
                <div className="sheet__toggle-row">
                  <IconSheetPalette className="sheet__toggle-icon" />
                  <span className="sheet__toggle-label" id={`${uid}-tone`}>Цвет</span>
                  <Switch checked={toneOn} onChange={setToneOn} label="Цвет шапки" />
                </div>
                <Collapse open={toneOn}>
                  <div className="sheet__tones" role="radiogroup" aria-labelledby={`${uid}-tone`}>
                    {TONES.map(({ id, label, bg, fg }) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={id === tone}
                        aria-label={label}
                        className={`sheet__tone${id === tone ? ' sheet__tone--active' : ''}`}
                        style={{ '--head-bg': bg, '--head-fg': fg } as CSSProperties}
                        onClick={() => setTone(id)}
                      />
                    ))}
                  </div>
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
                  <input
                    id={`${uid}-row-${i}`}
                    className="sheet__row-input"
                    value={rows[i] ?? ''}
                    onChange={(e) => setRows(rows.map((r, j) => (j === i ? e.target.value : r)))}
                    autoComplete="off"
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
    </div>,
    document.body,
  );
}
