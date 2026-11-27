import { useId } from 'react';
import { RESULT_MODES, type ResultMode } from '../../data/resultMode';
import './ClientResultTiles.css';

export function ClientResultTiles({ value, onChange, disabled = false }: {
  value: ResultMode;
  onChange: (mode: ResultMode) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="client-result-tiles" disabled={disabled}>
      <legend>Что видит клиент</legend>
      <div className="client-result-tiles__choices">
        {RESULT_MODES.map(({ id, short, title }) => (
          <label key={id}>
            <input type="radio" name={name} checked={value === id} onChange={() => onChange(id)} aria-label={title} />
            <span>{id === 'thanks' ? 'Спасибо' : short}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
