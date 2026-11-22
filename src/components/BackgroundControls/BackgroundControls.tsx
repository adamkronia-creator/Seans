import { useRef, useState, type CSSProperties } from 'react';
import './BackgroundControls.css';
import '../../styles/segmented-control.css';
import '../AttachSheet/AttachSheet.css';
import { addToNamedAlbum } from '../../data/profile';
import { uploadPhotos } from '../Profile/upload';
import dawn from '../../assets/bg-default.webp';
import { TonePalette } from '../EditSheet/TonePalette';
import { IconSheetPalette } from '../icons';
import IconBlur from '../../assets/icons/solar/radial-blur.svg?react';
import IconText from '../../assets/icons/solar/text-format.svg?react';
import { IconCamera, IconCheck } from '../Profile/ProfileIcons';
import {
  currentBackgroundId,
  getBackgrounds,
  getBackgroundColor,
  getBlur,
  getInkPref,
  removeBackground,
  resetBackground,
  selectBackground,
  setBackgroundFromFile,
  setBackgroundColor,
  setBlur,
  setInkPref,
  type InkPref,
} from '../../utils/appearance';

const INKS: { id: InkPref; label: string }[] = [
  { id: 'auto', label: 'Авто' },
  { id: 'dark', label: 'Тёмный' },
  { id: 'light', label: 'Белый' },
];

/** Настройки фона приложения: выбрать картинку или цвет, размытие и цвет текста (авто — по яркости фона). Стоят в окне выбора обложки профиля */
export function BackgroundControls() {
  const file = useRef<HTMLInputElement>(null);
  const [blur, setBlurState] = useState(getBlur);
  const ink = getInkPref();
  const [failed, setFailed] = useState(false);
  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const list = getBackgrounds();
  const selected = currentBackgroundId();
  const color = getBackgroundColor();
  const defaultSelected = selected === null && color === null;
  return (
    <>
      <div className="at-card">
        <ul className="at-photos">
          <li>
            <button type="button" className="at-photo at-photo--camera" aria-label="Загрузить фон" onClick={() => file.current?.click()}>
              <IconCamera />
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`at-photo${defaultSelected ? ' at-photo--on' : ''}`}
              aria-label="Фон по умолчанию"
              aria-pressed={defaultSelected}
              onClick={() => {
                resetBackground();
                refresh();
              }}
            >
              <img src={dawn} alt="" />
              {defaultSelected && (
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
                className={`at-photo${bg.id === selected ? ' at-photo--on' : ''}`}
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
            if (f) {
              const ok = await setBackgroundFromFile(f);
              setFailed(!ok);
              // Загруженный фон складывается и в альбом «Фон приложения» в галерее
              if (ok) {
                const { added } = await uploadPhotos([f], () => {});
                if (added.length > 0) addToNamedAlbum('Фон приложения', added);
              }
            }
            refresh();
          }}
        />
      </div>
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

      <section className="sheet__card sheet__appearance bg-sheet__palette">
        <div className="sheet__toggle-row">
          <IconSheetPalette className="sheet__toggle-icon" aria-hidden="true" />
          <span className="sheet__toggle-label" id="bg-color-label">Цвет фона</span>
        </div>
        <TonePalette labelledBy="bg-color-label" value={color} onChange={(id) => {
          setBackgroundColor(id);
          refresh();
        }} />
      </section>

      <section className="sheet__card bg-sheet__card">
        <label className="bg-sheet__label" htmlFor="bg-blur">
          <IconBlur className="sheet__toggle-icon" aria-hidden="true" />
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
          disabled={color !== null}
          onChange={(e) => {
            const v = Number(e.target.value);
            setBlurState(v);
            setBlur(v);
          }}
        />
      </section>

      <section className="sheet__card bg-sheet__card">
        <div className="bg-sheet__label" id="bg-ink-label">
          <IconText className="sheet__toggle-icon" aria-hidden="true" />
          <span>Цвет текста</span>
        </div>
        <div
          className="segmented-control"
          role="radiogroup"
          aria-labelledby="bg-ink-label"
          style={{ '--seg-i': Math.max(0, INKS.findIndex((x) => x.id === ink)), '--seg-n': INKS.length } as CSSProperties}
        >
          {INKS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={ink === id}
              className="segmented-control__item"
              onClick={() => {
                setInkPref(id);
                refresh();
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
