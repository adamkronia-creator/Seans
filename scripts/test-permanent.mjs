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
      export { findClientResult } from './src/data/clientResults';
      export * from './src/data/waiting';
      export * from './src/data/resultGlance';
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

test('сколько ждёт ответа: сегодня, день, дня, дней; будущая и неверная даты — сегодня', () => {
  const { waitingText } = lib;
  const at = (m, d) => new Date(2026, m - 1, d, 15, 30);
  assert.equal(waitingText('09.10.2026', at(10, 9)), 'Сегодня');
  assert.deepEqual(
    [[10, 10], [10, 13], [10, 14], [10, 30], [11, 2]].map(([m, d]) => waitingText('09.10.2026', at(m, d))),
    ['1 день', '4 дня', '5 дней', '21 день', '24 дня'],
  );
  assert.equal(waitingText('09.10.2026', at(10, 1)), 'Сегодня');
  assert.equal(waitingText('не дата', at(10, 20)), 'Сегодня');
});

test('карточки чата клиента: у отправленного есть дата и время, у постоянного — число записей, последняя и дата назначения', () => {
  const data = readClientData();
  const sent = itemsWithStatus(data, 'task').find((t) => t.id === 'pie');
  assert.equal(sent.fullDate, '09.10.2026');
  assert.equal(sent.time, '09:40');
  const smer = tasksBy('permanent').find((t) => t.id === 'smer');
  assert.deepEqual(smer.records, { count: 2, last: '07.10.2026', since: '05.10.2026' });
  const record = tasksBy('done').find((t) => t.id === 'smer-r2');
  assert.equal(record.fullDate, '07.10.2026');
});

test('итог результата в карточке: у одной шкалы — её балл и уровень, у многих — самые выраженные', () => {
  const { resultGlance, findClientResult, scoreText } = lib;
  const glance = (id) => resultGlance(findClientResult(`maxim-${id}`).data);
  const phq = glance('phq9');
  assert.ok(phq.single);
  assert.deepEqual([phq.rows[0].score, phq.rows[0].max, phq.rows[0].tone, phq.rows[0].legend], [8, 27, 'yellow', 'Легкая']);
  assert.equal(phq.rows[0].chip, 'Легкая депрессия');
  assert.ok(phq.rows[0].marks.every((m) => m > 0 && m < 1));
  assert.deepEqual([glance('gad7').rows[0].tone, glance('rses').rows[0].tone], ['orange', 'green']);
  // SCL-90: сначала красные основные (по доле от максимума), затем красные дополнительные
  const scl = glance('scl90');
  assert.ok(!scl.single);
  assert.deepEqual(scl.rows.map((r) => r.code), ['PST', 'GSI', 'МС']);
  assert.equal(scl.more, 9);
  // 5PFQ: в итог идут только шкалы с диапазонами, дополнительные без диапазонов не берутся
  const pfq = glance('5pfq');
  assert.deepEqual(pfq.rows.map((r) => r.tone), ['red', 'red', 'red']);
  assert.equal(pfq.more, 2);
  assert.equal(scoreText(1.28), '1,28');
  assert.equal(scoreText(66), '66');
});

test('снять постоянное и удалить: задание уходит в «Отправленные», удаление убирает карточку, у записи — только её', () => {
  const { cancelPermanent, deleteItems } = lib;
  assert.ok(tasksBy('permanent').some((t) => t.id === 'smer'));
  cancelPermanent(['smer', 'evidence']);
  assert.ok(!tasksBy('permanent').some((t) => t.id === 'smer' || t.id === 'evidence'));
  assert.ok(tasksBy('sent').some((t) => t.id === 'smer') && tasksBy('sent').some((t) => t.id === 'evidence'));
  // Записи остаются завершёнными
  assert.ok(tasksBy('done').some((t) => t.id === 'smer-r1'));
  deleteItems('task', ['evidence', 'smer-r1']);
  assert.ok(!tasksBy('sent').some((t) => t.id === 'evidence'));
  assert.ok(!tasksBy('done').some((t) => t.id === 'smer-r1') && tasksBy('done').some((t) => t.id === 'smer-r2'));
  deleteItems('test', ['itt']);
  assert.ok(!itemsWithStatus(readClientData(), 'test').some((t) => t.id === 'itt'));
});
