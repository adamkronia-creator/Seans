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
  vera: [
    { id: 'v1', src: bgDefault, date: 'Октябрь' },
    { id: 'v2', src: bgDawnSoft, date: 'Октябрь' },
  ],
  vladislav: [{ id: 'w1', src: bgDawn, date: 'Сентябрь' }],
  bogdan: [
    { id: 'b1', src: bgDawnSoft, date: 'Сентябрь' },
    { id: 'b2', src: bgDawn, date: 'Август' },
  ],
  maxim: [
    { id: 'm1', src: bgDawn, date: 'Октябрь' },
    { id: 'm2', src: bgDefault, date: 'Октябрь' },
    { id: 'm3', src: bgDawnSoft, date: 'Сентябрь' },
  ],
};

export const SHARED_FILES: Record<string, SharedFile[]> = {
  vera: [{ id: 'vf1', name: 'Дневник эмоций (заполненный).pdf', size: '176 КБ', date: '19 октября' }],
  vladislav: [
    { id: 'wf1', name: 'Обзор опросников КПТ.pdf', size: '1,2 МБ', date: '8 октября' },
    { id: 'wf2', name: 'Шкала Бека.docx', size: '52 КБ', date: '2 октября' },
  ],
  bogdan: [
    { id: 'bf1', name: 'Программа семинара.pdf', size: '640 КБ', date: '14 сентября' },
    { id: 'bf2', name: 'Список литературы.docx', size: '31 КБ', date: '14 сентября' },
    { id: 'bf3', name: 'Запись третьего занятия.mp3', size: '18 МБ', date: '21 августа' },
  ],
  maxim: [
    { id: 'f1', name: 'Дневник эмоций.pdf', size: '214 КБ', date: '12 октября' },
    { id: 'f2', name: 'Согласие на обработку данных.docx', size: '38 КБ', date: '3 сентября' },
  ],
};

/** Тестовые ссылки (придуманы): к ним добавляются ссылки из переписки */
export const SHARED_LINKS: Record<string, SharedLink[]> = {
  vera: [{ id: 'vl1', url: 'https://example.org/emotion-wheel', host: 'example.org/emotion-wheel', text: 'Колесо эмоций: как назвать то, что чувствуешь', date: 'Октябрь' }],
  vladislav: [
    { id: 'wl1', url: 'https://example.org/questionnaires', host: 'example.org/questionnaires', text: 'Каталог психологических опросников', date: 'Октябрь' },
    { id: 'wl2', url: 'https://example.org/cbt-basics', host: 'example.org/cbt-basics', text: 'Основы КПТ: модель Бека за 10 минут', date: 'Сентябрь' },
  ],
  bogdan: [{ id: 'bl1', url: 'https://example.org/seminar', host: 'example.org/seminar', text: 'Страница семинара и запись на занятия', date: 'Август' }],
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
