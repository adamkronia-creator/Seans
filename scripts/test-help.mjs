// Проверка подсказок к настройкам теста и задания («?» у «Слепого тестирования», «Сохранить заполненный бланк», «Комментарий клиента», «Оценить состояние»): npm run test:help
// Данные не зависят от React, поэтому собираются esbuild и запускаются в Node как есть. Сами макеты собираются в приложении из выбранного теста (HelpScenes.tsx).
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
const { OPTION_HELP, HELP_SHOT } = await import(pathToFileURL(file).href);
fs.rmSync(dir, { recursive: true, force: true });

const topics = Object.entries(OPTION_HELP);

const SCENES = ['blind-off', 'blind-on', 'blind-chat', 'blank-off', 'blank-on', 'blank-view', 'result-thanks', 'result-score', 'result-full', 'task-off', 'comment-on', 'comment-result', 'state-on', 'state-result'];
// Макет задания «до включения» один на «Комментарий клиента» и «Оценить состояние»: у обеих подсказок первый кадр — задание без этой настройки
const SHARED = ['task-off'];

test('у каждой подсказки три макета с подписями', () => {
  assert.deepEqual(Object.keys(OPTION_HELP).sort(), ['blank', 'blind', 'comment', 'result', 'state']);
  for (const [id, help] of topics) {
    assert.ok(help.title.length > 0, `${id}: нет названия окна`);
    assert.equal(help.slides.length, 3, `${id}: должно быть три слайда`);
    for (const slide of help.slides) {
      assert.ok(slide.alt.length > 10, `${id}: у слайда нет описания для экранных читалок`);
      assert.ok(slide.title.length > 0 && slide.title.length <= 28, `${id}: заголовок «${slide.title}» пустой или длиннее 28 знаков`);
      assert.ok(slide.text.length > 0 && slide.text.length <= 200, `${id}: подпись «${slide.title}» пустая или длиннее 200 знаков`);
    }
  }
});

test('макеты известны и не повторяются; размер кадра 393×480', () => {
  const seen = new Set();
  for (const [id, help] of topics) {
    for (const slide of help.slides) {
      assert.ok(SCENES.includes(slide.scene), `${id}: неизвестный макет ${slide.scene}`);
      assert.ok(SHARED.includes(slide.scene) || !seen.has(slide.scene), `${id}: макет ${slide.scene} повторяется`);
      seen.add(slide.scene);
    }
  }
  assert.deepEqual(HELP_SHOT, { width: 393, height: 480 });
});
