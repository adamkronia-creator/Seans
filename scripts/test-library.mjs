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
      export * from './src/utils/typography';
      export * from './src/utils/searchIndex';
      export * from './src/data/library';
      export * from './src/data/libraryMeta';
      export * from './src/data/libraryQuery';
      export { TASKS } from './src/data/taskContent';
      export { TEST_COVERS } from './src/data/testCovers';
      export { findClientResult } from './src/data/clientResults';
      export { readClientData, itemsWithStatus, historyEvents } from './src/data/clientStore';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.css': 'empty' },
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

// ——— Тексты заданий: единый стиль ———

/** Все строки задания, которые видит человек: описание, инструкции по всем формам, бланк, примеры, итоги */
function taskStrings(id, t) {
  const out = [];
  const add = (where, value) => {
    if (typeof value === 'string' && value !== '') out.push({ where: `${id}: ${where}`, text: value });
  };
  const addField = (where, f) => {
    for (const key of ['label', 'item', 'hint', 'placeholder', 'addLabel', 'namePlaceholder', 'ownLabel', 'low', 'high', 'title']) add(`${where} ${f.id ?? ''}.${key}`, f[key]);
    for (const key of ['options', 'starters']) (f[key] ?? []).forEach((v, i) => add(`${where} ${f.id}.${key}[${i}]`, v));
    for (const g of f.groups ?? []) {
      add(`${where} ${f.id} группа`, g.title);
      g.fields.forEach((inner) => addField(`${where} ${f.id}`, inner));
    }
  };
  const addValues = (where, v) => {
    Object.entries(v.text ?? {}).forEach(([k, text]) => add(`${where} text.${k}`, text));
    Object.entries(v.list ?? {}).forEach(([k, lines]) => lines.forEach((line, i) => add(`${where} list.${k}[${i}]`, line)));
    Object.entries(v.factors ?? {}).forEach(([k, list]) => list.forEach((f, i) => add(`${where} factors.${k}[${i}]`, f.name)));
    Object.entries(v.entries ?? {}).forEach(([k, list]) => list.forEach((e, i) => addValues(`${where} entries.${k}[${i}]`, e)));
    add(`${where} комментарий`, v.comment);
  };
  for (const key of ['lead', 'goal', 'formLabel', 'formHint']) add(key, t[key]);
  t.intro.split('\n').forEach((line, i) => add(`intro[${i}]`, line));
  t.analysis.split('\n').forEach((line, i) => add(`analysis[${i}]`, line));
  add('volume', t.volume.label);
  add('commentHint', t.blank.commentHint);
  t.blank.state.forEach((v, i) => add(`state[${i}]`, v));
  t.example.notes.forEach((v, i) => add(`notes[${i}]`, v));
  for (const form of t.forms ?? ['']) {
    t.blank.rules(form).forEach((v, i) => add(`rules(${form})[${i}]`, v));
    for (const s of t.blank.sections(form)) {
      add(`раздел ${s.id}.title`, s.title);
      add(`раздел ${s.id}.hint`, s.hint);
      s.fields.forEach((f) => addField(`раздел ${s.id}`, f));
    }
    const example = t.example.values[form] ?? Object.values(t.example.values)[0];
    addValues(`пример(${form})`, example);
    // Итоги по ответам: подписи строк
    for (const row of t.summary?.({ text: {}, starter: {}, percent: {}, factors: {}, scale: {}, choice: {}, list: {}, entries: {}, comment: '', ...example }) ?? []) add(`итог «${row.label}»`, row.label);
  }
  return out;
}

