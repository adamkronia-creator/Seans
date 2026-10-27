import { forwardRef, type ChangeEvent, type KeyboardEvent, type TextareaHTMLAttributes } from 'react';

/*
 * Однострочное поле. Это textarea в одну строку, а не <input>: над клавиатурой Chrome на Android показывает панель
 * автозаполнения (пароли, карты, геолокация) только над <input>, а над многострочным полем её нет, и атрибуты (autocomplete и др.)
 * на неё не влияют. Переноса строк нет: Enter не вставляет его, вставленный текст склеивается в одну строку.
 */
export interface LineInputProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'wrap'> {
  /** Тип поля, как у input: от него берётся только подсказка клавиатуре */
  type?: 'text' | 'tel' | 'url' | 'search';
}

export const LineInput = forwardRef<HTMLTextAreaElement, LineInputProps>(function LineInput({ type, inputMode, onChange, onKeyDown, className, ...rest }, ref) {
  const change = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (/[\r\n]/.test(e.target.value)) e.target.value = e.target.value.replace(/[\r\n]+/g, ' ');
    onChange?.(e);
  };
  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.key === 'Enter') e.preventDefault();
  };
  return (
    <textarea
      ref={ref}
      rows={1}
      wrap="off"
      className={`line-input${className ? ` ${className}` : ''}`}
      inputMode={inputMode ?? (type === 'tel' ? 'tel' : type === 'url' ? 'url' : type === 'search' ? 'search' : undefined)}
      onChange={change}
      onKeyDown={keys}
      {...rest}
    />
  );
});
