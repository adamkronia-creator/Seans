import type { CSSProperties } from 'react';
import type { LibraryItem } from '../../data/library';
import { shortTitle } from '../../components/TestSettings/TestHeader';
import '../../components/Stories/Stories.css';

/**
 * Ряд над чипсами в разделе тестов, как ряд историй в «Диалогах»: недавние тесты (то, что недавно присылали клиентам), свежие первыми.
 * Круг со значком и цветом теста, под ним первое слово названия; нажатие открывает настройку теста.
 */
export function RecentRow({ items, onOpen }: { items: LibraryItem[]; onOpen: (item: LibraryItem) => void }) {
  return (
    <div className="stories recent-row" role="group" aria-label="Недавние тесты">
      {items.map((item) => (
        <div key={item.id} className="stories__cell">
          <button type="button" className="stories__item" aria-label={shortTitle(item.title)} onClick={() => onOpen(item)}>
            <span className="stories__ring stories__ring--empty">
              <span className="recent-row__avatar" style={{ '--tint': item.tint } as CSSProperties}>
                <img className="recent-row__icon" src={item.icon} alt="" />
              </span>
            </span>
            <span className="stories__label">{shortTitle(item.title).split(' ')[0]}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
