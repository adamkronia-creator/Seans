// Проверка поиска, фильтров и отметок («Избранное», «Недавние») в библиотеке тестов и заданий: npm run test:library
// Движок не зависит от React, поэтому собирается esbuild и запускается в Node как есть.
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
      export * from './src/utils/ruText';
      export * from './src/utils/searchIndex';
      export * from './src/data/library';
      export * from './src/data/libraryMeta';
      export * from './src/data/libraryQuery';
      export { TASKS } from './src/data/taskContent';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl' },
  logLevel: 'error',
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-library-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);
const lib = await import(pathToFileURL(file).href);
fs.rmSync(dir, { recursive: true, force: true });

const { stem, normalize, indexWords, editDistance, swapLayout } = lib;
const { LIBRARY, TASK_LIBRARY, TASKS, TASK_META, parseAge, describe, catalogOf, listIds, markedScope, NO_MARKS, facetCounts, relaxations, quickPicks, EMPTY_FILTERS, NONE, countFilters, createIndex, FIELDS } = lib;

const tests = catalogOf('test', LIBRARY);
const tasks = catalogOf('task', TASK_LIBRARY);
const allTests = tests.entries.map((e) => e.item.id);
const allTasks = tasks.entries.map((e) => e.item.id);
const noFav = new Set();
const view = (query = '', filters = EMPTY_FILTERS, sort = 'auto') => ({ query, filters, sort });
const ids = (catalog, scope, q) => listIds(catalog, q, scope, noFav).ids;
const findTests = (query, filters, sort) => ids(tests, allTests, view(query, filters, sort));
const findTasks = (query, filters, sort) => ids(tasks, allTasks, view(query, filters, sort));

test('основа слова: формы одного слова сходятся', () => {
  const same = [
    ['тревожность', 'тревожности', 'тревожный', 'тревожные', 'тревожного'],
    ['депрессия', 'депрессии'],
    ['депрессивный', 'депрессивного', 'депрессивное', 'депрессивных'],
    ['мысли', 'мыслей'],
    ['вина', 'вины'],
    ['оценка', 'оценки'],
  ];
  for (const group of same) assert.equal(new Set(group.map(stem)).size, 1, group.join(', '));
  assert.notEqual(stem('тест'), stem('шкала'));
  assert.equal(stem('phq9'), 'phq9');
  assert.equal(stem('90'), '90');
});

test('слова: ё, дефисы, названия методик слитно и раздельно', () => {
  assert.equal(normalize('Ёжик — Леонгарда-Шмишека (SQ)'), 'ежик леонгарда шмишека sq');
  for (const w of ['phq', '9', 'phq9']) assert.ok(indexWords('PHQ-9').includes(w), w);
  for (const w of ['5pfq', '5', 'pfq']) assert.ok(indexWords('5PFQ').includes(w), w);
  assert.equal(editDistance('тревожнсть', 'тревожность', 2), 1);
  assert.equal(editDistance('тервога', 'тревога', 2), 1);
  assert.equal(editDistance('abc', 'xyz', 2), 3);
  assert.equal(swapLayout('nhtdj;yjcnm'), 'тревожность');
});

test('поиск: слова в любой форме, сокращения, названия методик', () => {
  assert.equal(findTests('СМОЛ')[0], 'smol');
  assert.deepEqual(findTests('phq9'), ['phq9']);
  assert.deepEqual(findTests('phq 9'), ['phq9']);
  assert.deepEqual(findTests('phq-9'), ['phq9']);
  assert.deepEqual(findTests('scl 90'), ['scl90']);
  assert.deepEqual(findTests('90'), ['scl90']);
  assert.deepEqual(findTests('9'), ['phq9']);
  assert.deepEqual(findTests('5pfq'), ['5pfq']);
  assert.deepEqual(findTests('розенберг'), ['rses']);
  assert.deepEqual(new Set(findTests('бека')), new Set(['bhs', 'bdi']));
  assert.equal(findTests('депрессии')[0], 'bdi');
  assert.ok(findTests('mmpi').includes('smol'));
  assert.deepEqual(findTests('ипохондрия'), ['smol']);
});

