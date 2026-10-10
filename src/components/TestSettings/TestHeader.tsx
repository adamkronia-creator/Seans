import { IconBack, IconHeartGrayLg, IconHeartRedLg } from '../icons';
import { toggleFavorite, useFavorites, type LibraryTest } from '../../data/library';
import './TestSettings.css';

/** Название без аббревиатуры (на случай, если она осталась в заголовке): «BDI: Шкала депрессии А. Бека» → «Шкала депрессии А. Бека» */
export const shortTitle = (title: string) => title.replace(/^[^:]+:\s*/, '');

interface TestHeaderProps {
  test: LibraryTest;
  /** Что открыто под шапкой: «Настройка теста», «Бланк тестирования», «Результат тестирования»… */
  status: string;
  onBack: () => void;
}

/** Шапка экранов теста: назад, иконка, название, раздел и сердечко «в избранное» */
export function TestHeader({ test, status, onBack }: TestHeaderProps) {
  const favorite = useFavorites().has(test.id);
  return (
    <header className="test-settings__header">
      <button type="button" className="test-settings__button" aria-label="Назад" onClick={onBack}>
        <IconBack />
      </button>
      <div className="test-settings__peer">
        <img className="test-settings__icon" src={test.icon} alt="" />
        <div className="test-settings__who">
          <h1 className="test-settings__name">{shortTitle(test.title)}</h1>
          <p className="test-settings__status">{status}</p>
        </div>
      </div>
      <button
        type="button"
        className={`test-settings__button${favorite ? '' : ' test-settings__button--muted'}`}
        aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        aria-pressed={favorite}
        onClick={() => toggleFavorite(test.id)}
      >
        {favorite ? <IconHeartRedLg /> : <IconHeartGrayLg />}
      </button>
    </header>
  );
}
