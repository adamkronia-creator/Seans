import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addStory, isSeen, markSeen, STORY_BACKGROUNDS, useStoryAuthors, type StoryAuthor } from '../../data/stories';
import { useAvatarSrc } from '../../data/profile';
import { navigate } from '../../router';
import { Avatar } from '../Avatar/Avatar';
import { IconCloseMk, IconPlusMk } from '../ChatItem/ChatIcons';
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
  const [viewing, setViewing] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  // Очередь просмотра: у кого есть истории (свои — первыми, если есть)
  const queue = authors.filter((a) => a.stories.length > 0);
  const open = (id: string) => {
    if (queue.some((a) => a.id === id)) setViewing(id);
  };

  return (
    <div className="stories" role="group" aria-label="Истории">
      {authors.map((a, i) => {
        const unseen = a.stories.filter((s) => !isSeen(s.id)).length;
        const has = a.stories.length > 0;
        const mine = a.id === 'me';
        return (
          <div key={a.id} className="stories__cell">
            {i === 1 && <span className="stories__divider" aria-hidden="true" />}
            <button
              type="button"
              className="stories__item"
              aria-label={mine ? (has ? 'Ваши истории' : 'Добавить историю') : `Истории: ${a.name}, непросмотренных ${unseen}`}
              onClick={() => (has ? open(a.id) : mine ? setComposing(true) : undefined)}
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
      {viewing && root && createPortal(<StoryViewer queue={queue} startId={viewing} onClose={() => setViewing(null)} />, root)}
      {composing && root && createPortal(<StoryComposer onClose={() => setComposing(false)} onDone={() => setComposing(false)} />, root)}
    </div>
  );
}

/**
 * Просмотр историй на весь экран: полоски времени сверху, имя и «закрыть», текст на градиенте. Нажатие справа — дальше, слева — назад;
 * пока палец держит историю, время стоит. Закончились истории человека — идёт следующий, потом просмотр закрывается.
 */
function StoryViewer({ queue, startId, onClose }: { queue: StoryAuthor[]; startId: string; onClose: () => void }) {
  const [a, setA] = useState(Math.max(0, queue.findIndex((x) => x.id === startId)));
  const first = queue[a].stories.findIndex((s) => !isSeen(s.id));
  const [s, setS] = useState(Math.max(0, first));
  const [paused, setPaused] = useState(false);
  const me = useAvatarSrc();
  const author = queue[a];
  const story = author.stories[Math.min(s, author.stories.length - 1)];
  const bar = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);

  const next = () => {
    if (s < author.stories.length - 1) setS(s + 1);
    else if (a < queue.length - 1) {
      setA(a + 1);
      setS(0);
    } else onClose();
  };
  const prev = () => {
    if (s > 0) setS(s - 1);
    else if (a > 0) {
      setA(a - 1);
      setS(0);
    }
  };

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
      if (!paused) elapsed.current += now - last;
      last = now;
      bar.current?.style.setProperty('--p', String(Math.min(1, elapsed.current / STORY_MS)));
      if (elapsed.current >= STORY_MS) next();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, paused, a, s]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, s]);

  const mine = author.id === 'me';
  return (
    <div className="story-view" role="dialog" aria-modal="true" aria-label={`Истории: ${author.name}`} style={{ background: STORY_BACKGROUNDS[story.bg % STORY_BACKGROUNDS.length] }}>
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
        <button type="button" className="story-view__close" aria-label="Закрыть" onClick={onClose}>
          <IconCloseMk />
        </button>
      </div>
      <div
        className="story-view__body"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <button type="button" className="story-view__tap story-view__tap--prev" aria-label="Назад" onClick={prev} />
        <button type="button" className="story-view__tap story-view__tap--next" aria-label="Дальше" onClick={next} />
        <p className="story-view__text">{story.text}</p>
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
