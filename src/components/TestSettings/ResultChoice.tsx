import { RESULT_MODES, RESULT_NOTE, type ResultMode } from '../../data/resultMode';
import './ResultChoice.css';

/** Блок «Итог для клиента»: что клиент увидит на экране сразу после прохождения */
export function ResultChoice({ value, onChange }: { value: ResultMode; onChange: (mode: ResultMode) => void }) {
  return (
    <section className="ts-card result-choice" aria-labelledby="result-choice-title">
      <div className="result-choice__head">
        <h2 id="result-choice-title" className="result-choice__title">
          Итог для клиента
        </h2>
        <p className="result-choice__sub">Что клиент увидит на экране сразу после прохождения</p>
      </div>
      <ul className="result-choice__list" role="radiogroup" aria-label="Итог для клиента">
        {RESULT_MODES.map(({ id, title, hint, badge }) => (
          <li key={id}>
            <label className={`result-choice__item${value === id ? ' result-choice__item--on' : ''}`}>
              <input
                type="radio"
                className="blank-answer__input"
                name="result-choice"
                checked={value === id}
                onChange={() => onChange(id)}
              />
              <span className="blank-answer__radio" aria-hidden="true" />
              <span className="result-choice__text">
                <span className="result-choice__name">
                  {title}
                  {badge && <span className="result-choice__badge">{badge}</span>}
                </span>
                <span className="result-choice__hint">{hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="result-choice__note">{RESULT_NOTE}</p>
    </section>
  );
}