test('поиск: начало слова, пока человек печатает', () => {
  assert.ok(findTests('трев').includes('itt'));
  assert.ok(findTests('депр').includes('bdi'));
  assert.deepEqual(new Set(findTests('ит')), new Set(['itt', 'ito']));
  assert.deepEqual(findTests('суицидал').slice(0, 1), ['ocr']);
});

test('поиск: по смыслу', () => {
  for (const word of ['грусть', 'уныние', 'подавленность', 'апатия']) {
    const found = findTests(word);
    assert.ok(found.includes('bdi') && found.includes('phq9'), word);
  }
  for (const word of ['страх', 'паника', 'волнение']) {
    const found = findTests(word);
    assert.ok(found.includes('itt') && found.includes('gad7'), word);
  }
  assert.ok(findTests('самоубийство').includes('ocr'));
  assert.ok(findTasks('грусть').includes('activation'));
  assert.ok(findTasks('детство').includes('phrase'));
  // Понятие «вина» не цепляет «ответственность» из названия терапии принятия
  assert.ok(!findTasks('вина').includes('choice'));
});

test('поиск: опечатки и неверная раскладка — только если иначе пусто', () => {
  assert.ok(tests.index.search('тревожнсть').hits.has('itt'));
  const r = tests.index.search('тервога');
  assert.ok(r && r.hits.has('gad7') && r.fixes.length === 1, 'перестановка букв');
  assert.deepEqual(r.fixes[0], { from: 'тервога', to: 'тревога' });
  const layout = tests.index.search('nhtdj;yjcnm');
  assert.ok(layout && layout.hits.has('itt'));
  assert.deepEqual(layout.fixes[0], { from: 'nhtdj;yjcnm', to: 'тревожность' });
  // Точное слово поправок не требует
  assert.equal(tests.index.search('тревожность').fixes.length, 0);
  assert.equal(findTests('xyzzyq').length, 0);
});

test('поиск: все слова должны найтись, иначе частично', () => {
  const full = tasks.index.search('тревога дневник');
  assert.equal(full.partial, false);
  assert.deepEqual(full.order, ['worry']);
  const partial = tests.index.search('самооценка суицид');
  assert.equal(partial.partial, true);
  assert.ok(partial.order.includes('rses') && partial.order.includes('ocr'));
});

test('поиск: служебные слова не мешают, но запрос из одних них ищется как есть', () => {
  assert.deepEqual(findTests('тест для тревоги'), findTests('тревоги'));
  assert.deepEqual(findTests('опросник депрессия'), findTests('депрессия'));
  assert.ok(findTests('тест').length > 0);
});

test('поиск: пояснение, где нашлось', () => {
  const hit = tests.index.search('ипохондрия').hits.get('smol');
  assert.equal(hit.visible, false);
  assert.equal(hit.fieldLabel, 'Шкала');
  assert.match(hit.text, /Ипохондрия/);
  assert.equal(tests.index.search('грусть').hits.get('bdi').via, 'Депрессия');
  assert.equal(tests.index.search('СМОЛ').hits.get('smol').visible, true);
});

test('фильтры: «или» внутри, «и» между, «Не указано»', () => {
  const f = (obj) => obj;
  assert.deepEqual(new Set(findTests('', f({ domain: ['depression'] }))), new Set(['bdi', 'phq9', 'bhs']));
  assert.deepEqual(new Set(findTests('', f({ domain: ['depression', 'anxiety'] }))), new Set(['bdi', 'phq9', 'bhs', 'itt', 'gad7']));
  assert.deepEqual(new Set(findTests('', f({ domain: ['depression'], time: ['fast'] }))), new Set(['bdi', 'phq9', 'bhs']));
  assert.deepEqual(findTests('', f({ domain: ['depression'], result: ['profile'] })), []);
  assert.deepEqual(new Set(findTests('', f({ age: [NONE] }))), new Set());
  assert.deepEqual(new Set(findTests('', f({ age: ['14'] }))), new Set(['5pfq', 'scl90', 'gad7', 'rses']));
  // Запрос и фильтры вместе
  assert.deepEqual(findTests('тревога', f({ time: ['fast'] })).sort(), ['gad7', 'itt']);
});

