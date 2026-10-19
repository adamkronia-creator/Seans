import { useRef, useState } from 'react';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';
import './BackgroundSheet.css';
import { getBlur, getInkPref, resetBackground, setBackgroundFromFile, setBlur, setInkPref, type InkPref } from '../../utils/appearance';

const INKS: { id: InkPref; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'dark', label: 'Тёмный' },
  { id: 'light', label: 'Белый' },
];

/** Временное окно «Фон»: загрузить картинку, размытие и цвет текста (авто — по яркости фона) */
export function BackgroundSheet({ onClose }: { onClose: () => void }) {
  useSheet(onClose);
  const file = useRef<HTMLInputElement>(null);
  const [blur, setBlurState] = useState(getBlur);
  const [ink, setInk] = useState<InkPref>(getInkPref);
  const [failed, setFailed] = useState(false);
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Фон">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__header">
          <h2 className="sheet__heading">Фон</h2>
        </div>
        <div className="sheet__body">
          <section className="sheet__card bg-sheet__card">
            <div className="bg-sheet__row">
              <button type="button" className="bg-sheet__button" onClick={() => file.current?.click()}>
                Загрузить
              </button>
              <button
                type="button"
                className="bg-sheet__button bg-sheet__button--quiet"
                onClick={() => {
                  resetBackground();
                  setFailed(false);
                }}
              >
                Сбросить
              </button>
            </div>
            {failed && <p className="bg-sheet__note">Не удалось прочитать файл: нужна картинка.</p>}
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) setFailed(!(await setBackgroundFromFile(f)));
              }}
            />
          </section>

          <section className="sheet__card bg-sheet__card">
            <label className="bg-sheet__label" htmlFor="bg-blur">
              <span>Размытие</span>
              <output className="bg-sheet__value">{blur}</output>
            </label>
            <input
              id="bg-blur"
              className="bg-sheet__range"
              type="range"
              min={0}
              max={60}
              step={1}
              value={blur}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBlurState(v);
                setBlur(v);
              }}
            />
          </section>

          <section className="sheet__card bg-sheet__card">
            <div className="bg-sheet__label" id="bg-ink-label">
              <span>Цвет текста</span>
            </div>
            <div className="bg-sheet__seg" role="radiogroup" aria-labelledby="bg-ink-label">
              {INKS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={ink === id}
                  className={`bg-sheet__seg-item${ink === id ? ' is-on' : ''}`}
                  onClick={() => {
                    setInk(id);
                    setInkPref(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="bg-sheet__note">«Авто» выбирает белый текст на тёмном фоне и тёмный на светлом.</p>
          </section>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </SheetOverlay>
  );
}