test('тексты заданий: клиент, ёлочки, тире, многоточие, ё, лишние пробелы', () => {
  let checked = 0;
  for (const [id, t] of Object.entries(TASKS)) {
    for (const { where, text } of taskStrings(id, t)) {
      checked++;
      assert.ok(!/пациент/i.test(text), `${where}: в интерфейсе «клиент», а не «пациент»: ${text}`);
      assert.ok(!/["']/.test(text), `${where}: прямые кавычки, нужны «ёлочки»: ${text}`);
      assert.ok(!/ - | -- /.test(text), `${where}: дефис вместо тире «—»: ${text}`);
      assert.ok(!/\d-\d/.test(text), `${where}: диапазон через дефис, нужна «–»: ${text}`);
      assert.ok(!/\.\.\./.test(text), `${where}: три точки вместо «…»: ${text}`);
      assert.ok(!/ {2,}/.test(text), `${where}: двойной пробел: ${text}`);
      assert.equal(text, text.trim(), `${where}: пробел в начале или конце`);
      assert.ok(!/\S—|—\S/.test(text), `${where}: у тире «—» должны быть пробелы: ${text}`);
      assert.ok(!/«\s|\s»/.test(text), `${where}: пробел внутри «ёлочек»: ${text}`);
      assert.ok(!/(?<![а-яё])(еще|ее)(?![а-яё])/i.test(text), `${where}: нужна «ё» (ещё, её): ${text}`);
      // Знак препинания не отрывается пробелом от слова (смайлик в сообщении клиенту не в счёт)
      assert.ok(!/ [,.;!?]/.test(text), `${where}: пробел перед знаком препинания: ${text}`);
      // Подсказка под вопросом — как подпись: без точки в конце
      if (/(\.hint|Hint)$/.test(where)) assert.ok(!text.endsWith('.'), `${where}: подсказка заканчивается точкой: ${text}`);
    }
  }
  console.log(`  проверено строк: ${checked}`);
  assert.ok(checked > 600, 'строк подозрительно мало: проверка перестала читать тексты');
});

test('инструкции заданий: абзацы не повторяются, описание начинается с названия, подписи итогов короткие', () => {
  for (const [id, t] of Object.entries(TASKS)) {
    assert.ok(t.intro.startsWith(t.lead), `${id}: описание должно начинаться с «${t.lead}», чтобы название набралось жирным`);
    for (const form of t.forms ?? ['']) {
      const rules = t.blank.rules(form);
      assert.equal(new Set(rules).size, rules.length, `${id}(${form}): в инструкции повторяется абзац`);
      assert.ok(rules.length >= 3 && rules.length <= 8, `${id}(${form}): ${rules.length} абзацев в инструкции, ждали от 3 до 8`);
      assert.ok(rules.every((r) => r.length <= 420), `${id}(${form}): слишком длинный абзац инструкции`);
    }
    for (const { where, text } of taskStrings(id, t).filter((s) => s.where.includes('итог «'))) assert.ok(text.length <= 30, `${where}: подпись итога длиннее 30 знаков`);
  }
  // Дневник СМЭР: подпись «Сделано записей» нужна карточке завершённого задания, она убирает её у записи постоянного задания
  assert.match(TASKS.smer.summary({ text: {}, starter: {}, percent: {}, factors: {}, scale: {}, choice: {}, list: {}, entries: { records: [{ text: { situation: 'Х' }, starter: {}, percent: {}, factors: {}, scale: {}, choice: {}, list: {}, entries: {}, comment: '' }] }, comment: '' })[0].label, /^Сделано/);
});

test('неразрывные пробелы: предлоги, частицы, числа и тире', () => {
  const { typo } = lib;
  const show = (s) => typo(s).replaceAll('\u00A0', '_').replaceAll('\u2060', '^');
  assert.equal(show('Запишите, что вы сделали в парке и на улице для себя.'), 'Запишите, что вы сделали в_парке и_на_улице для себя.', 'слова из трёх букв и длиннее не прижимаются');
  assert.equal(show('Оцените от 0 до 10, это задание — для вас.'), 'Оцените от_0_до_10, это задание_— для вас.');
  assert.equal(show('Я бы сделал это же самое'), 'Я_бы сделал это_же самое');
  assert.equal(show('Займёт 15 минут'), 'Займёт 15_минут');
  assert.equal(show('что-то более значимое'), 'что-^то более значимое', 'слово с дефисом не рвётся по дефису');
  assert.equal(show('Займёт 5–10 минут'), 'Займёт 5–^10_минут', 'диапазон не рвётся после тире');
  assert.equal(show('1-й шаг и 2018-2019'), '1-й шаг и_2018-2019', 'дефис между цифрами и после цифры не трогаем');
  assert.equal(show('когнитивно-поведенческая терапия'), 'когнитивно-поведенческая терапия', 'длинное слово с дефисом переносится по дефису');
  assert.equal(typo(typo('и в парке на скамье')), typo('и в парке на скамье'), 'повторный вызов ничего не меняет');
  assert.equal(show('первая\nвторая строка'), 'первая\nвторая строка', 'перевод строки не склеивается');
});

test('карточка задания в чате: подход и краткое описание у каждого задания', () => {
  const { TASK_LIBRARY, TASKS, taskApproachName, typo } = lib;
  const names = new Set(['Когнитивно-поведенческая терапия', 'Терапия принятия и ответственности', 'Схема-терапия', 'Психодинамический подход']);
  const labelOf = { 'Когнитивно-поведенческая терапия': 'КПТ', 'Терапия принятия и ответственности': 'ACT', 'Схема-терапия': 'Схема-терапия', 'Психодинамический подход': 'Психодинамический подход' };
  for (const item of TASK_LIBRARY) {
    const approach = taskApproachName(item.id);
    assert.ok(names.has(approach), `${item.id}: подход «${approach}» не из списка`);
    assert.ok(TASKS[item.id].approaches.includes(labelOf[approach]), `${item.id}: подход карточки не совпадает с подходами в настройках задания`);
    const blurb = item.blurb;
    assert.ok(blurb, `${item.id}: нет краткого описания`);
    assert.ok(blurb.length >= 60 && blurb.length <= 150, `${item.id}: описание ${blurb.length} знаков, ждали 60–150`);
    assert.ok(/[.!?]$/.test(blurb), `${item.id}: описание должно заканчиваться точкой`);
    assert.ok(!/пациент|["']|\.\.\.| {2,}| [,.;!?]|(?<![а-яё])(еще|ее)(?![а-яё])/i.test(blurb), `${item.id}: стиль описания: ${blurb}`);
    assert.equal(typo(typo(blurb)), typo(blurb));
  }
});

test('картинки завершённых тестов: у каждой есть тест в библиотеке, яркость и видимая часть', () => {
  const { TEST_COVERS, LIBRARY } = lib;
  assert.ok(Object.keys(TEST_COVERS).length >= 2);
  for (const [id, cover] of Object.entries(TEST_COVERS)) {
    assert.ok(LIBRARY.some((t) => t.id === id), `${id}: такого теста нет в библиотеке`);
    assert.ok(cover.tone === 'dark' || cover.tone === 'light', `${id}: яркость «${cover.tone}»`);
    assert.match(cover.position, /^\d{1,3}% \d{1,3}%$/, `${id}: видимая часть «${cover.position}»`);
    assert.ok(cover.src, `${id}: нет картинки`);
  }
});

test('BDI и СМОЛ у Максима: пройдены, свежие выше, есть результат, картинка и записи в истории', () => {
  const { TEST_COVERS, findClientResult, readClientData, itemsWithStatus, historyEvents } = lib;
  const data = readClientData();
  const done = itemsWithStatus(data, 'test').filter((t) => t.status === 'done');
  assert.deepEqual(done.slice(0, 2).map((t) => t.id), ['smol', 'bdi'], 'СМОЛ (21.09) выше BDI (14.09), оба выше SCL-90 (11.09)');
  assert.deepEqual(done.slice(0, 2).map((t) => t.fullDate), ['21.09.2026', '14.09.2026']);
  for (const id of ['bdi', 'smol']) {
    const result = findClientResult(`maxim-${id}`);
    assert.ok(result?.data, `${id}: у результата Максима нет заключения`);
    assert.ok(TEST_COVERS[id], `${id}: нет картинки`);
    assert.equal(result.form, 'Мужская');
  }
  assert.equal(findClientResult('maxim-bdi').data.info.date, '14.09.2026');
  assert.equal(findClientResult('maxim-smol').data.info.date, '21.09.2026');
  const texts = historyEvents(data).map((e) => e.text ?? '');
  assert.ok(texts.includes('Вы отправили шкалу депрессии А. Бека «BDI»'));
  assert.ok(texts.includes('Максим заполнил сокращённый многофакторный опросник личности «СМОЛ»'));
});