test('фильтры: пункты строятся из данных, лишние фильтры скрыты', () => {
  const t = Object.fromEntries(tests.facets.map((x) => [x.id, x.options.map((o) => o.id)]));
  assert.deepEqual(t.age, ['14', '16']);
  // «Не указано» появляется, только если есть тест без этого сведения (у всех сведения теперь есть)
  assert.ok(!t.time.includes(NONE));
  assert.ok(!t.domain.includes(NONE));
  const k = Object.fromEntries(tasks.facets.map((x) => [x.id, x.options.map((o) => o.id)]));
  // У всех заданий один возраст — такой фильтр ничего не различает и не показывается
  assert.ok(!('age' in k));
  assert.deepEqual(k.approach, ['cbt', 'act', 'schema', 'psychodynamic']);
});

test('счётчики фильтров совпадают с выдачей', () => {
  for (const [catalog, all] of [[tests, allTests], [tasks, allTasks]]) {
    for (const query of ['', 'тревога', 'депрессия', 'мысли']) {
      for (const filters of [EMPTY_FILTERS, { domain: [catalog.facets[0].options[0].id] }, { time: ['mid'] }]) {
        const counts = facetCounts(catalog, view(query, filters), all);
        for (const facet of catalog.facets) {
          for (const option of facet.options) {
            // Если выбрать пункт (заменив прочие в его фильтре, но оставив другие фильтры), столько и будет
            const base = { ...filters };
            const selected = new Set(base[facet.id] ?? []);
            const withOption = { ...base, [facet.id]: [...selected, option.id] };
            const expected = ids(catalog, all, view(query, withOption)).length;
            const alone = { ...base, [facet.id]: [option.id] };
            const only = ids(catalog, all, view(query, alone)).length;
            // Счётчик — число материалов с этим пунктом при остальных фильтрах
            assert.equal(counts[facet.id][option.id], only, `${query}|${facet.id}|${option.id}`);
            assert.ok(expected >= only);
          }
        }
      }
    }
  }
});

test('сортировка', () => {
  const alpha = findTests('', EMPTY_FILTERS, 'alpha');
  const titles = alpha.map((id) => tests.byId.get(id).item.title);
  assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b, 'ru')));
  const short = findTests('', EMPTY_FILTERS, 'short');
  assert.equal(short.length, 12);
  // Без сведений о времени тест шёл бы в конец; сейчас сведения есть у всех тестов
  const maxes = short.map((id) => tests.byId.get(id).d.minutes[1]);
  assert.deepEqual(maxes, [...maxes].sort((a, b) => a - b));
  const long = findTests('', EMPTY_FILTERS, 'long');
  assert.deepEqual(long.map((id) => tests.byId.get(id).d.minutes[1]), maxes.slice().sort((a, b) => b - a));
  const fav = new Set(['phq9', 'sq']);
  assert.deepEqual(listIds(tests, view('', EMPTY_FILTERS, 'favorite'), allTests, fav).ids.slice(0, 2).sort(), ['phq9', 'sq']);
  // Без выбора порядка: найденное по убыванию совпадения
  assert.equal(findTests('бека', EMPTY_FILTERS, 'auto').length, 2);
});

test('раздел: запрос и фильтры действуют внутри раздела', () => {
  const favorites = ['smol', 'itt', 'bdi'];
  assert.deepEqual(ids(tests, favorites, view('тревога')), ['itt']);
  assert.deepEqual(ids(tests, favorites, view('', { domain: ['depression'] })), ['bdi']);
  const recent = ['bdi', 'itt', 'smol'];
  assert.deepEqual(ids(tests, recent, view('')), recent, 'порядок раздела сохраняется');
});

