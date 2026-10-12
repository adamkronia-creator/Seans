// Проверка папок чипсов: начальный состав, названия, создание и отмена пустой папки, порядок, уведомления: npm run test:folders
// Хранилище папок не зависит от экранов, поэтому собирается esbuild и запускается в Node как есть.
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
      export * from './src/data/folders';
      export { CHATS } from './src/data/chats';
      export { LIBRARY, TASK_LIBRARY } from './src/data/library';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.png': 'dataurl', '.svg': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.css': 'empty' },
  logLevel: 'error',
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-folders-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);
const lib = await import(pathToFileURL(file).href);
fs.rmSync(dir, { recursive: true, force: true });

const { FOLDER_NAME_MAX, NEW_FOLDER_NAME, cleanFolderName, getFolder, getFolders, createFolder, isFreshFolder, discardUntouchedFolder } = lib;
const { renameFolder, setFolderItems, removeFromFolder, toggleFolderMuted, moveFolder, deleteFolder } = lib;
const { CHATS, LIBRARY, TASK_LIBRARY } = lib;

const names = (scope, ids) => ids.map((id) => getFolder(scope, id)?.name);
/** Порядок чипсов раздела: адреса папок слева направо */
const row = (scope) => getFolders(scope).map((f) => f.id);

test('начальные папки собраны из прежних категорий, «Избранное» в них не попадает', () => {
  assert.deepEqual(getFolder('chats', 'clients').ids, CHATS.filter((c) => c.category === 'clients').map((c) => c.id));
  assert.deepEqual(getFolder('chats', 'colleagues').ids, CHATS.filter((c) => c.category === 'colleagues').map((c) => c.id));
  for (const id of ['clients', 'colleagues', 'seminars']) assert.ok(!getFolder('chats', id).ids.includes('favorites'));
  assert.deepEqual(names('chats', ['clients', 'colleagues', 'seminars']), ['Клиенты', 'Коллеги', 'Семинары']);
  assert.deepEqual(names('tests', ['practice', 'hospital', 'project']), ['Практика', 'Больница', 'Проект']);
  assert.deepEqual(names('tasks', ['svo', 'training']), ['СВО', 'Тренинг']);
  assert.deepEqual(getFolder('tests', 'practice').ids, LIBRARY.filter((t) => t.categories.includes('practice')).map((t) => t.id));
  assert.deepEqual(getFolder('tasks', 'training').ids, TASK_LIBRARY.filter((t) => t.categories.includes('training')).map((t) => t.id));
  assert.equal(getFolder('chats', 'clients').muted, false);
  assert.deepEqual(row('chats'), ['clients', 'colleagues', 'seminars'], 'порядок прежних категорий');
  assert.deepEqual(row('tests'), ['practice', 'hospital', 'project']);
  assert.deepEqual(row('tasks'), ['svo', 'training']);
});

test('название: лишние пробелы убираются, длина не больше 16, пустое не годится', () => {
  assert.equal(FOLDER_NAME_MAX, 16);
  assert.equal(cleanFolderName('  Практика  '), 'Практика');
  assert.equal(cleanFolderName('  a   b\t c '), 'a b c');
  assert.equal(cleanFolderName('Очень длинное название папки'), 'Очень длинное на');
  assert.equal(cleanFolderName('x'.repeat(40)).length, 16);
  assert.equal(cleanFolderName('abcdefghijklmno pqrs'), 'abcdefghijklmno', 'пробел на границе среза не остаётся');
  assert.equal(cleanFolderName('   '), '');
  assert.equal(cleanFolderName(''), '');
});

test('новая папка: в конце ряда, пустая, у каждого раздела своя', () => {
  const id = createFolder('chats');
  assert.match(id, /^folder-\d+$/);
  const folder = getFolder('chats', id);
  assert.deepEqual({ name: folder.name, ids: folder.ids, muted: folder.muted }, { name: NEW_FOLDER_NAME, ids: [], muted: false });
  assert.equal(getFolder('tests', id), undefined, 'в другом разделе её нет');
  assert.equal(row('chats').at(-1), id, 'встала в конец ряда');
  const second = createFolder('chats');
  assert.notEqual(second, id, 'номера не повторяются');
  assert.deepEqual(row('chats').slice(-2), [id, second]);
  deleteFolder('chats', id);
  deleteFolder('chats', second);
  assert.equal(getFolder('chats', id), undefined);
  assert.deepEqual(row('chats'), ['clients', 'colleagues', 'seminars']);
});

