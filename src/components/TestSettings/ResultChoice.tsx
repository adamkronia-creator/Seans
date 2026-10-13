import { RESULT_MODES, type ResultMode } from '../../data/resultMode';
import { OptionHelp } from '../OptionHelp/OptionHelp';
import { CollapseCard } from './TestBlank';
import './ResultChoice.css';

/** Блок «Итог для клиента»: что клиент увидит сразу после прохождения. Карточка и строки те же, что у остальных настроек */
export function ResultChoice({ value, onChange }: { value: ResultMode; onChange: (mode: ResultMode) => void }) {
  return (
    <CollapseCard title="Итог для клиента" id="result-choice" help={<OptionHelp id="result" />}>
      <ul className="ts-rows" role="radiogroup" aria-label="Итог для клиента">
        {RESULT_MODES.map(({ id, title }) => (
          <li key={id} className="ts-row result-choice__row">
            <label className="result-choice__label">
              <input
                type="radio"
                className="blank-answer__input"
                name="result-choice"
                checked={value === id}
                onChange={() => onChange(id)}
              />
              <span className="blank-answer__radio" aria-hidden="true" />
              <span className="ts-row__text">
                <span className="ts-row__label">{title}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </CollapseCard>
  );
}