test('пустая выдача подсказывает, что убрать', () => {
  const v = view('тревога', { time: ['long'], result: ['score'] });
  assert.deepEqual(ids(tests, allTests, v), []);
  const everywhere = { scope: allTests, everything: allTests, marks: NO_MARKS, favorites: noFav, recent: [] };
  const r = relaxations(tests, v, everywhere);
  assert.ok(r.some((x) => x.type === 'option' && x.count > 0));
  assert.ok(r.some((x) => x.type === 'filters'));
  assert.ok(r.every((x) => x.count > 0));
  const scoped = relaxations(tests, view('тревога'), { ...everywhere, scope: ['bdi'] });
  assert.ok(scoped.some((x) => x.type === 'scope' && x.count > 0));
  const picks = quickPicks(tests, 4);
  assert.equal(picks.length, 4);
  assert.ok(picks.every((p) => p.count > 0));
});

test('отметки: «Избранное» и «Недавние» сужают раздел вместе', () => {
  const fav = new Set(['smol', 'itt', 'bdi', 'phq9']);
  const recent = ['bdi', 'gad7', 'smol', 'itt'];
  const scope = (marks, base = allTests) => markedScope(base, marks, fav, recent);
  assert.deepEqual(scope(NO_MARKS), allTests, 'без отметок раздел как есть');
  assert.deepEqual(scope({ favorites: true, recent: false }), allTests.filter((id) => fav.has(id)), 'избранное — в порядке раздела');
  assert.deepEqual(scope({ favorites: false, recent: true }), recent, 'недавние — от самых свежих');
  assert.deepEqual(scope({ favorites: true, recent: true }), ['bdi', 'smol', 'itt'], 'обе отметки — то, что в обоих списках, от самых свежих');
  assert.deepEqual(scope({ favorites: false, recent: true }, ['smol', 'sq']), ['smol'], 'в категории — только то, что в ней есть');
  // Запрос и фильтры действуют внутри отмеченного
  assert.deepEqual(ids(tests, scope({ favorites: true, recent: false }), view('тревога')), ['itt']);
  assert.deepEqual(ids(tests, scope({ favorites: false, recent: true }), view('')), recent, 'порядок недавних сохраняется');
});

test('пустая выдача из-за отметок предлагает их выключить', () => {
  const favorites = new Set(['smol']);
  const marks = { favorites: true, recent: false };
  const ctx = { scope: allTests, everything: allTests, marks, favorites, recent: [] };
  const v = view('тревога');
  assert.deepEqual(listIds(tests, v, markedScope(allTests, marks, favorites, []), favorites).ids, []);
  const r = relaxations(tests, v, ctx);
  const mark = r.find((x) => x.type === 'mark');
  assert.ok(mark && mark.mark === 'favorites' && mark.count > 0, 'есть подсказка «не только избранное»');
  assert.ok(r.every((x) => x.count > 0));
  // Обе отметки: подсказки по каждой отдельно
  const both = relaxations(tests, v, { ...ctx, marks: { favorites: true, recent: true }, favorites: new Set(['smol', 'gad7']), recent: ['smol', 'itt'] });
  assert.deepEqual(both.filter((x) => x.type === 'mark').map((x) => x.mark).sort(), ['favorites', 'recent']);
});

test('сведения о тестах: у каждого есть область и другие названия', () => {
  for (const entry of tests.entries) {
    assert.ok(entry.d.facets.domain.length > 0, `${entry.item.id}: нет области`);
    assert.ok(entry.d.aliases.length > 0, `${entry.item.id}: нет других названий`);
  }
  const smol = tests.byId.get('smol').d;
  assert.deepEqual(smol.line, [], 'в карточке теста вопросов, времени и возраста нет');
  assert.deepEqual(smol.minutes, [15, 20]);
  assert.deepEqual(smol.facets.age, ['16']);
  assert.deepEqual(tests.byId.get('gad7').d.facets.age, ['14']);
});

