import bgDawn from '../assets/bg-dawn.webp';
import bgDawnSoft from '../assets/bg-dawn-soft.webp';
import bgDefault from '../assets/bg-default.webp';
import type { MessageGroup } from './messages';

/* Общее с собеседником: вкладки «Медиа», «Файлы» и «Ссылки» в его профиле. Ссылки берутся из переписки; фото и файлы пока тестовые (придуманы),
   настоящего обмена файлами в приложении ещё нет. */

export interface SharedMedia {
  id: string;
  src: string;
  date: string;
}

export interface SharedFile {
  id: string;
  name: string;
  size: string;
  date: string;
}

export interface SharedLink {
  id: string;
  url: string;
  /** Адрес без протокола: «t.me/channel» */
  host: string;
  /** Сообщение, в котором ссылка */
  text: string;
  date: string;
}

export const SHARED_MEDIA: Record<string, SharedMedia[]> = {
  maxim: [
    { id: 'm1', src: bgDawn, date: 'Октябрь' },
    { id: 'm2', src: bgDefault, date: 'Октябрь' },
    { id: 'm3', src: bgDawnSoft, date: 'Сентябрь' },
  ],
};

export const SHARED_FILES: Record<string, SharedFile[]> = {
  maxim: [
    { id: 'f1', name: 'Дневник эмоций.pdf', size: '214 КБ', date: '12 октября' },
    { id: 'f2', name: 'Согласие на обработку данных.docx', size: '38 КБ', date: '3 сентября' },
  ],
};

/** Тестовые ссылки (придуманы): к ним добавляются ссылки из переписки */
export const SHARED_LINKS: Record<string, SharedLink[]> = {
  maxim: [
    { id: 'l1', url: 'https://example.org/breathing', host: 'example.org/breathing', text: 'Дыхание 4-7-8: упражнение для засыпания', date: 'Октябрь' },
    { id: 'l2', url: 'https://example.org/sleep-diary', host: 'example.org/sleep-diary', text: 'Дневник сна: бланк для распечатки', date: 'Сентябрь' },
  ],
};

/** Ссылки из текстов сообщений, новые первыми */
export function linksIn(groups: MessageGroup[]): SharedLink[] {
  const out: SharedLink[] = [];
  for (const g of groups) {
    for (const m of g.messages) {
      for (const url of m.text.match(/https?:\/\/[^\s<>«»]+/g) ?? []) {
        const clean = url.replace(/[.,;:!?)]+$/, '');
        out.push({ id: `${m.id}-${out.length}`, url: clean, host: clean.replace(/^https?:\/\//, ''), text: m.text.replace(/\s*\n\s*/g, ' '), date: g.label });
      }
    }
  }
  return out.reverse();
}
