// Проверка сетки 4. Два правила для всех .css в src:
//   1. В margin, padding, gap и смещениях (top, right, bottom, left, inset) нельзя писать «голые» пиксели: только токены
//      (var(--space-*), var(--size-*), токены раскладки из styles/layout.css).
//   2. В размерах (width, height, min-/max-…, flex-basis), высоте строки и скруглениях пиксели кратны 4; линии в 1 и 0,5 px и «пилюля» 999 px не в счёт.
// Осознанное исключение (линия, оптическая поправка, часть значка) пишут в той же строке комментарием с пояснением: /* grid:ok — причина */.
// Без пояснения проверка падает: списка прежних нарушений больше нет, он обнулён.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const SPACING = /(?<![\w-])(margin|padding|gap|row-gap|column-gap|top|right|bottom|left|inset)(-top|-right|-bottom|-left|-inline|-block)?(-start|-end)?\s*:\s*([^;}]+)(;|(?=}))[ \t]*(\/\*[^]*?\*\/)?/g;
const SIZING = /(?<![\w-])(width|height|min-width|min-height|max-width|max-height|flex-basis|line-height|border-radius|border-top-left-radius|border-top-right-radius|border-bottom-left-radius|border-bottom-right-radius)\s*:\s*([^;}]+)(;|(?=}))[ \t]*(\/\*[^]*?\*\/)?/g;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.css')) files.push(path);
  }
})(ROOT);

const PX = /(?<![\w.-])(-?\d+(?:\.\d+)?)px/g;
// Запасное значение в var(--токен, 12px) на раскладку не влияет: токен всегда задан
const withoutFallbacks = (value) => value.replace(/var\(\s*--[\w-]+\s*,[^()]*\)/g, 'var()');
const bad = [];
for (const file of files.sort()) {
  const css = readFileSync(file, 'utf8');
  // Комментарии, кроме того, что стоит сразу после объявления, для разбора не нужны: заменяем их пробелами той же длины (номера строк не плывут)
  const blank = (c) => c.replace(/[^\n]/g, ' ');
  const keepMarks = css
    .replace(/\/\*[^]*?\*\//g, (c) => (/grid:ok/.test(c) ? c : blank(c)))
    // Условия медиазапроса (max-width: 359px) — не размеры элемента
    .replace(/@(media|container|supports)[^{]*\{/g, blank);
  const lineOf = (index) => keepMarks.slice(0, index).split('\n').length;

  for (const m of keepMarks.matchAll(SPACING)) {
    if (m[6] && /grid:ok/.test(m[6])) continue;
    for (const px of withoutFallbacks(m[4]).matchAll(PX)) {
      if (Number(px[1]) === 0) continue;
      bad.push(`${file}:${lineOf(m.index)}  ${m[1]}${m[2] ?? ''}${m[3] ?? ''}: ${m[4].trim()}   (отступ в пикселях: нужен токен)`);
      break;
    }
  }
  for (const m of keepMarks.matchAll(SIZING)) {
    if (m[4] && /grid:ok/.test(m[4])) continue;
    for (const px of withoutFallbacks(m[2]).matchAll(PX)) {
      const v = Number(px[1]);
      if (v === 0 || v === 1 || v === 0.5 || v >= 999 || v % 4 === 0) continue;
      bad.push(`${file}:${lineOf(m.index)}  ${m[1]}: ${m[2].trim()}   (размер вне сетки 4)`);
      break;
    }
  }
}

if (bad.length) {
  console.error('Сетка 4 нарушена. Вместо пикселей берите токены (var(--space-*), --card-pad, --block-gap, --page-gutter),');
  console.error('размеры, высоты строк и скругления — кратные 4. Осознанное исключение: /* grid:ok — причина */ в той же строке.');
  for (const line of bad) console.error('  ' + line);
  console.error(`Нарушений: ${bad.length}`);
  process.exit(1);
}
console.log(`Сетка 4 соблюдена: ${files.length} файлов, нарушений нет.`);
