import { useSyncExternalStore } from 'react';
import { CHATS, CURRENT_USER } from './chats';

/** Одна история: текст на цветном фоне (номер фона — в STORY_BACKGROUNDS) */
export interface Story {
  id: string;
  text: string;
  bg: number;
  /** Подпись времени: «2 часа назад» */
  ago: string;
}

export interface StoryAuthor {
  /** 'me' или номер чата */
  id: string;
  name: string;
  avatar?: string;
  stories: Story[];
}

export interface StoryFolder {
  id: string;
  name: string;
  storyIds: string[];
}

/** Фоны историй: мягкие градиенты в тон приложению */
export const STORY_BACKGROUNDS = [
  ['blue', 'slate'],
  ['orange', 'pink'],
  ['green', 'blue'],
  ['slate', 'magenta'],
  ['slate', 'blue'],
].map(([start, end], index) => {
  const weight = index === 4 ? 36 : 68;
  return `linear-gradient(160deg, color-mix(in srgb, var(--palette-${start}) ${weight}%, var(--palette-black)), color-mix(in srgb, var(--palette-${end}) ${weight}%, var(--palette-black)))`;
});

const SEEN_KEY = 'seans.stories.seen';
const OWN_KEY = 'seans.stories.own';
const FOLDERS_KEY = 'seans.stories.folders';

// Тестовые истории собеседников (придуманы); свои хранятся в браузере
const SEED: Record<string, Story[]> = {
  maxim: [
    { id: 'maxim-1', text: 'Сегодня впервые за месяц выспался.', bg: 2, ago: '3 часа назад' },
    { id: 'maxim-2', text: 'Прогулка помогает: 40 минут без телефона.', bg: 0, ago: '2 часа назад' },
    { id: 'maxim-3', text: 'Готов к сессии в четверг.', bg: 4, ago: '1 час назад' },
  ],
  vera: [{ id: 'vera-1', text: 'Дневник эмоций заполнен. Горжусь собой!', bg: 3, ago: '5 часов назад' }],
  vladislav: [
    { id: 'vlad-1', text: 'Прочитал про опросники — оказывается, их много.', bg: 1, ago: '4 часа назад' },
    { id: 'vlad-2', text: 'Какой опросник пройти первым?', bg: 0, ago: '4 часа назад' },
  ],
};

const read = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно: истории живут до перезагрузки */
  }
};

let seen = new Set<string>(Array.isArray(read(SEEN_KEY)) ? (read(SEEN_KEY) as string[]) : []);
let own: Story[] = Array.isArray(read(OWN_KEY)) ? (read(OWN_KEY) as Story[]) : [];
const storedFolders = read(FOLDERS_KEY);
let folders: StoryFolder[] = Array.isArray(storedFolders) ? storedFolders.filter((folder) =>
  typeof folder?.id === 'string' && typeof folder.name === 'string'
    && Array.isArray(folder.storyIds) && folder.storyIds.every((id: unknown) => typeof id === 'string'),
) : [];
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version += 1;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const markSeen = (id: string) => {
  if (seen.has(id)) return;
  seen = new Set(seen).add(id);
  write(SEEN_KEY, [...seen]);
  emit();
};

const newId = () => crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/** Опубликовать свою историю */
export const addStory = (text: string, bg: number) => {
  own = [...own, { id: `me-${newId()}`, text, bg, ago: 'только что' }];
  write(OWN_KEY, own);
  emit();
};

function saveStoryFolders(next: StoryFolder[]) {
  folders = next;
  write(FOLDERS_KEY, folders);
  emit();
}

export function saveStoryFolder(name: string, id?: string): string {
  const clean = name.trim();
  if (id) {
    if (clean && folders.some((folder) => folder.id === id)) {
      saveStoryFolders(folders.map((folder) => folder.id === id ? { ...folder, name: clean } : folder));
    }
    return id;
  }
  if (!clean) return '';
  const folder = { id: newId(), name: clean, storyIds: [] };
  saveStoryFolders([...folders, folder]);
  return folder.id;
}

export function setFolderStories(id: string, storyIds: string[]) {
  const valid = new Set(own.map((story) => story.id));
  const ids = [...new Set(storyIds)].filter((storyId) => valid.has(storyId));
  saveStoryFolders(folders.map((folder) => folder.id === id ? { ...folder, storyIds: ids } : folder));
}

export function removeStoryFolder(id: string) {
  saveStoryFolders(folders.filter((folder) => folder.id !== id));
}

export const useOwnStories = () => useSyncExternalStore(subscribe, () => own);
export const useStoryFolders = () => useSyncExternalStore(subscribe, () => folders);

export const isSeen = (id: string) => seen.has(id);

const authors = (): StoryAuthor[] => [
  { id: 'me', name: CURRENT_USER.name, stories: own },
  ...CHATS.filter((c) => SEED[c.id] && !c.archived).map((c) => ({ id: c.id, name: c.name, avatar: c.avatar, stories: SEED[c.id] })),
];

let cache: { v: number; list: StoryAuthor[] } = { v: -1, list: [] };
/** Авторы историй: «Вы» первым, дальше собеседники; обновляется, когда историю посмотрели или добавили */
export const useStoryAuthors = (): StoryAuthor[] => {
  useSyncExternalStore(subscribe, () => version);
  if (cache.v !== version) cache = { v: version, list: authors() };
  return cache.list;
};
