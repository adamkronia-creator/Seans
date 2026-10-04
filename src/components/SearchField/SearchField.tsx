import type { ReactNode } from 'react';
import { IconSearch } from '../icons';
import './SearchField.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Элемент у правого края поля (кнопка фильтра) */
  trailing?: ReactNode;
}

export function SearchField({ value, onChange, placeholder, trailing }: SearchFieldProps) {
  return (
    <label className={`search-field${trailing ? ' search-field--trailing' : ''}`}>
      <IconSearch className="search-field__icon" />
      <input
        className="search-field__input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        name="dialog-search"
        enterKeyHint="search"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
      />
      {trailing}
    </label>
  );
}
