import { useSyncExternalStore } from 'react';
import { CHATS, CURRENT_USER } from './chats';

/** Одна история: текст на цветном фоне (номер фона — в STORY_BACKGROUNDS) */
export interface Story {
  id: string;
  text: string;
  bg: number;
  /** Подпись времени: «2 ч назад» */
  ago: string;
}

export interface StoryAuthor {
  /** 'me' или номер чата */
  id: string;
  name: string;
  avatar?: string;
  stories: Story[];
}

/** Фоны историй: мягкие градиенты в тон приложению */
export const STORY_BACKGROUNDS = [
  'linear-gradient(160deg, #3f9bf1 0%, #7b6cf0 100%)',
  'linear-gradient(160deg, #f6a469 0%, #e8647c 100%)',
  'linear-gradient(160deg, #4bb34b 0%, #2688eb 100%)',
  'linear-gradient(160deg, #8e7cf0 0%, #d46cc0 100%)',
  'linear-gradient(160deg, #2c3a4d 0%, #4a6a8f 100%)',
];

const SEEN_KEY = 'seans.stories.seen';
const OWN_KEY = 'seans.stories.own';

// Тестовые истории собеседников (придуманы); свои хранятся в браузере
const SEED: Record<string, Story[]> = {
  maxim: [
    { id: 'maxim-1', text: 'Сегодня впервые за месяц выспался.', bg: 2, ago: '3 ч назад' },
    { id: 'maxim-2', text: 'Прогулка помогает: 40 минут без телефона.', bg: 0, ago: '2 ч назад' },
    { id: 'maxim-3', text: 'Готов к сессии в четверг.', bg: 4, ago: '1 ч назад' },
  ],
  vera: [{ id: 'vera-1', text: 'Дневник эмоций заполнен. Горжусь собой!', bg: 3, ago: '5 ч назад' }],
  vladislav: [
    { id: 'vlad-1', text: 'Прочитал про опросники — оказывается, их много.', bg: 1, ago: '4 ч назад' },
    { id: 'vlad-2', text: 'Какой опросник пройти первым?', bg: 0, ago: '4 ч назад' },
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

/** Опубликовать свою историю */
export const addStory = (text: string, bg: number) => {
  own = [...own, { id: `me-${Date.now()}`, text, bg, ago: 'только что' }];
  write(OWN_KEY, own);
  emit();
};

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
