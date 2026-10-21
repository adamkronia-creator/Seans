import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addStory, isSeen, markSeen, STORY_BACKGROUNDS, useStoryAuthors, type StoryAuthor } from '../../data/stories';
import { useAvatarSrc } from '../../data/profile';
import { navigate } from '../../router';
import { Avatar } from '../Avatar/Avatar';
import { reducedMotion } from '../../utils/swipe';
import { IconCloseMk, IconPlusMk } from '../ChatItem/ChatIcons';
import { useStoryGestures } from './useStoryGestures';
import './Stories.css';

/** Сколько длится одна история */
const STORY_MS = 5000;

const firstName = (name: string) => name.split(' ')[0];

/**
 * Ряд историй над чипсами (как в мессенджерах): «Вы» с плюсом, затем собеседники. У непросмотренных кольцо с градиентом и число
 * непросмотренных историй, у просмотренных кольцо серое. Нажатие открывает просмотр с этого человека.
 */
export function StoriesRow({ root }: { root: HTMLElement | null }) {
  const authors = useStoryAuthors();
  const me = useAvatarSrc();
  const [viewing, setViewing] = useState<{ id: string; x: number; y: number } | null>(null);
  const [composing, setComposing] = useState(false);

  // Очередь просмотра: у кого есть истории (свои — первыми, если есть)
  const queue = authors.filter((a) => a.stories.length > 0);
  // Просмотр вырастает из круга, на который нажали: центр кольца относительно экрана, на котором лежит просмотр
  const open = (id: string, ring: Element | null) => {
    if (!queue.some((a) => a.id === id)) return;
    const from = ring?.getBoundingClientRect();
    const to = root?.getBoundingClientRect();
    setViewing({ id, x: from && to ? from.left + from.width / 2 - to.left : 0, y: from && to ? from.top + from.height / 2 - to.top : 0 });
  };

  return (
    <div className="stories" role="group" aria-label="Истории">
      {authors.map((a) => {
        const unseen = a.stories.filter((s) => !isSeen(s.id)).length;
        const has = a.stories.length > 0;
        const mine = a.id === 'me';
        return (
          <div key={a.id} className="stories__cell">
            <button
              type="button"
              className="stories__item"
              aria-label={mine ? (has ? 'Ваши истории' : 'Добавить историю') : `Истории: ${a.name}, непросмотренных ${unseen}`}
              onClick={(e) => (has ? open(a.id, e.currentTarget.querySelector('.stories__ring')) : mine ? setComposing(true) : undefined)}
            >
              <span className={`stories__ring${has ? (unseen > 0 ? ' stories__ring--new' : ' stories__ring--seen') : ' stories__ring--empty'}`}>
                {mine && !has ? (
                  <span className="stories__add">
                    <IconPlusMk />
                  </span>
                ) : (
                  <Avatar src={mine ? me : a.avatar} />
                )}
              </span>
              {!mine && unseen > 0 && <span className="stories__count">{unseen}</span>}
              <span className="stories__label">{mine ? 'Вы' : firstName(a.name)}</span>
            </button>
            {mine && has && (
              <button type="button" className="stories__plus" aria-label="Добавить историю" onClick={() => setComposing(true)}>
                <IconPlusMk />
              </button>
            )}
          </div>
        );
      })}
      {viewing && root && createPortal(<StoryViewer queue={queue} startId={viewing.id} origin={viewing} onClose={() => setViewing(null)} />, root)}
      {composing && root && createPortal(<StoryComposer onClose={() => setComposing(false)} onDone={() => setComposing(false)} />, root)}
    </div>
  );
}

/**
 * Просмотр историй на весь экран: полоски времени сверху, имя и «закрыть», текст на градиенте. Нажатие справа — дальше, слева — назад;
 * пока палец держит историю, время стоит. Закончились истории человека — идёт следующий, потом просмотр закрывается.
 * Жесты (useStoryGestures): вниз — закрыть, влево и вправо — следующий и предыдущий человек. Просмотр вырастает из круга, на который
 * нажали, и сжимается при закрытии; новый человек въезжает с той стороны, куда провели.
 */
