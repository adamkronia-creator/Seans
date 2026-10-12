// Проверка подсказок к настройкам теста («?» у «Слепого тестирования» и «Сохранить заполненный бланк»): npm run test:help
// Данные не зависят от React, поэтому собираются esbuild и запускаются в Node как есть; картинки читаются прямо с диска.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const esbuild = require('esbuild');

const built = esbuild.buildSync({
  stdin: {
    contents: `export * from './src/data/optionHelp';`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  // Картинки подставляются именем файла: так видно, какой файл к какому слайду привязан
  loader: { '.webp': 'file', '.png': 'file', '.svg': 'file', '.jpg': 'file' },
  assetNames: '[name]',
  outdir: path.join(os.tmpdir(), 'seans-help-out'),
  logLevel: 'error',
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-help-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles.find((f) => f.path.endsWith('.js')).text);
const { OPTION_HELP, HELP_SHOT, hasOptionHelp } = await import(pathToFileURL(file).href);
fs.rmSync(dir, { recursive: true, force: true });

/** Размер WebP из заголовка файла (три вида: сжатие без потерь, с потерями и расширенный) */
function webpSize(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const kind = buffer.toString('ascii', 12, 16);
  if (kind === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  if (kind === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  throw new Error(`Неизвестный вид WebP: ${kind}`);
}

const topics = Object.entries(OPTION_HELP);

test('у каждой подсказки три скриншота с подписями', () => {
  assert.deepEqual(Object.keys(OPTION_HELP).sort(), ['blank', 'blind', 'result']);
  for (const [id, help] of topics) {
    assert.ok(help.title.length > 0, `${id}: нет названия окна`);
    assert.equal(help.slides.length, 3, `${id}: должно быть три скриншота`);
    for (const slide of help.slides) {
      assert.ok(slide.alt.length > 10, `${id}: у скриншота нет описания для экранных читалок`);
      assert.ok(slide.title.length > 0 && slide.title.length <= 28, `${id}: заголовок «${slide.title}» пустой или длиннее 28 знаков`);
      assert.ok(slide.text.length > 0 && slide.text.length <= 200, `${id}: подпись «${slide.title}» пустая или длиннее 200 знаков`);
    }
  }
});

test('скриншоты разные, одного размера и лежат на диске', () => {
  const seen = new Set();
  for (const [id, help] of topics) {
    for (const slide of help.slides) {
      assert.ok(!seen.has(slide.src), `${id}: скриншот ${slide.src} повторяется`);
      seen.add(slide.src);
      const file = path.join(root, 'src/assets/help', path.basename(slide.src));
      assert.ok(fs.existsSync(file), `${id}: нет файла ${file}`);
      const size = webpSize(fs.readFileSync(file));
      assert.deepEqual(size, { width: HELP_SHOT.width, height: HELP_SHOT.height }, `${id}: ${path.basename(file)} другого размера`);
      assert.ok(fs.statSync(file).size < 120 * 1024, `${id}: ${path.basename(file)} тяжелее 120 КБ`);
    }
  }
});

test('рамки лежат внутри скриншота', () => {
  for (const [id, help] of topics) {
    for (const { mark, title } of help.slides) {
      if (!mark) continue;
      for (const key of ['x', 'y', 'w', 'h']) assert.ok(Number.isFinite(mark[key]), `${id}/${title}: ${key} не число`);
      assert.ok(mark.x >= 0 && mark.y >= 0, `${id}/${title}: рамка выходит за левый или верхний край`);
      assert.ok(mark.w > 5 && mark.h > 3, `${id}/${title}: рамка слишком мала`);
      assert.ok(mark.x + mark.w <= 100 && mark.y + mark.h <= 100, `${id}/${title}: рамка выходит за правый или нижний край`);
    }
  }
});

test('новый вид особенностей включён только у СМОЛ', () => {
  assert.equal(hasOptionHelp('smol'), true);
  for (const id of ['bdi', 'itt', 'ito', '5pfq', 'scl90', 'sq']) assert.equal(hasOptionHelp(id), false, id);
});
