import type { CSSProperties } from 'react';
import { IconBack, IconHeartGrayLg, IconHeartRedLg } from '../icons';
import { toggleFavorite, toggleTaskFavorite, useFavorites, useTaskFavorites, type LibraryItem } from '../../data/library';
import { BLIND_TITLE } from '../../data/resultMode';
import './TestSettings.css';

/** Название без аббревиатуры (на случай, если она осталась в заголовке): «BDI: Шкала депрессии А. Бека» → «Шкала депрессии А. Бека» */
export const shortTitle = (title: string) => title.replace(/^[^:]+:\s*/, '');

interface TestHeaderProps {
  test: LibraryItem;
  /** Задание или тест: у них отдельные «избранные» */
  kind?: 'test' | 'task';
  /** Что открыто под шапкой: «Настройка теста», «Бланк тестирования», «Результат тестирования»… */
  status: string;
  onBack: () => void;
  /**
   * Шапка клиента (тест или задание, присланное специалистом, и предпросмотр): те же значок, название и раздел,
   * но без «избранного» — это библиотека специалиста. Слепой тест клиенту не называют: значка нет, название нейтральное.
   */
  client?: { blind?: boolean };
}

/** Шапка экранов теста: назад, иконка, название, раздел и сердечко «в избранное» */
export function TestHeader({ test, kind = 'test', status, onBack, client }: TestHeaderProps) {
  const testFavorites = useFavorites();
  const taskFavorites = useTaskFavorites();
  const favorite = (kind === 'task' ? taskFavorites : testFavorites).has(test.id);
  const toggle = kind === 'task' ? toggleTaskFavorite : toggleFavorite;
  const hidden = Boolean(client?.blind);
  const Glyph = test.icon;
  return (
    <header className="test-settings__header">
      <button type="button" className="test-settings__button" aria-label="Назад" onClick={onBack}>
        <IconBack />
      </button>
      <div className="test-settings__peer">
        {!hidden && (
          <span className="test-settings__icon" style={{ '--tint': test.tint } as CSSProperties}>
            <Glyph />
          </span>
        )}
        <div className="test-settings__who">
          <h1 className="test-settings__name">{hidden ? BLIND_TITLE : shortTitle(test.title)}</h1>
          <p className="test-settings__status">{status}</p>
        </div>
      </div>
      {!client && (
        <button
          type="button"
          className={`test-settings__button${favorite ? '' : ' test-settings__button--muted'}`}
          aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={favorite}
          onClick={() => toggle(test.id)}
        >
          {favorite ? <IconHeartRedLg /> : <IconHeartGrayLg />}
        </button>
      )}
    </header>
  );
}
