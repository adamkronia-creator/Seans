import { useState, type CSSProperties } from 'react';
import { Frame } from '../Frame/Frame';
import { SearchField } from '../SearchField/SearchField';
import IconGallery from '../../assets/icons/solar/gallery.svg?react';
import IconFile from '../../assets/icons/solar/file.svg?react';
import IconTest from '../../assets/icons/solar/clipboard-list.svg?react';
import IconTask from '../../assets/icons/solar/checklist-minimalistic.svg?react';
import { LIBRARY, TASK_LIBRARY, type LibraryItem } from '../../data/library';
import { hasTaskSettings } from '../../data/taskValues';
import { useProfile } from '../../data/profile';
import { IconCamera } from '../Profile/ProfileIcons';
import './AttachSheet.css';

interface AttachSheetProps {
  /** Выбор фото: окно закрывается, системный выбор открывает само поле ввода */
  onGallery: () => void;
  onFile: () => void;
  /** Снимок камерой */
  onCamera: () => void;
  /** Готовое фото из галереи профиля (адрес картинки) */
  onPhoto: (url: string) => void;
  /** Тесты и задания есть только в переписке с клиентом: без этого поля плиток «Тест» и «Задание» нет */
  onTest?: (id: string) => void;
  onTask?: (id: string) => void;
  onClose: () => void;
}

/** Сколько готовых фото в верхней сетке (вместе с камерой — две строки по три) */
const PHOTO_TILES = 5;

type View = 'menu' | 'test' | 'task';

/**
 * «Прикрепить»: плитки «Фото», «Файл», «Тест», «Задание». Фото и файл открывают системный выбор (поле лежит в панели ввода, а не в окне:
 * закрытое окно не должно потерять выбор). Тест и задание ведут в список библиотеки с поиском, а выбранный — на экран его настройки в этом чате,
 * где задают параметры и отправляют; без настроек (слепое тестирование, срок, сообщение) тест клиенту не уходит.
 */
export function AttachSheet({ onGallery, onFile, onCamera, onPhoto, onTest, onTask, onClose }: AttachSheetProps) {
  const [view, setView] = useState<View>('menu');
  const [query, setQuery] = useState('');
  const profile = useProfile();
  const photos = profile.photos.filter((p) => profile.thumbs[p.id]).slice(0, PHOTO_TILES);

  if (view === 'menu') {
    const tiles = [
      { key: 'photo', label: 'Картинка', Icon: IconGallery, run: () => { onGallery(); onClose(); } },
      { key: 'file', label: 'Файл', Icon: IconFile, run: () => { onFile(); onClose(); } },
      ...(onTest ? [{ key: 'test', label: 'Тест', Icon: IconTest, run: () => setView('test') }] : []),
      ...(onTask ? [{ key: 'task', label: 'Задание', Icon: IconTask, run: () => setView('task') }] : []),
    ];
    return (
      <Frame title="Прикрепить" onClose={onClose}>
        {/* Одна плитка из двух частей: сверху фото, снизу значки в одну строку; между ними просвет 1 px, как в «Личной информации» */}
        <div className="at-card">
          <ul className={`at-photos${photos.length ? '' : ' at-photos--empty'}`}>
            <li>
              <button type="button" className="at-photo at-photo--camera" aria-label="Сделать снимок" onClick={() => { onCamera(); onClose(); }}>
                <IconCamera />
              </button>
            </li>
            {photos.map((photo, i) => (
              <li key={photo.id}>
                <button type="button" className="at-photo" aria-label={`Фото ${i + 1}`} onClick={() => { onPhoto(profile.thumbs[photo.id]); onClose(); }}>
                  <img src={profile.thumbs[photo.id]} alt="" />
                </button>
              </li>
            ))}
          </ul>
          <ul className="at-tiles">
            {tiles.map(({ key, label, Icon, run }) => (
              <li key={key}>
                <button type="button" className="at-tile" onClick={run}>
                  <span className="at-tile__disc">
                    <Icon />
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Frame>
    );
  }

  const isTest = view === 'test';
  const items: LibraryItem[] = isTest ? LIBRARY : TASK_LIBRARY.filter((t) => hasTaskSettings(t.id));
  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.title} ${i.abbr ?? ''}`.toLowerCase().includes(q)) : items;
  const pick = (id: string) => {
    onClose();
    (isTest ? onTest : onTask)?.(id);
  };

  return (
    <Frame title={isTest ? 'Выберите тест' : 'Выберите задание'} onClose={onClose}>
      <SearchField value={query} onChange={setQuery} placeholder={isTest ? 'Поиск тестов' : 'Поиск заданий'} onClear={() => setQuery('')} />
      <div className="sheet__card">
        <ul className="at-list">
          {shown.map((item) => (
            <li key={item.id}>
              <button type="button" className="at-row" onClick={() => pick(item.id)}>
                {/* Значок и подписи как в меню тестов и заданий: полное название и описание */}
                <span className="at-row__avatar" style={{ '--tint': item.tint } as CSSProperties}>
                  <img className="at-row__icon" src={item.icon} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="at-row__text">
                  <span className="at-row__title">{item.title}</span>
                  <span className="at-row__note">{item.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="at-empty">Ничего не нашли</p>}
      </div>
      <button type="button" className="at-back" onClick={() => { setView('menu'); setQuery(''); }}>
        Назад
      </button>
    </Frame>
  );
}
