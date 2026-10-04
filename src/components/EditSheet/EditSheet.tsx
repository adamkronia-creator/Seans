import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { HEAD_ICONS } from '../ChatCase/caseIcons';
import type { CaseIconId } from '../../data/case';
import { TONES, toneOf, type ToneId } from '../../data/tones';
import './EditSheet.css';

export interface EditValues {
  title?: string;
  text?: string;
  icon?: CaseIconId;
  tone?: ToneId;
  /** Значения строк «Общей информации», в том же порядке */
  rows?: string[];
}

interface EditSheetProps {
  heading: string;
  /** Что показывать: поле появляется, если для него есть начальное значение */
  initial: EditValues;
  /** Подписи строк «Общей информации» */
  rowLabels?: string[];
  textLabel?: string;
  textPlaceholder?: string;
  /** Заголовок обязателен (для сведений и заметок), текст — нет */
  titleRequired?: boolean;
  onSave: (values: EditValues) => void;
  onClose: () => void;
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

/** Нижняя панель редактирования: заголовок, текст, иконка и цвет шапки */
export function EditSheet({
  heading,
  initial,
  rowLabels,
  textLabel = 'Текст',
  textPlaceholder,
  titleRequired = true,
  onSave,
  onClose,
}: EditSheetProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [text, setText] = useState(initial.text ?? '');
  const [icon, setIcon] = useState<CaseIconId | undefined>(initial.icon);
  const [tone, setTone] = useState<ToneId | undefined>(initial.tone);
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
  const hasLook = icon !== undefined && tone !== undefined;
  const canSave = !hasTitle || !titleRequired || title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      ...(hasTitle ? { title: title.trim() } : {}),
      ...(hasText ? { text: text.trim() } : {}),
      ...(hasLook ? { icon, tone } : {}),
      ...(initial.rows ? { rows: rows.map((r) => r.trim()) } : {}),
    });
  };

  const current = tone ? toneOf(tone) : undefined;
  const PreviewIcon = icon ? HEAD_ICONS[icon].Icon : undefined;

  return createPortal(
    <div className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="sheet__header">
          <h2 className="sheet__heading">{heading}</h2>
        </div>

        <div className="sheet__body">
          {hasLook && current && PreviewIcon && (
            <div
              className="sheet__preview"
              style={{ '--head-bg': current.bg, '--head-fg': current.fg } as CSSProperties}
            >
              <span className="sheet__preview-icon">
                <PreviewIcon />
              </span>
              <span className="sheet__preview-title">{title.trim() || 'Заголовок'}</span>
            </div>
          )}

          {hasTitle && (
            <label className="sheet__field">
              <span className="sheet__label">Заголовок</span>
              <AutoTextarea
                className="sheet__input"
                rows={1}
                value={title}
                onChange={(v) => setTitle(v.replace(/\n/g, ' '))}
                placeholder="Заголовок"
                autoComplete="off"
              />
            </label>
          )}

          {hasLook && (
            <>
              <div
                className="sheet__field"
                role="radiogroup"
                aria-labelledby={`${uid}-icon`}
                style={{ '--head-fg': current?.fg } as CSSProperties}
              >
                <span className="sheet__label" id={`${uid}-icon`}>Иконка</span>
                <div className="sheet__icons">
                  {(Object.keys(HEAD_ICONS) as CaseIconId[]).map((id) => {
                    const { Icon, label } = HEAD_ICONS[id];
                    const active = id === icon;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={label}
                        className={`sheet__icon${active ? ' sheet__icon--active' : ''}`}
                        onClick={() => setIcon(id)}
                      >
                        <Icon />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sheet__field" role="radiogroup" aria-labelledby={`${uid}-tone`}>
                <span className="sheet__label" id={`${uid}-tone`}>Цвет шапки</span>
                <div className="sheet__tones">
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
              </div>
            </>
          )}

          {initial.rows &&
            rowLabels?.map((label, i) => (
              <label key={label} className="sheet__field">
                <span className="sheet__label">{label}</span>
                <input
                  className="sheet__input sheet__input--line"
                  value={rows[i] ?? ''}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? e.target.value : r)))}
                  autoComplete="off"
                />
              </label>
            ))}

          {hasText && (
            <label className="sheet__field">
              <span className="sheet__label">{textLabel}</span>
              <AutoTextarea
                className="sheet__input sheet__input--text"
                rows={4}
                value={text}
                onChange={setText}
                placeholder={textPlaceholder}
              />
            </label>
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
