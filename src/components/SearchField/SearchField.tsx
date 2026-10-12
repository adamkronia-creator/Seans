import type { KeyboardEvent, ReactNode, Ref } from 'react';
import { IconClose } from '../ChatParts/ChatIcons';
import { IconSearch } from '../icons';
import './SearchField.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Элемент у правого края поля (кнопка фильтра) */
  trailing?: ReactNode;
  /** Кнопка «Очистить» у правого края, пока в поле есть текст; поле остаётся в фокусе */
  onClear?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function SearchField({ value, onChange, placeholder, trailing, onClear, inputRef, onFocus, onBlur, onKeyDown }: SearchFieldProps) {
  const clearable = !!onClear && value !== '';
  return (
    <label className={`search-field${trailing || clearable ? ' search-field--trailing' : ''}`}>
      <IconSearch className="search-field__icon" />
      <input
        ref={inputRef}
        className="search-field__input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        name="dialog-search"
        enterKeyHint="search"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
      />
      {clearable && (
        // mousedown не отдаёт фокус кнопке: после очистки можно сразу печатать
        <button type="button" className="search-field__clear" aria-label="Очистить запрос" onMouseDown={(e) => e.preventDefault()} onClick={onClear}>
          <IconClose />
        </button>
      )}
      {trailing}
    </label>
  );
}
