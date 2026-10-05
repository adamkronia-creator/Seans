import './Switch.css';

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

/** Переключатель 37×20 с ползунком 16 */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch${checked ? ' switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    />
  );
}
