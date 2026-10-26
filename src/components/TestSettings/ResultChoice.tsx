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
      <div className="result-seg" role="radiogroup" aria-label="Итог для клиента">
        {RESULT_MODES.map(({ id, title, short }) => {
          const Icon = id === 'thanks' ? IconThanks : id === 'score' ? IconScore : IconFull;
          return (
            <label key={id} className="result-seg__item">
              <input type="radio" className="result-seg__input" name={name} checked={value === id} aria-label={title} onChange={() => onChange(id)} />
              <span className="result-seg__face">
                <Icon className="result-seg__icon" aria-hidden="true" />
                <span className="result-seg__text">{short}</span>
              </span>
            </label>
          );
        })}
      </div>
    </CollapseCard>
  );
}
