import type { CSSProperties } from 'react';
import { TONES, type ToneId } from '../../data/tones';
import './EditSheet.css';

interface TonePaletteProps {
  labelledBy: string;
  value: ToneId | null;
  onChange: (id: ToneId) => void;
}

export function TonePalette({ labelledBy, value, onChange }: TonePaletteProps) {
  return (
    <div className="sheet__tones" role="radiogroup" aria-labelledby={labelledBy}>
      {TONES.map(({ id, label, swatch }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={id === value}
          aria-label={label}
          className={`sheet__tone${id === value ? ' sheet__tone--active' : ''}`}
          data-monochrome={id === 'white' || id === 'black' || undefined}
          style={{ '--head-fg': swatch, '--head-swatch': swatch } as CSSProperties}
          onClick={() => onChange(id)}
        />
      ))}
    </div>
  );
}
