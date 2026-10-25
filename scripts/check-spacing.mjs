// Проверка отступов: в margin, padding, gap и смещениях (top, right, bottom, left, inset) нельзя писать «голые» пиксели — только токены сетки 4
// (var(--space-*), var(--size-*), токены раскладки из styles/layout.css). Уже имеющиеся исключения записаны в scripts/spacing-baseline.json
// и не растут: новое «голое» значение ломает проверку. Когда исключение исправили, запись убирают: `node scripts/check-spacing.mjs --update`.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const BASELINE = 'scripts/spacing-baseline.json';
const PROPS = /(?<![\w-])(margin|padding|gap|row-gap|column-gap|top|right|bottom|left|inset)(-top|-right|-bottom|-left|-inline|-block)?\s*:\s*([^;}]+)/g;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.css')) files.push(path);
  }
})(ROOT);

/** Найденные «голые» значения: ключ «файл | свойство | значение» → сколько раз */
const found = {};
for (const file of files.sort()) {
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(PROPS)) {
    const value = m[3];
    for (const px of value.matchAll(/(?<![\w.-])(-?\d+(?:\.\d+)?)px/g)) {
      if (Number(px[1]) === 0) continue;
      const key = `${file} | ${m[1]}${m[2] ?? ''} | ${px[1]}px`;
      found[key] = (found[key] ?? 0) + 1;
    }
  }
}

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(found, Object.keys(found).sort(), 1) + '\n');
  console.log(`Записано исключений: ${Object.keys(found).length}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const bad = Object.entries(found).filter(([key, n]) => n > (baseline[key] ?? 0));
const fixed = Object.keys(baseline).filter((key) => (found[key] ?? 0) < baseline[key]);
if (fixed.length) console.log(`Исправлено исключений: ${fixed.length}. Обновите список: node scripts/check-spacing.mjs --update`);
if (bad.length) {
  console.error('Отступы не по сетке: вместо пикселей берите токены (var(--space-*), --card-pad, --block-gap, --page-gutter).');
  for (const [key, n] of bad) console.error(`  ${key} ×${n}`);
  process.exit(1);
}
console.log(`Отступы по сетке: новых «голых» значений нет (в списке исключений ${Object.keys(baseline).length}).`);
