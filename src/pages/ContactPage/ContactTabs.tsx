import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Chip } from '../../components/Chip/Chip';
import { StoryViewer } from '../../components/Stories/Stories';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { STORY_BACKGROUNDS, type Story, type StoryAuthor } from '../../data/stories';
import type { SharedFile, SharedLink, SharedMedia } from '../../data/contactShared';
import { IconCopyLine, IconFile, IconImage, IconLink, IconStory } from './ContactIcons';

const TABS = ['Истории', 'Медиа', 'Файлы', 'Ссылки'] as const;
type Tab = (typeof TABS)[number];

interface Props {
  /** Собеседник и его истории: нажатие на плитку открывает просмотр */
  author: Pick<StoryAuthor, 'id' | 'name' | 'avatar'>;
  /** Экран профиля: на нём лежит просмотр историй */
  root: HTMLElement | null;
  stories: Story[];
  media: SharedMedia[];
  files: SharedFile[];
  links: SharedLink[];
  onCopy: (text: string, done: string) => void;
  /** Чьи истории: «собеседника» или «канала» */
  whose?: string;
}

/** Вкладки профиля, как в Telegram: «Истории», «Медиа», «Файлы», «Ссылки». Выбранная вкладка — плашка, которая переезжает к новой */
export function ContactTabs({ author, root, stories, media, files, links, onCopy, whose = 'собеседника' }: Props) {
  const [tab, setTab] = useState<Tab>('Истории');
  const [viewing, setViewing] = useState<{ at: number; x: number; y: number } | null>(null);
  return (
    <section className="ct__tabs-block">
      {/* Чипсы, как в «Диалогах» и «Истории» чата, в стеклянной капсуле */}
      <div className="ct__tabs">
        <div className="ct__chips" role="group" aria-label="Материалы">
          {TABS.map((name) => (
            <Chip key={name} follow tone="chat" active={tab === name} onClick={() => setTab(name)}>
              {name}
            </Chip>
          ))}
        </div>
      </div>

      <div key={tab} className="ct__panel" role="region" aria-label={tab}>
        {tab === 'Истории' &&
          (stories.length ? (
            <ul className="ct__tiles">
              {stories.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="ct__story"
                    aria-label={`История: ${s.text}`}
                    style={{ background: STORY_BACKGROUNDS[s.bg % STORY_BACKGROUNDS.length] }}
                    onClick={(e) => {
                      // Просмотр вырастает из плитки, на которую нажали
                      const from = e.currentTarget.getBoundingClientRect();
                      const to = root?.getBoundingClientRect();
                      if (root) setViewing({ at: i, x: to ? from.left + from.width / 2 - to.left : 0, y: to ? from.top + from.height / 2 - to.top : 0 });
                    }}
                  >
                    <span className="ct__story-text">{s.text}</span>
                    <span className="ct__story-ago">{s.ago}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconStory />} title="Историй нет" text={`Здесь появятся истории ${whose}.`} />
          ))}

        {tab === 'Медиа' &&
          (media.length ? (
            <ul className="ct__grid">
              {media.map((m) => (
                <li key={m.id}>
                  <img src={m.src} alt="" loading="lazy" decoding="async" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconImage />} title="Медиа нет" text="Фото и видео из переписки появятся здесь." />
          ))}

        {tab === 'Файлы' &&
          (files.length ? (
            <ul className="ct__list">
              {files.map((f) => (
                <li key={f.id} className="ct__item">
                  <span className="ct__item-icon">
                    <IconFile />
                  </span>
                  <span className="ct__item-body">
                    <span className="ct__item-title">{f.name}</span>
                    <span className="ct__item-sub">
                      {f.size} · {f.date}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconFile />} title="Файлов нет" text="Документы из переписки появятся здесь." />
          ))}

        {tab === 'Ссылки' &&
          (links.length ? (
            <ul className="ct__list">
              {links.map((l) => (
                <li key={l.id}>
                  <a className="ct__item ct__item--link" href={l.url} target="_blank" rel="noreferrer noopener">
                    <span className="ct__item-icon">
                      <IconLink />
                    </span>
                    <span className="ct__item-body">
                      <span className="ct__item-title">{l.text}</span>
                      <span className="ct__item-url">{l.host}</span>
                    </span>
                    <button
                      type="button"
                      className="ct__item-copy"
                      aria-label="Скопировать ссылку"
                      onClick={(e) => {
                        e.preventDefault();
                        onCopy(l.url, 'Ссылка скопирована');
                      }}
                    >
                      <IconCopyLine />
                    </button>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconLink />} title="Ссылок нет" text="Ссылки из переписки появятся здесь." />
          ))}
      </div>
      {viewing && root && createPortal(<StoryViewer queue={[{ ...author, stories }]} startId={author.id} startStory={viewing.at} origin={viewing} onClose={() => setViewing(null)} />, root)}
    </section>
  );
}
