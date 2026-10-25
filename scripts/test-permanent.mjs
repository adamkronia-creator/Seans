// Проверка постоянных заданий: правила назначения, записи клиента в журнале и то, как они попадают во вкладку «Задания»,
// «Историю» и «События»: npm run test:permanent
// Журнал и тексты не зависят от React-компонентов, поэтому собираются esbuild и запускаются в Node как есть.
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
    contents: `
      export * from './src/data/taskValues';
      export * from './src/data/resultLinks';
      export * from './src/data/clientStore';
      export { findClientTaskResult } from './src/data/clientTaskResults';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.css': 'empty' },
  logLevel: 'error',
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-permanent-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);
const lib = await import(pathToFileURL(file).href);
fs.rmSync(dir, { recursive: true, force: true });

const { limitText, recordsText, permanentNote, PERMANENT_LIMITS, recordRef, clientResultId, clientResultPath } = lib;
const { itemsWithStatus, readClientData, logStep, historyEvents, appEvents, findClientTaskResult } = lib;

const tasksBy = (status) => itemsWithStatus(readClientData(), 'task').filter((t) => t.status === status);

test('тексты правил: «Всего записей» и счётчик записей', () => {
  assert.equal(limitText(), 'Без лимита');
  assert.equal(limitText(0), 'Без лимита');
  assert.deepEqual([1, 3, 5, 10, 11, 21].map((n) => limitText(n)), ['1 запись', '3 записи', '5 записей', '10 записей', '11 записей', '21 запись']);
  assert.equal(recordsText(2, 10), 'Записей: 2 из 10');
  assert.equal(recordsText(2), 'Записей: 2');
  assert.equal(permanentNote({ limit: 10 }), 'Задание постоянное: выполняйте его снова, когда это нужно. Всего записей: 10.');
  assert.equal(permanentNote({}), 'Задание постоянное: выполняйте его снова, когда это нужно.');
  assert.equal(PERMANENT_LIMITS[0], 0, 'первый вариант — без лимита');
  assert.deepEqual([...PERMANENT_LIMITS].slice(1), [...PERMANENT_LIMITS].slice(1).sort((a, b) => a - b), 'варианты по возрастанию');
});

test('номер результата записи: «<чат>-<задание>-r<N>» и адрес экрана', () => {
  assert.equal(recordRef('smer', 2), 'smer-r2');
  assert.equal(clientResultId('maxim', recordRef('smer', 2)), 'maxim-smer-r2');
  assert.equal(clientResultPath('maxim', recordRef('smer', 2)), '/chat/maxim/result/maxim-smer-r2');
});

test('у Максима дневник СМЭР постоянный: в «Постоянных» с числом записей, записи — среди завершённых', () => {
  const permanent = tasksBy('permanent');
  // «Назначенное» задание (Поиск доказательств) стоит там же: назначенное и постоянное — одно и то же
  assert.deepEqual(permanent.map((t) => [t.id, t.description]), [['evidence', 'Для мыслей автоматического характера'], ['smer', 'Записей: 2 из 10']]);
  const done = tasksBy('done');
  // Новые сверху: запись 2, запись 1, затем прежние задания
  assert.deepEqual(done.slice(0, 2).map((t) => [t.id, t.description]), [['smer-r2', 'Запись 2'], ['smer-r1', 'Запись 1']]);
  assert.ok(done.slice(2).every((t) => !/^smer/.test(t.id)), 'после записей — прежние задания');
  // По карточке записи открывается её результат
  for (const t of done.slice(0, 2)) {
    const result = findClientTaskResult(clientResultId('maxim', t.id));
    assert.ok(result, `${t.id}: результат есть`);
    assert.equal(result.taskId, 'smer');
    assert.equal(result.record, Number(t.id.slice(-1)));
  }
  // Раздела «Назначенные» нет, остался «Отправленные»
  assert.deepEqual(tasksBy('assigned').map((t) => t.id), []);
  assert.deepEqual(tasksBy('sent').map((t) => t.id), ['pie']);
});

test('новая отправка постоянного задания: «Записей: 0 из N», прежнее выполнение уходит из завершённых', () => {
  assert.ok(tasksBy('done').some((t) => t.id === 'secret'), 'до отправки «Если никто не узнает» завершено');
  logStep('task', 'secret', 'sent', { permanent: { limit: 2 } });
  assert.deepEqual(tasksBy('permanent').filter((t) => t.id !== 'evidence').map((t) => [t.id, t.description]), [['secret', 'Записей: 0 из 2'], ['smer', 'Записей: 2 из 10']]);
  assert.ok(!tasksBy('done').some((t) => t.id === 'secret'), 'теперь оно постоянное, а не завершённое');
});

test('записи клиента: счётчик растёт, при наборе лимита карточка уходит из «Постоянных», записи остаются', () => {
  logStep('task', 'secret', 'done', { record: 1 });
  assert.equal(tasksBy('permanent').find((t) => t.id === 'secret').description, 'Записей: 1 из 2');
  logStep('task', 'secret', 'done', { record: 2 });
  assert.ok(!tasksBy('permanent').some((t) => t.id === 'secret'), 'лимит набран');
  assert.deepEqual(tasksBy('done').filter((t) => /^secret/.test(t.id)).map((t) => t.id), ['secret-r2', 'secret-r1']);
  // Постоянное без лимита остаётся в «Постоянных» сколько бы записей ни было
  logStep('task', 'worry', 'sent', { permanent: {} });
  for (let n = 1; n <= 4; n++) logStep('task', 'worry', 'done', { record: n });
  assert.equal(tasksBy('permanent').find((t) => t.id === 'worry').description, 'Записей: 4');
});

test('история и события: запись называется записью и ведёт к своему результату', () => {
  const events = historyEvents(readClientData()).filter((e) => e.kind === 'task' && e.ref === 'smer');
  assert.deepEqual(events.map((e) => e.text), [
    'Вы отправили постоянное психологическое задание «Дневник СМЭР» (всего записей: 10)',
    'Максим добавил запись 1 в психологическое задание «Дневник СМЭР»',
    'Максим добавил запись 2 в психологическое задание «Дневник СМЭР»',
  ]);
  assert.deepEqual(events.map((e) => e.record), [undefined, 1, 2]);
  const app = appEvents(readClientData()).filter((e) => /СМЭР/.test(e.text));
  assert.deepEqual(app.map((e) => [e.text, e.href]), [
    ['Добавил запись 2 в задание «Дневник СМЭР»', '/chat/maxim/result/maxim-smer-r2'],
    ['Добавил запись 1 в задание «Дневник СМЭР»', '/chat/maxim/result/maxim-smer-r1'],
  ]);
});
