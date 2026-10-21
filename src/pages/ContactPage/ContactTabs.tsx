import { useState, type CSSProperties } from 'react';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { STORY_BACKGROUNDS, type Story } from '../../data/stories';
import type { SharedFile, SharedLink, SharedMedia } from '../../data/contactShared';
import { IconCopyLine, IconFile, IconImage, IconLink, IconStory } from './ContactIcons';

const TABS = ['Истории', 'Медиа', 'Файлы', 'Ссылки'] as const;
type Tab = (typeof TABS)[number];

interface Props {
  stories: Story[];
  media: SharedMedia[];
  files: SharedFile[];
  links: SharedLink[];
  onCopy: (text: string, done: string) => void;
}

/** Вкладки профиля, как в Telegram: «Истории», «Медиа», «Файлы», «Ссылки». Выбранная вкладка — плашка, которая переезжает к новой */
export function ContactTabs({ stories, media, files, links, onCopy }: Props) {
  const [tab, setTab] = useState<Tab>('Истории');
  const index = TABS.indexOf(tab);
  return (
    <section className="ct__tabs-block">
      <div className="ct__tabs" role="tablist" aria-label="Материалы" style={{ '--i': index, '--n': TABS.length } as CSSProperties}>
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" id={`ct-tab-${name}`} aria-selected={tab === name} aria-controls="ct-panel" className="ct__tab" onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>

      <div key={tab} id="ct-panel" role="tabpanel" aria-labelledby={`ct-tab-${tab}`} className="ct__panel">
        {tab === 'Истории' &&
          (stories.length ? (
            <ul className="ct__tiles">
              {stories.map((s) => (
                <li key={s.id} className="ct__story" style={{ background: STORY_BACKGROUNDS[s.bg % STORY_BACKGROUNDS.length] }}>
                  <span className="ct__story-text">{s.text}</span>
                  <span className="ct__story-ago">{s.ago}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<IconStory />} title="Историй нет" text="Здесь появятся истории собеседника." />
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
    </section>
  );
}
