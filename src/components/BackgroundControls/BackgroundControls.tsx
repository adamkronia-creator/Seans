import { useRef, useState } from 'react';
import './BackgroundControls.css';
import dawn from '../../assets/bg-default.webp';
import { IconCamera, IconCheck } from '../Profile/ProfileIcons';
import {
  currentBackgroundId,
  getBackgrounds,
  getBlur,
  getInkPref,
  removeBackground,
  resetBackground,
  selectBackground,
  setBackgroundFromFile,
  setBlur,
  setInkPref,
  type InkPref,
} from '../../utils/appearance';

const INKS: { id: InkPref; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'dark', label: 'Тёмный' },
  { id: 'light', label: 'Белый' },
];

/** Настройки фона приложения: загрузить картинку, размытие и цвет текста (авто — по яркости фона). Стоят в окне выбора обложки профиля */
export function BackgroundControls() {
  const file = useRef<HTMLInputElement>(null);
  const [blur, setBlurState] = useState(getBlur);
  const [ink, setInk] = useState<InkPref>(getInkPref);
  const [failed, setFailed] = useState(false);
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const list = getBackgrounds();
  const selected = currentBackgroundId();
  return (
    <>
      <section className="sheet__card">
        <ul className="pf-grid">
          <li>
            <button type="button" className="pf-tile pf-tile--add" onClick={() => file.current?.click()}>
              <IconCamera />
              <span>Загрузить</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`pf-tile${selected === null ? ' pf-tile--on' : ''}`}
              aria-label="Фон по умолчанию"
              aria-pressed={selected === null}
              onClick={() => {
                resetBackground();
                refresh();
              }}
            >
              <img src={dawn} alt="" />
              {selected === null && (
                <span className="pf-check">
                  <IconCheck />
                </span>
              )}
            </button>
          </li>
          {list.map((bg, i) => (
            <li key={bg.id}>
              <button
                type="button"
                className={`pf-tile${bg.id === selected ? ' pf-tile--on' : ''}`}
                aria-label={`Мой фон ${i + 1}`}
                aria-pressed={bg.id === selected}
                onClick={async () => {
                  await selectBackground(bg.id);
                  refresh();
                }}
              >
                <img src={bg.data} alt="" />
                {bg.id === selected && (
                  <span className="pf-check">
                    <IconCheck />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
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
            refresh();
          }}
        />
      </section>
      {selected && (
        <button
          type="button"
          className="sheet__card pf-remove"
          onClick={() => {
            removeBackground(selected);
            refresh();
          }}
        >
          Удалить выбранный фон
        </button>
      )}

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
          </section>
    </>
  );
}
