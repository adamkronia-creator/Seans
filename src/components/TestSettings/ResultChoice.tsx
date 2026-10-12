import { RESULT_MODES, RESULT_NOTE, type ResultMode } from '../../data/resultMode';
import { OptionHelp } from '../OptionHelp/OptionHelp';
import { CollapseCard } from './TestBlank';
import './ResultChoice.css';

/** Блок «Итог для клиента»: что клиент увидит сразу после прохождения. Карточка и строки те же, что у остальных настроек */
export function ResultChoice({ value, onChange, compact = false }: { value: ResultMode; onChange: (mode: ResultMode) => void; /** Новый вид (пробный запуск): без пояснений, вместо них «?» со скриншотами */ compact?: boolean }) {
  return (
    <CollapseCard title="Итог для клиента" id="result-choice" help={compact ? <OptionHelp id="result" /> : undefined}>
      {!compact && <p className="result-choice__sub">Что клиент увидит сразу после прохождения</p>}
      <ul className="ts-rows" role="radiogroup" aria-label="Итог для клиента">
        {RESULT_MODES.map(({ id, title, hint, badge }) => (
          <li key={id} className={`ts-row result-choice__row${value === id ? ' result-choice__row--on' : ''}`}>
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
                <span className="ts-row__label">
                  {title}
                  {badge && <span className="result-choice__badge">{badge}</span>}
                </span>
                {!compact && <span className="ts-row__hint">{hint}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {!compact && <p className="result-choice__note">{RESULT_NOTE}</p>}
    </CollapseCard>
  );
}
