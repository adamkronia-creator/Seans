import { IconSearch } from '../icons';
import './SearchField.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
  return (
    <label className="search-field">
      <IconSearch className="search-field__icon" />
      <input
        className="search-field__input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        enterKeyHint="search"
      />
    </label>
  );
}
