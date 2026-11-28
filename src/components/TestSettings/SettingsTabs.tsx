import { useCallback, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Chip } from '../Chip/Chip';
import { SwipePager } from '../SwipePager/SwipePager';
import { followChips, type PositionVia } from '../../utils/followChips';

const TABS = ['Настройки', 'Описание', 'Материалы'];

export function SettingsTabs({ label, index, onIndexChange, onBack, setup, description, materials }: {
  label: string;
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  setup: ReactNode;
  description: ReactNode;
  materials: ReactNode;
}) {
  const chips = useRef<HTMLDivElement>(null);
  const chipPosition = useRef(index);
  const syncChips = useCallback((position: number, via?: PositionVia) => {
    chipPosition.current = position;
    if (chips.current) followChips(chips.current.querySelectorAll<HTMLButtonElement>('.chip'), position, via);
  }, []);

  useLayoutEffect(() => {
    const row = chips.current;
    if (!row) return;
    const place = () => syncChips(chipPosition.current);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(row);
    row.querySelectorAll('.chip').forEach((chip) => observer.observe(chip));
    return () => observer.disconnect();
  }, [syncChips]);

  return (
    <>
      <div ref={chips} className="screen-header__chips ts-settings-chips" role="group" aria-label={label} data-hscroll>
        <span className="chips-pill" aria-hidden="true" />
        {TABS.map((title, tab) => (
          <Chip key={title} tone="chat" follow active={tab === index} onClick={() => onIndexChange(tab)}>{title}</Chip>
        ))}
      </div>
      <div className="ts-settings-tabs" data-no-swipe-back>
        <SwipePager
          index={index}
          onIndexChange={onIndexChange}
          onPosition={syncChips}
          onEdgeSwipe={(direction) => { if (direction < 0) onBack(); }}
          pages={[
            { key: 'setup', node: <div className="test-settings__scroll ts-settings-page ts-settings-page--setup">{setup}</div> },
            { key: 'description', node: <div className="test-settings__scroll ts-settings-page">{description}</div> },
            { key: 'materials', node: <div className="test-settings__scroll ts-settings-page">{materials}</div> },
          ]}
        />
      </div>
    </>
  );
}
