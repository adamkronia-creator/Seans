import type { CSSProperties } from 'react';
import { IconBack, IconHeartGrayLg, IconHeartRedLg } from '../icons';
import { toggleFavorite, toggleTaskFavorite, useFavorites, useTaskFavorites, type LibraryItem } from '../../data/library';
import { BLIND_FALLBACK_TITLE } from '../../data/resultMode';
import './TestSettings.css';

/** Название без аббревиатуры (на случай, если она осталась в заголовке): «BDI: Шкала депрессии А. Бека» → «Шкала депрессии А. Бека» */
export const shortTitle = (title: string) => title.replace(/^[^:]+:\s*/, '');

interface TestHeaderProps {
  test: LibraryItem;
  /** Задание или тест: у них отдельные «избранные» */
  kind?: 'test' | 'task';
  /** Что открыто под шапкой: «Настройка теста», «Бланк тестирования», «Результат тестирования»… */
  status: string;
  /** Без обработчика кнопка «Назад» неактивна: так в рамке телефона в предпросмотре */
  onBack?: () => void;
  /**
   * Шапка клиента (тест или задание, присланное специалистом, и предпросмотр): те же значок, название и раздел,
   * но без «избранного» — это библиотека специалиста. Слепой тест клиенту не называют: значка нет, название нейтральное.
   */
  client?: { blind?: boolean; /** Название слепого теста («Тест №131020261007») */ title?: string };
}

/** Шапка экранов теста — как шапка открытого чата: назад, аватарка теста, название, раздел и сердечко «в избранное» на месте поиска и настроек */
export function TestHeader({ test, kind = 'test', status, onBack, client }: TestHeaderProps) {
  const testFavorites = useFavorites();
  const taskFavorites = useTaskFavorites();
  const favorite = (kind === 'task' ? taskFavorites : testFavorites).has(test.id);
  const toggle = kind === 'task' ? toggleTaskFavorite : toggleFavorite;
  const hidden = Boolean(client?.blind);
  return (
    <header className="test-settings__header">
      <div className="test-settings__peer">
        {!hidden && (
          <span className="test-settings__avatar" style={{ '--tint': test.tint } as CSSProperties}>
            <img className="test-settings__icon" src={test.icon} alt="" />
          </span>
        )}
        <div className="test-settings__who">
          <h1 className="test-settings__name">{hidden ? (client?.title ?? BLIND_FALLBACK_TITLE) : shortTitle(test.title)}</h1>
          <p className="test-settings__status">{status}</p>
        </div>
      </div>
      <button type="button" className="test-settings__button" aria-label="Назад" disabled={!onBack} onClick={onBack}>
        <IconBack />
      </button>
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
