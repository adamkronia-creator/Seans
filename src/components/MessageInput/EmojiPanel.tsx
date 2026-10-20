import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EmojiGroupId } from '../../data/emojiSet';
import './EmojiPanel.css';

/** Категории панели: знак на вкладке и название (для подписи раздела и экранных программ) */
const GROUPS: Record<EmojiGroupId | 'recent', { tab: string; title: string }> = {
  recent: { tab: '🕘', title: 'Недавние' },
  smileys: { tab: '😀', title: 'Смайлики и эмоции' },
  people: { tab: '👋', title: 'Люди и жесты' },
  animals: { tab: '🐱', title: 'Животные и природа' },
  food: { tab: '🍎', title: 'Еда и напитки' },
  travel: { tab: '🚗', title: 'Путешествия и места' },
  activities: { tab: '⚽', title: 'Занятия и спорт' },
  objects: { tab: '💡', title: 'Предметы' },
  symbols: { tab: '❤️', title: 'Символы' },
  flags: { tab: '🏳️', title: 'Флаги' },
};

const RECENT_KEY = 'seans-emoji-recent';
const RECENT_MAX = 24;

const readRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};

const writeRecent = (list: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* хранилище недоступно: недавние живут до перезагрузки */
  }
};

interface EmojiPanelProps {
  onPick: (emoji: string) => void;
}

/**
 * Панель эмодзи как в Telegram: сверху вкладки категорий, ниже все категории подряд с заголовками.
 * Нажатие на вкладку прокручивает к категории, прокрутка подсвечивает вкладку текущей. «Недавние» запоминаются на устройстве.
 * Набор (≈1 900 знаков) подгружается при первом открытии, чтобы не утяжелять чат.
 */
export function EmojiPanel({ onPick }: EmojiPanelProps) {
  const [groups, setGroups] = useState<{ id: EmojiGroupId; emojis: string[] }[] | null>(null);
  // Недавние читаются при открытии панели: пока она открыта, плитки под пальцем не прыгают
  const [recent] = useState<string[]>(readRecent);
  const [current, setCurrent] = useState<EmojiGroupId | 'recent'>(recent.length > 0 ? 'recent' : 'smileys');
  const scroller = useRef<HTMLDivElement>(null);
  /** Пока прокрутка идёт по нажатию на вкладку, подсветку не пересчитываем: она уже стоит на выбранной */
  const jumping = useRef(false);

  useEffect(() => {
    let alive = true;
    void import('../../data/emojiSet').then((m) => alive && setGroups(m.EMOJI_GROUPS));
    return () => {
      alive = false;
    };
  }, []);

  const ids: (EmojiGroupId | 'recent')[] = [...(recent.length > 0 ? (['recent'] as const) : []), ...(groups?.map((g) => g.id) ?? [])];

  const section = (id: string) => scroller.current?.querySelector<HTMLElement>(`[data-group="${id}"]`) ?? null;

  const go = (id: EmojiGroupId | 'recent') => {
    const box = scroller.current;
    const target = section(id);
    if (!box || !target) return;
    setCurrent(id);
    jumping.current = true;
    box.scrollTo({ top: box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      jumping.current = false;
    }, 450);
  };

  // Подсветка вкладки: последняя категория, чей заголовок уже дошёл до верха прокрутки
  const onScroll = () => {
    const box = scroller.current;
    if (!box || jumping.current) return;
    let found: EmojiGroupId | 'recent' | null = null;
    for (const id of ids) {
      const el = section(id);
      if (el && el.getBoundingClientRect().top - box.getBoundingClientRect().top <= 8) found = id;
    }
    if (found && found !== current) setCurrent(found);
  };

  useLayoutEffect(() => {
    if (groups && scroller.current) scroller.current.scrollTop = 0;
  }, [groups]);

  const pick = (emoji: string) => {
    onPick(emoji);
    writeRecent([emoji, ...readRecent().filter((e) => e !== emoji)].slice(0, RECENT_MAX));
  };

  const sections: { id: EmojiGroupId | 'recent'; emojis: string[] }[] = [...(recent.length > 0 ? [{ id: 'recent' as const, emojis: recent }] : []), ...(groups ?? [])];

  return (
    <div className="emoji-panel" role="group" aria-label="Эмодзи">
      <div className="emoji-panel__tabs" role="tablist" aria-label="Категории эмодзи">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={current === id}
            aria-label={GROUPS[id].title}
            className={`emoji-panel__tab${current === id ? ' emoji-panel__tab--on' : ''}`}
            onClick={() => go(id)}
          >
            {GROUPS[id].tab}
          </button>
        ))}
      </div>
      <div ref={scroller} className="emoji-panel__scroll" onScroll={onScroll}>
        {sections.map(({ id, emojis }) => (
          <section key={id} className="emoji-panel__group" data-group={id} aria-label={GROUPS[id].title}>
            <h3 className="emoji-panel__title">{GROUPS[id].title}</h3>
            <div className="emoji-panel__grid">
              {emojis.map((emoji) => (
                <button key={emoji} type="button" className="emoji-panel__item" onClick={() => pick(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
