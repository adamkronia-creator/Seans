import { useState } from 'react';
import { Frame } from '../Frame/Frame';
import { SearchField } from '../SearchField/SearchField';
import { IconTestChevron } from '../icons';
import IconGallery from '../../assets/icons/solar/gallery.svg?react';
import IconFile from '../../assets/icons/solar/file.svg?react';
import IconTest from '../../assets/icons/solar/clipboard-list.svg?react';
import IconTask from '../../assets/icons/solar/checklist-minimalistic.svg?react';
import { LIBRARY, TASK_LIBRARY, type LibraryItem } from '../../data/library';
import { hasTaskSettings } from '../../data/taskValues';
import './AttachSheet.css';

interface AttachSheetProps {
  /** Выбор фото: окно закрывается, системный выбор открывает само поле ввода */
  onGallery: () => void;
  onFile: () => void;
  /** Тесты и задания есть только в переписке с клиентом: без этого поля плиток «Тест» и «Задание» нет */
  onTest?: (id: string) => void;
  onTask?: (id: string) => void;
  onClose: () => void;
}

type View = 'menu' | 'test' | 'task';

/**
 * «Прикрепить»: плитки «Фото», «Файл», «Тест», «Задание». Фото и файл открывают системный выбор (поле лежит в панели ввода, а не в окне:
 * закрытое окно не должно потерять выбор). Тест и задание ведут в список библиотеки с поиском, а выбранный — на экран его настройки в этом чате,
 * где задают параметры и отправляют; без настроек (слепое тестирование, срок, сообщение) тест клиенту не уходит.
 */
export function AttachSheet({ onGallery, onFile, onTest, onTask, onClose }: AttachSheetProps) {
  const [view, setView] = useState<View>('menu');
  const [query, setQuery] = useState('');

  if (view === 'menu') {
    const tiles = [
      { key: 'photo', label: 'Фото', Icon: IconGallery, run: () => { onGallery(); onClose(); } },
      { key: 'file', label: 'Файл', Icon: IconFile, run: () => { onFile(); onClose(); } },
      ...(onTest ? [{ key: 'test', label: 'Тест', Icon: IconTest, run: () => setView('test') }] : []),
      ...(onTask ? [{ key: 'task', label: 'Задание', Icon: IconTask, run: () => setView('task') }] : []),
    ];
    return (
      <Frame title="Прикрепить" onClose={onClose}>
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
                <img className="at-row__icon" src={item.icon} alt="" style={{ background: item.tint }} />
                <span className="at-row__text">
                  <span className="at-row__title">{item.abbr ?? item.title}</span>
                  <span className="at-row__note">{item.abbr ? item.title : item.description}</span>
                </span>
                <IconTestChevron className="at-row__chevron" />
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