test('нетронутая новая папка при выходе убирается, тронутая остаётся', () => {
  const untouched = createFolder('tests');
  assert.equal(isFreshFolder(untouched), true);
  discardUntouchedFolder('tests', untouched);
  assert.equal(getFolder('tests', untouched), undefined, 'пустая «Новая папка» убрана');
  assert.equal(isFreshFolder(untouched), false);

  const emptyName = createFolder('tests');
  renameFolder('tests', emptyName, '   ');
  assert.equal(isFreshFolder(emptyName), true, 'пустое название папку «тронутой» не делает');
  assert.equal(getFolder('tests', emptyName).name, NEW_FOLDER_NAME, 'и название не меняет');
  discardUntouchedFolder('tests', emptyName);
  assert.equal(getFolder('tests', emptyName), undefined);

  for (const touch of [
    (id) => renameFolder('tests', id, 'Скрининг'),
    (id) => setFolderItems('tests', id, [LIBRARY[0].id]),
    (id) => removeFromFolder('tests', id, LIBRARY[0].id),
  ]) {
    const id = createFolder('tests');
    touch(id);
    assert.equal(isFreshFolder(id), false);
    discardUntouchedFolder('tests', id);
    assert.ok(getFolder('tests', id), 'папка осталась');
    deleteFolder('tests', id);
  }
  discardUntouchedFolder('tests', 'practice');
  assert.ok(getFolder('tests', 'practice'), 'обычные папки отмена не трогает');
  assert.deepEqual(row('tests'), ['practice', 'hospital', 'project']);
});

test('переименование и состав папки', () => {
  const id = createFolder('chats');
  renameFolder('chats', id, '  Супервизии   группа  ');
  assert.equal(getFolder('chats', id).name, 'Супервизии групп', 'пробелы схлопнуты, длина 16');
  setFolderItems('chats', id, ['maxim', 'vera']);
  assert.deepEqual(getFolder('chats', id).ids, ['maxim', 'vera']);
  removeFromFolder('chats', id, 'maxim');
  assert.deepEqual(getFolder('chats', id).ids, ['vera']);
  removeFromFolder('chats', id, 'nobody');
  assert.deepEqual(getFolder('chats', id).ids, ['vera'], 'чужого в папке нет — ничего не меняется');
  renameFolder('chats', 'no-such-folder', 'X');
  setFolderItems('chats', 'no-such-folder', ['maxim']);
  removeFromFolder('chats', 'no-such-folder', 'maxim');
  deleteFolder('chats', id);
});

test('другие папки и разделы при правке не пересоздаются', () => {
  const clients = getFolder('chats', 'clients');
  const practice = getFolder('tests', 'practice');
  const id = createFolder('chats');
  renameFolder('chats', id, 'Новости');
  assert.equal(getFolder('chats', 'clients'), clients, 'соседняя папка — тот же объект');
  assert.equal(getFolder('tests', 'practice'), practice, 'папка другого раздела — тот же объект');
  assert.notEqual(getFolder('chats', id), undefined);
  deleteFolder('chats', id);
});

test('уведомления папки переключаются и возвращают новое состояние', () => {
  assert.equal(toggleFolderMuted('chats', 'clients'), true);
  assert.equal(getFolder('chats', 'clients').muted, true);
  assert.equal(toggleFolderMuted('chats', 'clients'), false);
  assert.equal(getFolder('chats', 'clients').muted, false);
  assert.equal(toggleFolderMuted('chats', 'no-such-folder'), false);
});

test('порядок чипсов: шаг вверх и вниз, на краях ничего не происходит', () => {
  moveFolder('chats', 'clients', 1);
  assert.deepEqual(row('chats'), ['colleagues', 'clients', 'seminars'], 'вниз');
  moveFolder('chats', 'seminars', -1);
  assert.deepEqual(row('chats'), ['colleagues', 'seminars', 'clients'], 'вверх');
  const before = getFolders('chats');
  moveFolder('chats', 'colleagues', -1);
  moveFolder('chats', 'clients', 1);
  assert.equal(getFolders('chats'), before, 'за первое и последнее место не уходит, ряд не пересоздаётся');
  moveFolder('chats', 'no-such-folder', 1);
  assert.equal(getFolders('chats'), before);
  const folder = getFolder('chats', 'seminars');
  moveFolder('chats', 'seminars', 1);
  assert.equal(getFolder('chats', 'seminars'), folder, 'сама папка при сдвиге остаётся тем же объектом');
  // вернуть как было: клиенты, коллеги, семинары
  moveFolder('chats', 'clients', -1);
  moveFolder('chats', 'clients', -1);
  assert.deepEqual(row('chats'), ['clients', 'colleagues', 'seminars']);
  assert.deepEqual(row('tests'), ['practice', 'hospital', 'project'], 'другие разделы не затронуты');
});

test('удаление: папка исчезает, повторное удаление безвредно, содержимое раздела не страдает', () => {
  const id = createFolder('chats');
  setFolderItems('chats', id, ['vera']);
  deleteFolder('chats', id);
  assert.equal(getFolder('chats', id), undefined);
  deleteFolder('chats', id);
  assert.deepEqual(getFolder('chats', 'clients').ids.includes('vera'), true, 'чат остался в своей исходной папке');
  assert.ok(CHATS.some((c) => c.id === 'vera'), 'и в списке чатов');
});
