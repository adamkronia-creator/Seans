import { levelOf, levelsOf, type ConclusionData, type ConclusionScale } from './conclusions';

/*
 * Краткий итог результата для карточки в списке: у теста с одной шкалой — её балл и уровень,
 * у теста со многими шкалами — самые выраженные. Всё берётся из заключения, ничего не считается заново.
 */

export type GlanceTone = 'green' | 'yellow' | 'orange' | 'red' | 'darkred' | 'accent';

export interface GlanceRow {
  code: string;
  name: string;
  score: number;
  max: number;
  /** Цвет уровня; accent — у шкалы без диапазонов */
  tone: GlanceTone;
  /** Короткая подпись уровня («Выше нормы») и полная («Лёгкая депрессия»); пустые у шкалы без диапазонов */
  legend: string;
  chip: string;
  /** Границы уровней долями шкалы (0…1), без нуля */
  marks: number[];
}

export interface Glance {
  /** У теста одна шкала: показывается крупно, с полосой */
  single: boolean;
  rows: GlanceRow[];
  /** Сколько шкал с диапазонами не поместилось в итог */
  more: number;
}

/** Тяжесть цвета уровня: чем выше, тем раньше шкала в итоге */
const RANK: Record<GlanceTone, number> = { green: 0, yellow: 1, orange: 2, red: 3, darkred: 4, accent: -1 };

/** Число для показа: десятичная запятая и до двух знаков («1,28»), целые без дроби */
export const scoreText = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');

const rowOf = (data: ConclusionData, scale: ConclusionScale): GlanceRow => {
  const base = { code: scale.code, name: scale.name, score: scale.score, max: scale.max };
  if (!scale.leveled) return { ...base, tone: 'accent', legend: '', chip: '', marks: [] };
  const level = levelOf(data, scale.score, scale);
  return {
    ...base,
    tone: level.tone,
    legend: level.legend,
    chip: level.chip,
    marks: levelsOf(data, scale)
      .filter((l) => l.from > 0)
      .map((l) => l.from / scale.max),
  };
};

/**
 * Итог результата. У нескольких шкал первыми идут самые выраженные (цвет уровня, затем основные шкалы раньше дополнительных,
 * затем доля от максимума); шкалы без диапазонов в итог не берутся, если есть хоть одна с диапазонами.
 */
export function resultGlance(data: ConclusionData, limit = 3): Glance {
  if (data.scales.length === 1) return { single: true, rows: [rowOf(data, data.scales[0])], more: 0 };
  const leveled = data.scales.filter((s) => s.leveled);
  const pool = leveled.length ? leveled : data.scales.filter((s) => s.group === 'main');
  const ranked = pool
    .map((scale) => ({ scale, row: rowOf(data, scale) }))
    .sort(
      (a, b) =>
        RANK[b.row.tone] - RANK[a.row.tone] ||
        Number(b.scale.group === 'main') - Number(a.scale.group === 'main') ||
        b.row.score / b.row.max - a.row.score / a.row.max,
    );
  return { single: false, rows: ranked.slice(0, limit).map((x) => x.row), more: Math.max(0, ranked.length - limit) };
}