export function StoryViewer({ queue, startId, startStory, origin, onClose }: { queue: StoryAuthor[]; startId: string; /** С какой истории начать (номер); без него — с первой непросмотренной */ startStory?: number; origin: { x: number; y: number }; onClose: () => void }) {
  const [a, setA] = useState(Math.max(0, queue.findIndex((x) => x.id === startId)));
  const first = queue[a].stories.findIndex((s) => !isSeen(s.id));
  const [s, setS] = useState(startStory ?? Math.max(0, first));
  const [paused, setPaused] = useState(false);
  /** Идёт уход (кнопка, Escape, конец историй): ждём конца анимации и только потом убираем просмотр */
  const [closing, setClosing] = useState(false);
  /** Какое движение карточки идёт сейчас: 'open' — вырастает из круга, 'next' и 'prev' — новый человек въезжает справа или слева; конец анимации снимает */
  const [motion, setMotion] = useState<'open' | 'next' | 'prev' | null>(reducedMotion() ? null : 'open');
  const me = useAvatarSrc();
  const author = queue[a];
  const story = author.stories[Math.min(s, author.stories.length - 1)];
  const bar = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const close = () => {
    if (closing) return;
    if (reducedMotion()) {
      onClose();
      return;
    }
    setMotion(null);
    setClosing(true);
  };
  const goAuthor = (to: number, dir: 'next' | 'prev') => {
    setA(to);
    setS(0);
    setMotion(reducedMotion() ? null : dir);
  };
  const next = () => {
    if (s < author.stories.length - 1) setS(s + 1);
    else if (a < queue.length - 1) goAuthor(a + 1, 'next');
    else close();
  };
  const prev = () => {
    if (s > 0) setS(s - 1);
    else if (a > 0) goAuthor(a - 1, 'prev');
  };

  const gestures = useStoryGestures(stage, card, {
    canStep: (dir) => (dir > 0 ? a < queue.length - 1 : a > 0),
    step: (dir) => goAuthor(a + dir, dir > 0 ? 'next' : 'prev'),
    close: onClose,
    // Палец взял карточку: вырастание или въезд, которые ещё шли, остановлены, их метка не должна остаться и сыграть второй раз
    grab: () => setMotion(null),
  });
  // Новый человек уже нарисован: карточку, ушедшую за край под пальцем, возвращаем на место (до кадра, без мигания старой)
  useLayoutEffect(() => {
    gestures.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a]);

  // Просмотренной история считается, когда её показали
  useEffect(() => {
    markSeen(story.id);
    elapsed.current = 0;
  }, [story.id]);

  // Время: полоска текущей истории заполняется за STORY_MS, на паузе стоит
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!paused && !closing) elapsed.current += now - last;
      last = now;
      bar.current?.style.setProperty('--p', String(Math.min(1, elapsed.current / STORY_MS)));
      if (elapsed.current >= STORY_MS) next();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, paused, closing, a, s]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, s, closing]);

  const mine = author.id === 'me';
  return (
    <div
      ref={stage}
      className={`story-stage${closing ? ' story-stage--closing' : ''}`}
      data-no-swipe
      style={{ '--story-x': `${origin.x}px`, '--story-y': `${origin.y}px` } as React.CSSProperties}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={card}
        className="story-view"
        data-motion={motion ?? undefined}
        role="dialog"
        aria-modal="true"
        aria-label={`Истории: ${author.name}`}
        style={{ background: STORY_BACKGROUNDS[story.bg % STORY_BACKGROUNDS.length] }}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setMotion(null);
        }}
      >
        <div className="story-view__bars">
          {author.stories.map((st, i) => (
            <span key={st.id} className="story-view__bar">
              <span ref={i === s ? bar : undefined} className="story-view__fill" style={i < s ? ({ '--p': 1 } as React.CSSProperties) : i > s ? ({ '--p': 0 } as React.CSSProperties) : undefined} />
            </span>
          ))}
        </div>
        <div className="story-view__head">
          <Avatar src={mine ? me : author.avatar} size={40} />
          <span className="story-view__who">
            <span className="story-view__name">{author.name}</span>
            <span className="story-view__ago">{story.ago}</span>
          </span>
          <button type="button" className="story-view__close" aria-label="Закрыть" onClick={close}>
            <IconCloseMk />
          </button>
        </div>
        <div
          className="story-view__body"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
          // Мышь, ушедшая за край с зажатой кнопкой, паузу снимает; у касания «уход» приходит и пока карточку ведёт жест, паузу держит палец
          onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
        >
          <button type="button" className="story-view__tap story-view__tap--prev" aria-label="Назад" onClick={prev} />
          <button type="button" className="story-view__tap story-view__tap--next" aria-label="Дальше" onClick={next} />
          <p key={story.id} className="story-view__text">
            {story.text}
          </p>
        </div>
        {!mine && (
          <button
            type="button"
            className="story-view__reply"
            onClick={() => {
              onClose();
              navigate(`/chat/${author.id}`);
            }}
          >
            Написать {firstName(author.name)}
          </button>
        )}
      </div>
    </div>
  );
}

/** Новая история: текст и фон из пяти градиентов */
function StoryComposer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('');
  const [bg, setBg] = useState(0);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.focus({ preventScroll: true }), []);
  const publish = () => {
    const t = text.trim();
    if (!t) return;
    addStory(t, bg);
    onDone();
  };
  return (
    <div className="story-view story-compose" role="dialog" aria-modal="true" aria-label="Новая история" style={{ background: STORY_BACKGROUNDS[bg] }}>
      <div className="story-view__head">
        <span className="story-view__who">
          <span className="story-view__name">Новая история</span>
        </span>
        <button type="button" className="story-view__close" aria-label="Закрыть" onClick={onClose}>
          <IconCloseMk />
        </button>
      </div>
      <textarea ref={field} className="story-compose__field" value={text} maxLength={140} placeholder="Что у вас нового?" onChange={(e) => setText(e.target.value)} />
      <div className="story-compose__bottom">
        <div className="story-compose__swatches" role="radiogroup" aria-label="Фон">
          {STORY_BACKGROUNDS.map((g, i) => (
            <button key={g} type="button" role="radio" aria-checked={bg === i} aria-label={`Фон ${i + 1}`} className="story-compose__swatch" data-on={bg === i || undefined} style={{ background: g }} onClick={() => setBg(i)} />
          ))}
        </div>
        <button type="button" className="story-view__reply" disabled={!text.trim()} onClick={publish}>
          Опубликовать
        </button>
      </div>
    </div>
  );
}
