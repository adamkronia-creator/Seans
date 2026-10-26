import { RESULT_MODES, type ResultMode } from '../../data/resultMode';
import { OptionHelp } from '../OptionHelp/OptionHelp';
import IconThanks from '../../assets/icons/solar/smile-circle.svg?react';
import IconScore from '../../assets/icons/solar/flag.svg?react';
import IconFull from '../../assets/icons/solar/document-text.svg?react';
import { CollapseCard } from './TestBlank';
import './ResultChoice.css';

/** Блок «Итог для клиента»: что клиент увидит сразу после прохождения. Карточка и строки те же, что у остальных настроек */
export function ResultChoice({ value, onChange, name = 'result-choice' }: { value: ResultMode; onChange: (mode: ResultMode) => void; /** Своё имя группы, когда на экране несколько блоков (отправка нескольких тестов) */ name?: string }) {
  return (
    <CollapseCard title="Итог для клиента" id={name === 'result-choice' ? 'result-choice' : undefined} help={<OptionHelp id="result" />}>
      <ul className="ts-rows" role="radiogroup" aria-label="Итог для клиента">
        {RESULT_MODES.map(({ id, title }) => {
          const Icon = id === 'thanks' ? IconThanks : id === 'score' ? IconScore : IconFull;
          return (
          <li key={id} className="ts-row result-choice__row">
            <label className="result-choice__label">
              <Icon className="ts-row__icon" />
              <input
                type="radio"
                className="blank-answer__input"
                name={name}
                checked={value === id}
                onChange={() => onChange(id)}
              />
              <span className="blank-answer__radio" aria-hidden="true" />
              <span className="ts-row__text">
                <span className="ts-row__label">{title}</span>
              </span>
            </label>
          </li>
          );
        })}
      </ul>
    </CollapseCard>
  );
}