test('сведения о заданиях совпадают с настройками заданий (taskContent)', () => {
  const approachOf = { КПТ: 'cbt', ACT: 'act', 'Схема-терапия': 'schema', 'Психодинамический подход': 'psychodynamic' };
  assert.equal(Object.keys(TASKS).length, TASK_LIBRARY.length);
  for (const item of TASK_LIBRARY) {
    const t = TASKS[item.id];
    const d = describe('task', item);
    const where = item.id;
    const meta = TASK_META[item.id];
    assert.ok(meta, `${where}: нет записи в TASK_META`);
    assert.equal(meta.duration, t.duration, `${where}: время`);
    assert.equal(meta.ageFrom, parseAge(t.age), `${where}: возраст`);
    const value = Number(t.volume.value);
    const approaches = [...new Set(t.approaches.map((f) => approachOf[f]).filter(Boolean))].sort();
    assert.deepEqual([...d.facets.approach].sort(), approaches, `${where}: подход`);

    // Время: «на запись» умножается на типичное число записей
    const m = t.duration.match(/(\d+)(?:–(\d+))?/);
    const per = t.duration.includes(' на ') ? value : 1;
    assert.deepEqual(d.minutes, [Number(m[1]) * per, Number(m[2] ?? m[1]) * per], `${where}: минуты`);

    // Формат по полям бланка
    const kinds = new Set();
    const collect = (fields) => fields.forEach((f) => { kinds.add(f.kind); if (f.kind === 'entries') f.groups.forEach((g) => collect(g.fields)); });
    t.blank.sections(t.forms ? t.forms[0] : '').forEach((s) => collect(s.fields));
    const shape = kinds.has('entries') ? 'diary' : ['percent', 'factors', 'scale', 'list', 'choice'].some((k) => kinds.has(k)) ? 'steps' : 'short';
    assert.deepEqual(d.facets.shape, [shape], `${where}: формат`);

    // Строка в карточке: формат, подход, время — как напечатано в настройках; строка короткая и в одну строку на узком экране
    const shapeLabel = { diary: 'Дневник', steps: 'Пошаговое', short: 'Короткий ответ' }[shape];
    assert.deepEqual(d.line, [], `${where}: в карточке задания строки сведений нет`);
  }
});

test('большой каталог: индекс собирается и ищет быстро', () => {
  const words = [...new Set(LIBRARY.concat(TASK_LIBRARY).flatMap((i) => `${i.title} ${i.description}`.toLowerCase().split(/[^а-яa-z0-9]+/).filter((w) => w.length > 3)))];
  let seed = 7;
  const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n);
  const pick = (n) => Array.from({ length: n }, () => words[rnd(words.length)]).join(' ');
  const docs = Array.from({ length: 3000 }, (_, i) => ({
    id: `d${i}`,
    fields: { title: [pick(4)], description: [pick(6)], topic: [pick(2), pick(2)], scale: [pick(2)], alias: [pick(2)] },
    exact: [`d${i}`],
  }));
  const t0 = performance.now();
  const index = createIndex(docs, FIELDS, lib.CONCEPTS ?? []);
  const build = performance.now() - t0;
  const t1 = performance.now();
  const queries = ['тревога', 'депрессия опросник', 'личностные особенности', 'xyzq', 'оценк', 'шкала бека'];
  for (const q of queries) index.search(q);
  const search = (performance.now() - t1) / queries.length;
  console.log(`  3000 документов: индекс ${build.toFixed(0)} мс, запрос ${search.toFixed(1)} мс`);
  assert.ok(build < 3000, `индекс ${build} мс`);
  assert.ok(search < 150, `запрос ${search} мс`);
});
