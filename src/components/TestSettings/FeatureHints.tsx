import { useState } from 'react';
import { Frame } from '../Frame/Frame';
import { IconTestQuestion } from '../icons';
import { FEATURE_HINTS } from '../../data/featureHints';
import './FeatureHints.css';

/** «?» в правом верхнем углу карточки «Особенности тестирования»: окно с подсказкой к каждой настройке */
export function FeatureHints({ onlyIds }: { /** Настройки, которые есть в карточке (итога для клиента может не быть) */ onlyIds?: string[] }) {
  const [open, setOpen] = useState(false);
  const hints = onlyIds ? FEATURE_HINTS.filter((h) => onlyIds.includes(h.id)) : FEATURE_HINTS;
  return (
    <>
      <button type="button" className="feature-hints__button" aria-haspopup="dialog" aria-label="Что делают настройки" onClick={() => setOpen(true)}>
        <IconTestQuestion aria-hidden="true" />
      </button>
      {open && (
        <Frame
          title="Особенности тестирования"
          onClose={() => setOpen(false)}
          footer={
            <button type="button" className="sheet__button sheet__button--primary" onClick={() => setOpen(false)}>
              Понятно
            </button>
          }
        >
          <ul className="feature-hints">
            {hints.map((h) => (
              <li key={h.id} className="feature-hints__item">
                <h3 className="feature-hints__title">{h.title}</h3>
                <p className="feature-hints__text">{h.what}</p>
                <p className="feature-hints__text feature-hints__text--why">{h.why}</p>
              </li>
            ))}
          </ul>
        </Frame>
      )}
    </>
  );
}
