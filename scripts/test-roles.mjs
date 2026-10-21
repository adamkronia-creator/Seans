// Проверка ролей и приглашений: правила возможностей, назначение роли, ответ на приглашение, несколько ролей на чат,
// «для всех с этой ролью», завершение работы, свои роли и журнал по чатам: npm run test:roles
// Хранилище не зависит от экранов, поэтому собирается esbuild и запускается в Node как есть.
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
      export * from './src/data/roles';
      export * from './src/data/roleStore';
      export { getChats, getMessages, deleteChats } from './src/data/chatStore';
      export { getFolder, getFolders, bindFolderRole, folderOfRole } from './src/data/folders';
      export { readClientData, logStep, historyEvents, countOf, doneCount, itemsWithStatus, recentIds, appEvents, addNote } from './src/data/clientStore';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.svg': 'dataurl', '.css': 'empty' },
  logLevel: 'error',
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-roles-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);

/** Память вместо localStorage: проверяется и сохранение, и загрузка при следующем запуске */
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => void memory.set(k, String(v)),
  removeItem: (k) => void memory.delete(k),
};

const lib = await import(pathToFileURL(file).href + '?first');
const R = lib;

const links = (chatId) => R.getLinks(chatId);
const link = (chatId, roleId) => links(chatId).find((l) => l.roleId === roleId);
const texts = (chatId) => R.getMessages(chatId).flatMap((g) => g.messages);
const lastText = (chatId) => texts(chatId).at(-1)?.text;
const chat = (id) => R.getChats().find((c) => c.id === id);
const caps = (chatId, cap) => R.capStatesOf(links(chatId))[cap];

test('возможности: общие требуют приглашения, «Скоро» его не требуют', () => {
  assert.equal(R.needsInvite(['notes', 'info', 'history']), false, 'только своё: согласие не нужно');
  assert.equal(R.needsInvite(['notes', 'tests']), true);
  assert.equal(R.needsInvite(['notes', 'schedule', 'files', 'payment']), false, 'то, чего ещё нет, согласия не требует');
  assert.deepEqual(R.consentCaps(['payment', 'tasks', 'notes', 'tests']), ['tests', 'tasks']);
  assert.deepEqual(R.orderCaps(['tasks', 'notes', 'tasks']), ['notes', 'tasks'], 'порядок возможностей, без повторов');
  assert.deepEqual(R.capsDiff(['notes', 'tests'], ['notes', 'tasks']), { added: ['tasks'], removed: ['tests'] });
  assert.deepEqual(R.applyDiff(['notes', 'tests'], { added: ['tasks'], removed: ['tests'] }), ['notes', 'tasks']);
  assert.equal(R.capsLine(['tasks', 'tests']), 'Тесты, Задания');
  assert.equal(R.shortDate('21.10.2026'), '21 окт.');
});

test('встроенные роли: «Пациент» и «Клиент» разные, у каждой своё название и зеркальное «вы для него»', () => {
  const names = R.BUILT_IN_ROLES.map((r) => r.name);
  assert.deepEqual(names, ['Клиент', 'Пациент', 'Коллега', 'Супервизор', 'Студент', 'Семинар']);
  assert.notEqual(R.getRole('client').id, R.getRole('patient').id);
  assert.equal(R.getRole('patient').mirror, 'Психолог');
  assert.equal(R.getRole('client').builtIn, true);
  assert.ok(R.needsInvite(R.getRole('client').caps) && R.needsInvite(R.getRole('patient').caps));
  assert.equal(R.needsInvite(R.getRole('colleague').caps), false, 'коллега без общих возможностей начинается сразу');
});

test('начальные данные: роли у тестовых чатов, приглашение Олега ждёт ответа', () => {
  assert.deepEqual(links('maxim').map((l) => [l.roleId, l.status, l.dir]), [['client', 'active', 'out']]);
  assert.deepEqual(link('maxim', 'client').agreed, ['tests', 'tasks'], 'общие возможности согласованы');
  assert.equal(link('vladislav', 'colleague').caps.includes('tests'), true, 'коллеге включены тесты');
  assert.deepEqual(link('vladislav', 'colleague').agreed, ['tests']);
  assert.equal(links('anna').length, 0, 'у Анны роли нет');
  const oleg = link('oleg', 'client');
  assert.deepEqual([oleg.status, oleg.dir], ['pending', 'in']);
  const invite = R.getInvite('inv-oleg');
  assert.deepEqual([invite.state, invite.dir, invite.kind], ['pending', 'in', 'role']);
  assert.deepEqual(invite.caps, ['tests', 'tasks']);
  assert.equal(texts('oleg').at(-1).invite, 'inv-oleg', 'карточка приглашения лежит в чате Олега');
  assert.equal(chat('oleg').lastMessage, 'Приглашение: роль «Клиент»');
  assert.equal(R.getFolder('chats', 'clients').roleId, 'client');
  assert.deepEqual(R.getFolder('chats', 'clients').ids, ['maxim', 'vera']);
  assert.equal(R.folderOfRole('seminar').id, 'seminars');
});

test('вкладки: у Максима всё открыто, у ждущего приглашения общее закрыто замком, без роли — ничего лишнего', () => {
  for (const cap of ['notes', 'info', 'history', 'tests', 'tasks']) assert.equal(caps('maxim', cap), 'open', cap);
  assert.equal(caps('maxim', 'schedule'), 'hidden', 'того, чего ещё нет, в вкладках нет');
  assert.equal(caps('oleg', 'notes'), 'open', 'своё работает, пока ждём ответа');
  assert.equal(caps('oleg', 'tests'), 'locked');
  assert.equal(caps('oleg', 'tasks'), 'locked');
  assert.equal(R.canInChat('oleg', 'tests'), false);
  assert.equal(R.canInChat('maxim', 'tests'), true);
  assert.equal(caps('anna', 'tests'), 'hidden');
  assert.equal(caps('anna', 'notes'), 'hidden', 'вкладку заметок чату без роли даёт экран, не роль');
  assert.equal(R.roleLine(links('oleg'), R.roleName), 'Клиент · ждёт вашего ответа', 'входящее приглашение: ответа ждут от вас');
  assert.equal(R.roleLine(links('maxim'), R.roleName), 'Клиент');
  assert.equal(R.roleLine(links('anna'), R.roleName), 'Диалог');
  // Страница закрытой вкладки объясняет, чего ждём, без «он/она»
  assert.deepEqual(R.lockNote(links('oleg'), 'tests'), {
    title: 'Нужен ваш ответ',
    text: 'Раздел «Тесты» заработает, когда вы ответите на приглашение в диалоге.',
  });
});

test('слово роли в предложении: с маленькой буквы, аббревиатуры не трогаем', () => {
  assert.equal(R.inSentence('Клиент'), 'клиент');
  assert.equal(R.inSentence('Участник семинара'), 'участник семинара');
  assert.equal(R.inSentence('ВИП-клиент'), 'ВИП-клиент');
  assert.equal(R.inSentence('IT-коллега'), 'IT-коллега');
  assert.equal(R.inSentence('наставник'), 'наставник');
  assert.equal(R.inSentence(''), '');
});

test('входящее приглашение: согласие включает роль, кладёт чат в папку и пишется в журнал', () => {
  const unread = chat('oleg').unread;
  const result = R.respondInvite('inv-oleg', true);
  assert.deepEqual(result, { folder: 'Клиенты' });
  const l = link('oleg', 'client');
  assert.deepEqual([l.status, l.agreed], ['active', ['tests', 'tasks']]);
  assert.equal(R.getInvite('inv-oleg').state, 'accepted');
  assert.equal(lastText('oleg'), 'Вы приняли приглашение: роль «Клиент»');
  assert.equal(texts('oleg').at(-1).system, true);
  assert.equal(chat('oleg').unread, unread, 'служебная строка не считается непрочитанной');
  assert.ok(R.getFolder('chats', 'clients').ids.includes('oleg'));
  assert.equal(caps('oleg', 'tests'), 'open');
  assert.equal(R.respondInvite('inv-oleg', false), null, 'на отвеченное приглашение второй раз не ответить');
  const last = R.readClientData().activity.at(-1);
  assert.deepEqual([last.kind, last.chat, last.role, last.result], ['invite', 'oleg', 'Клиент', 'accepted']);
});

test('назначить роль: с общими возможностями уходит приглашением, ответ «двойника» включает функции', () => {
  const before = chat('anna').unread;
  const result = R.assignRole('anna', 'client');
  const l = result.link;
  assert.equal(l.status, 'pending');
  assert.equal(l.dir, 'out');
  assert.deepEqual(l.agreed, []);
  assert.equal(result.invite.state, 'pending');
  assert.equal(result.invite.roleId, 'client', 'приглашение помнит роль: карточка не зависит от связи');
  assert.deepEqual(result.invite.caps, ['tests', 'tasks']);
  assert.equal(R.lockNote(links('anna'), 'tests').title, 'Ждём согласия');
  assert.equal(R.roleLine(links('anna'), R.roleName), 'Клиент · ждём ответа', 'своё приглашение: ответа ждём мы');
  assert.equal(result.folder, undefined, 'пока ответа нет, в папку не кладём');
  const card = texts('anna').at(-1);
  assert.deepEqual([card.from, card.invite], ['me', result.invite.id]);
  assert.equal(chat('anna').unread, before, 'своё приглашение не делает чат непрочитанным');
  assert.equal(R.canInChat('anna', 'tests'), false);
  assert.equal(caps('anna', 'tests'), 'locked');
  assert.equal(R.assignRole('anna', 'client'), null, 'второй раз ту же роль не назначить');

  const answered = R.respondInvite(result.invite.id, true);
  assert.deepEqual(answered, { folder: 'Клиенты' });
  assert.equal(lastText('anna'), 'Приглашение принято: роль «Клиент»');
  assert.equal(R.canInChat('anna', 'tests'), true);
  assert.equal(caps('anna', 'tasks'), 'open');
});

test('отказ: роль снимается без следа, личной метки не остаётся, в журнале запись', () => {
  const { invite } = R.assignRole('vera', 'patient');
  assert.equal(link('vera', 'patient').status, 'pending');
  assert.equal(R.roleLine(links('vera'), R.roleName), 'Клиент · ждём ответа', 'активная и ждущая роли в одной подписи');
  R.respondInvite(invite.id, false);
  assert.equal(link('vera', 'patient'), undefined, 'связь удалена');
  assert.equal(R.getInvite(invite.id).state, 'declined');
  assert.equal(lastText('vera'), 'Приглашение отклонено: роль «Пациент»');
  assert.equal(R.roleLine(links('vera'), R.roleName), 'Клиент');
  assert.equal(R.getFolder('chats', 'clients').ids.includes('vera'), true, 'прежняя роль и папка на месте');
  const last = R.readClientData().activity.at(-1);
  assert.deepEqual([last.chat, last.role, last.result], ['vera', 'Пациент', 'declined']);
});

test('несколько ролей на чат: у каждой свои возможности, вкладка открыта, если открыта хотя бы в одной', () => {
  const colleague = R.assignRole('vera', 'colleague');
  assert.equal(colleague.link.status, 'active', 'без общих возможностей — сразу');
  assert.equal(lastText('vera'), 'Роль «Коллега» назначена');
  assert.deepEqual(links('vera').map((l) => l.roleId).sort(), ['client', 'colleague']);
  assert.equal(R.roleLine(links('vera'), R.roleName), 'Клиент, Коллега');
  // Тесты включены только в «Клиенте», но чат их открывает
  assert.equal(caps('vera', 'tests'), 'open');
  assert.equal(R.getFolder('chats', 'colleagues').ids.includes('vera'), true, 'и в папку роли «Коллега»');
  // Вторая ждущая роль не закрывает вкладку, которую уже открывает первая
  const { invite } = R.assignRole('vera', 'patient');
  assert.equal(caps('vera', 'tests'), 'open');
  R.revokeInvite(invite.id);
  assert.equal(link('vera', 'patient'), undefined);
  assert.equal(lastText('vera'), 'Приглашение отозвано: роль «Пациент»');
});

test('отозвать можно только своё ещё не отвеченное приглашение', () => {
  assert.equal(R.revokeInvite('inv-oleg'), false, 'ответили, да и приглашение чужое');
  const { invite } = R.assignRole('bogdan', 'student');
  assert.equal(invite.state, 'pending');
  assert.equal(R.revokeInvite(invite.id), true);
  assert.equal(R.revokeInvite(invite.id), false, 'второй раз нельзя');
  assert.equal(R.getInvite(invite.id).state, 'revoked');
});

test('входящее приглашение можно отклонить: чат остаётся без этой роли', () => {
  const { invite } = R.receiveInvite('bogdan', 'patient');
  const unread = chat('bogdan').unread;
  assert.ok(unread >= 1, 'входящее приглашение — непрочитанное');
  assert.equal(R.revokeInvite(invite.id), false, 'чужое приглашение не отозвать');
  R.respondInvite(invite.id, false);
  assert.equal(link('bogdan', 'patient'), undefined);
  assert.equal(lastText('bogdan'), 'Вы отклонили приглашение: роль «Пациент»');
});

test('своя возможность включается сразу, общая — дополнением с согласием', () => {
  // Анна — клиент и (ниже) коллега; берём «Коллегу»: сначала только заметки
  const colleague = R.assignRole('anna', 'colleague').link;
  assert.equal(R.setLinkCaps('anna', colleague.id, ['notes', 'info']).others, 0);
  assert.equal(link('anna', 'colleague').agreed.length, 0);
  assert.equal(R.getInvites().filter((i) => i.linkId === colleague.id).length, 0, 'своё приглашения не требует');
  // Тесты у коллеги — общая возможность
  R.setLinkCaps('anna', colleague.id, ['notes', 'info', 'tests']);
  const ext = R.getInvites().find((i) => i.linkId === colleague.id);
  assert.deepEqual([ext.kind, ext.dir, ext.state, ext.caps], ['caps', 'out', 'pending', ['tests']]);
  assert.equal(link('anna', 'colleague').caps.includes('tests'), true);
  assert.equal(link('anna', 'colleague').agreed.includes('tests'), false, 'пока не согласился, не работает');
  assert.equal(texts('anna').at(-1).invite, ext.id);
  // Дополнение объединяется, а не плодит карточки
  R.setLinkCaps('anna', colleague.id, ['notes', 'info', 'tests', 'tasks']);
  assert.deepEqual(R.getInvite(ext.id).caps, ['tests', 'tasks']);
  assert.equal(R.getInvites().filter((i) => i.linkId === colleague.id && i.state === 'pending').length, 1);
  R.respondInvite(ext.id, true);
  assert.deepEqual(link('anna', 'colleague').agreed, ['tests', 'tasks']);
  assert.equal(lastText('anna'), 'Согласие получено: Тесты, Задания');
});

test('отказ от дополнения выключает эти возможности: включённого без согласия не остаётся', () => {
  const l = link('anna', 'colleague');
  R.setLinkCaps('anna', l.id, ['notes', 'info', 'tests', 'tasks', 'files']);
  assert.deepEqual(R.getInvites().filter((i) => i.linkId === l.id && i.state === 'pending').length, 0, '«Файлы» — скоро, согласия не требуют');
  R.setLinkCaps('anna', l.id, ['notes', 'info', 'tests']);
  assert.equal(lastText('anna'), 'Выключено: Задания', 'снятая согласованная возможность отключается сразу и это видно в чате');
  const colleagueId = l.id;
  // Анна уже клиент с тестами, поэтому смотрим именно связи
  assert.deepEqual(link('anna', 'colleague').agreed, ['tests']);
  R.setLinkCaps('anna', colleagueId, ['notes', 'info', 'tests', 'tasks']);
  const ext = R.getInvites().find((i) => i.linkId === colleagueId && i.state === 'pending');
  R.respondInvite(ext.id, false);
  assert.equal(link('anna', 'colleague').caps.includes('tasks'), false);
  assert.equal(lastText('anna'), 'Отказ: Задания выключено');
});

test('ждущее приглашение подстраивается под выбранные функции; без общих функций роль начинается сразу', () => {
  const { link: l, invite } = R.assignRole('bogdan', 'patient');
  R.setLinkCaps('bogdan', l.id, ['notes', 'info', 'history', 'tests']);
  assert.deepEqual(R.getInvite(invite.id).caps, ['tests']);
  R.setLinkCaps('bogdan', l.id, ['notes', 'info', 'history']);
  assert.equal(R.getInvite(invite.id).state, 'revoked');
  assert.equal(link('bogdan', 'patient').status, 'active');
  assert.equal(lastText('bogdan'), 'Общих функций больше нет, роль «Пациент» активна');
});

test('чужое приглашение, на которое ещё не ответили, менять нельзя, а завершённую роль тоже', () => {
  const { link: l } = R.receiveInvite('anna', 'seminar', ['notes', 'tasks']);
  assert.equal(R.isEditable(l), false);
  assert.equal(R.setLinkCaps('anna', l.id, ['notes']), null);
  R.respondInvite(R.getInvites().find((i) => i.linkId === l.id).id, true);
  assert.equal(R.isEditable(link('anna', 'seminar')), true);
});

test('«для всех с этой ролью»: переносится разница, у других свои настройки сохраняются, новые люди получают то же', () => {
  // Два клиента: Максим и Вера. Вере задания были выключены раньше
  const maxim = link('maxim', 'client');
  const vera = link('vera', 'client');
  R.setLinkCaps('vera', vera.id, vera.caps.filter((c) => c !== 'tasks'));
  assert.equal(link('vera', 'client').agreed.includes('tasks'), false);
  const defaultBefore = R.getRole('client').caps;
  // Максиму выключаем «Тесты» для всех клиентов
  const result = R.setLinkCaps('maxim', maxim.id, maxim.caps.filter((c) => c !== 'tests'), true);
  assert.ok(result.others >= 2, 'Вера, Анна и Олег: все с активной ролью «Клиент»');
  for (const id of ['maxim', 'vera', 'anna', 'oleg']) assert.equal(link(id, 'client').caps.includes('tests'), false, id);
  assert.equal(link('vera', 'client').caps.includes('tasks'), false, 'то, что у Веры настроено иначе, не тронуто');
  assert.equal(link('maxim', 'client').caps.includes('tasks'), true, 'у Максима задания остались');
  assert.equal(R.getRole('client').caps.includes('tests'), false, 'и определение роли для новых людей');
  assert.equal(R.getRole('patient').caps.includes('tests'), true, 'другие роли не затронуты');
  assert.deepEqual(R.getRole('client').caps, R.applyDiff(defaultBefore, { added: [], removed: ['tests'] }));
  // Возвращаем «Тесты» всем: у кого они были выключены, получают приглашение-дополнение (нужно согласие)
  R.setLinkCaps('maxim', maxim.id, [...link('maxim', 'client').caps, 'tests'], true);
  const veraExt = R.getInvites().find((i) => i.chatId === 'vera' && i.kind === 'caps' && i.state === 'pending');
  assert.deepEqual(veraExt.caps, ['tests']);
  assert.equal(R.canInChat('vera', 'tests'), false, 'пока Вера не согласилась, тесты ей не отправить');
  R.respondInvite(veraExt.id, true);
  assert.equal(R.canInChat('vera', 'tests'), true);
  assert.equal(R.getRole('client').caps.includes('tests'), true);
  // Выключенное и включённое снова нужно согласовать заново, в том числе у того, кто нажимал: согласие относилось к прежнему набору
  assert.equal(R.canInChat('maxim', 'tests'), false);
  for (const ext of R.getInvites().filter((i) => i.kind === 'caps' && i.state === 'pending' && i.caps.includes('tests'))) R.respondInvite(ext.id, true);
  assert.equal(R.canInChat('maxim', 'tests'), true);
  // Без «для всех» меняется один чат
  const solo = R.setLinkCaps('maxim', maxim.id, link('maxim', 'client').caps.filter((c) => c !== 'info'), false);
  assert.equal(solo.others, 0);
  assert.equal(link('vera', 'client').caps.includes('info'), true);
  R.setLinkCaps('maxim', maxim.id, [...link('maxim', 'client').caps, 'info']);
});

test('завершить работу: общее выключается, вкладки читаются, история остаётся; снять роль можно после', () => {
  assert.equal(R.endRole('maxim', link('maxim', 'client').id), true);
  const l = link('maxim', 'client');
  assert.equal(l.status, 'ended');
  assert.equal(R.canInChat('maxim', 'tests'), false, 'отправить уже нельзя');
  assert.equal(caps('maxim', 'tests'), 'open', 'но результаты читаются');
  assert.equal(caps('maxim', 'notes'), 'open');
  assert.equal(R.roleLine(links('maxim'), R.roleName), 'Клиент · завершено');
  assert.equal(R.lockNote(links('maxim'), 'tests').title, 'Роль завершена');
  assert.equal(lastText('maxim'), 'Работа завершена: роль «Клиент»');
  assert.equal(R.endRole('maxim', l.id), false, 'второй раз нельзя');
  assert.equal(R.setLinkCaps('maxim', l.id, ['notes']), null, 'завершённую не настраивают');
  assert.equal(R.canRemoveLink(l), true);
  const last = R.readClientData().activity.at(-1);
  assert.deepEqual([last.kind, last.result, last.chat], ['invite', 'ended', undefined], 'у Максима запись без пометки чата');
  // Роль можно назначить заново: завершённая связь заменяется новой, а прежняя работа остаётся в журнале
  const again = R.assignRole('maxim', 'client');
  assert.equal(again.link.status, 'pending');
  assert.equal(links('maxim').filter((x) => x.roleId === 'client').length, 1);
  R.respondInvite(again.invite.id, true);
  assert.equal(R.canInChat('maxim', 'tests'), true);
});

test('снять роль без общих возможностей можно сразу, работающую с общими — только после завершения', () => {
  const colleague = link('vera', 'colleague');
  assert.equal(R.canRemoveLink(colleague), true);
  assert.equal(R.removeLink('vera', colleague.id), true);
  assert.equal(link('vera', 'colleague'), undefined);
  assert.equal(lastText('vera'), 'Роль «Коллега» снята');
  assert.equal(R.removeLink('vera', link('vera', 'client').id), false, 'клиента сначала завершают');
});

test('свои роли: создание, повтор названия, правка, возвращение встроенной к исходной, удаление', () => {
  assert.equal(R.createRole({ name: '   ' }), null, 'пустое название не принимается');
  assert.equal(R.createRole({ name: 'клиент' }), null, 'название не повторяет встроенное, регистр не важен');
  const friend = R.createRole({ name: '  Друг  ', caps: ['notes', 'tests'] });
  assert.deepEqual([friend.name, friend.mirror, friend.builtIn, friend.id], ['Друг', 'Друг', false, 'role-1']);
  assert.equal(R.createRole({ name: 'Друг' }), null);
  assert.equal(R.createRole({ name: 'Т'.repeat(60) }).name.length, R.ROLE_MAX, 'длинное название обрезается');
  assert.equal(R.updateRole(friend.id, { mirror: 'Подруга' }), true);
  assert.equal(R.getRole(friend.id).mirror, 'Подруга');
  assert.equal(R.updateRole(friend.id, { name: 'Коллега' }), false, 'чужое название занято');
  assert.equal(R.updateRole('client', { name: 'Консультируемый' }), true, 'встроенную можно переименовать');
  assert.equal(R.roleName('client'), 'Консультируемый');
  assert.equal(R.roleLine(links('maxim'), R.roleName), 'Консультируемый', 'подпись под именем следует за названием');
  assert.equal(R.isDefaultRole(R.getRole('client')), false);
  assert.equal(R.resetRole('client'), true);
  assert.equal(R.roleName('client'), 'Клиент');
  assert.equal(R.resetRole(friend.id), false, 'своя роль к исходной не возвращается');
  assert.equal(R.deleteRole('client'), 'builtin');
  // Роль, назначенная людям, не удаляется
  R.assignRole('bogdan', friend.id);
  assert.equal(R.deleteRole(friend.id), 'used');
  R.respondInvite(R.getInvites().findLast((i) => i.chatId === 'bogdan').id, true);
  const bog = link('bogdan', friend.id);
  R.endRole('bogdan', bog.id);
  R.removeLink('bogdan', bog.id);
  assert.equal(R.deleteRole(friend.id), 'ok');
  assert.equal(R.getRole(friend.id), undefined);
  assert.equal(R.deleteRole(friend.id), 'missing');
});

test('возможности роли по умолчанию: с применением к назначенным и без', () => {
  const before = link('vladislav', 'colleague').caps;
  const noApply = R.setRoleCaps('colleague', [...R.getRole('colleague').caps, 'info'], false);
  assert.equal(noApply.others, 0);
  assert.equal(R.getRole('colleague').caps.includes('info'), true);
  assert.deepEqual(link('vladislav', 'colleague').caps, before, 'назначенным ничего не меняется');
  const apply = R.setRoleCaps('colleague', R.getRole('colleague').caps.filter((c) => c !== 'info'), true);
  assert.ok(apply.others >= 1);
  assert.equal(R.getRole('colleague').caps.includes('info'), false);
  R.resetRole('colleague');
});

test('определения ролей сохраняются в localStorage и читаются при следующем запуске, мусор отбрасывается', async () => {
  const saved = JSON.parse(memory.get('seans.roles.v1'));
  const names = saved.map((r) => r.name);
  assert.ok(names.includes('Т'.repeat(R.ROLE_MAX)), 'своя роль записана');
  assert.ok(!saved.some((r) => r.id === 'client'), 'встроенная, возвращённая к исходной, не хранится');
  // Следующий запуск: свежая копия модуля читает сохранённое
  const second = await import(pathToFileURL(file).href + '?second');
  assert.ok(second.getRoles().some((r) => r.name === 'Т'.repeat(second.ROLE_MAX)));
  assert.equal(second.getRoles().filter((r) => r.builtIn).length, 6);
  // Повреждённые данные не ломают запуск
  memory.set('seans.roles.v1', '{ это не JSON');
  const broken = await import(pathToFileURL(file).href + '?broken');
  assert.deepEqual(broken.getRoles().map((r) => r.name), ['Клиент', 'Пациент', 'Коллега', 'Супервизор', 'Студент', 'Семинар']);
  memory.set('seans.roles.v1', JSON.stringify([{ id: 'client', name: '', caps: 'x' }, { id: 'role-9', name: 'Ок', caps: ['tests', 'evil', 7] }, { id: 'hack', name: 'Не своя' }, 5]));
  const odd = await import(pathToFileURL(file).href + '?odd');
  assert.equal(odd.roleName('client'), 'Клиент', 'пустое название отброшено');
  assert.deepEqual(odd.getRole('role-9').caps, ['tests'], 'неизвестные возможности отброшены');
  assert.equal(odd.getRole('hack'), undefined, 'чужой формат id не принимается');
});

test('журнал по чатам: тест, отправленный Вере, виден только у Веры; записи Максима не затронуты', () => {
  const d0 = R.readClientData();
  const maximTests = R.countOf(d0, 'test', 'maxim');
  assert.ok(maximTests > 0);
  assert.equal(R.countOf(d0, 'test', 'anna'), 0);
  R.logStep('anna', 'test', 'phq9', 'sent');
  R.logStep('anna', 'task', 'smer', 'sent', { permanent: { limit: 3 } });
  const d = R.readClientData();
  assert.equal(R.countOf(d, 'test', 'anna'), 1);
  assert.equal(R.countOf(d, 'task', 'anna'), 1);
  assert.equal(R.countOf(d, 'test', 'maxim'), maximTests, 'у Максима число прежнее');
  assert.equal(R.doneCount(d, 'test', 'anna'), 0);
  assert.deepEqual(R.itemsWithStatus(d, 'test', 'anna').map((i) => [i.id, i.status]), [['phq9', 'sent']]);
  assert.deepEqual(R.itemsWithStatus(d, 'task', 'anna').map((i) => [i.id, i.status]), [['smer', 'permanent']]);
  assert.equal(R.itemsWithStatus(d, 'test', 'maxim').some((i) => i.id === 'phq9' && i.status === 'done'), true, 'у Максима PHQ-9 пройден');
  assert.equal(R.recentIds(d, 'test', 5, 'anna')[0], 'phq9');
  assert.equal(R.recentIds(d, 'test', 5)[0], 'phq9', 'без чата — по всем, свежие первыми');
  const events = R.historyEvents(d, 'anna');
  assert.ok(events.some((e) => e.kind === 'test' && e.text === 'Вы отправили опросник депрессивного состояния «PHQ-9»'));
  assert.ok(events.some((e) => e.kind === 'invite' && e.title === 'Роль «Клиент»' && e.text === 'Приглашение принято, работа началась.'));
  assert.ok(R.historyEvents(d, 'maxim').some((e) => e.kind === 'invite' && e.title === 'Новый клиент'), 'старая запись Максима с прежним текстом');
});

test('заметки попадают в журнал любого чата', () => {
  const before = R.countOf(R.readClientData(), 'note', 'anna');
  assert.ok(R.addNote('anna', 'Первая встреча, запрос: тревога'));
  assert.equal(R.countOf(R.readClientData(), 'note', 'anna'), before + 1);
  assert.equal(R.countOf(R.readClientData(), 'note', 'vera'), 0);
});

test('«События»: приглашения всех людей, ответы, переход в чат; имена берутся у чатов', () => {
  const who = (id) => {
    const c = chat(id);
    return c && { name: c.name, avatar: c.avatar };
  };
  const events = R.appEvents(R.readClientData(), who);
  const byText = (name, text) => events.find((e) => e.name === name && e.text === text);
  assert.ok(byText('Максим Мартынов', 'Принял приглашение стать клиентом'), 'старое событие Максима осталось');
  assert.equal(byText('Максим Мартынов', 'Принял приглашение стать клиентом').link, false);
  const oleg = events.find((e) => e.name === 'Олег Рябинин' && e.text === 'Предлагает роль «Клиент»');
  assert.ok(oleg, 'входящее приглашение в событиях');
  assert.deepEqual([oleg.type, oleg.link, oleg.href], ['invite', true, '/chat/oleg']);
  assert.ok(byText('Анна Лебедева', 'Приглашение принято: роль «Клиент»'));
  assert.ok(byText('Вера Филиппова', 'Приглашение отклонено: роль «Пациент»'));
  assert.ok(events.some((e) => e.name === 'Максим Мартынов' && e.text === 'Работа завершена: роль «Клиент»'));
  // Чат удалён — его событий в списке нет
  const none = R.appEvents(R.readClientData(), () => undefined);
  assert.equal(none.length, 0);
});

test('папки и роли: связь по адресу, одна роль — одна папка, чат кладётся в папку по роли', () => {
  R.bindFolderRole('seminars', 'client');
  assert.equal(R.folderOfRole('client').id, 'seminars', 'связь переехала');
  assert.equal(R.getFolder('chats', 'clients').roleId, undefined, 'у прежней папки связь снята');
  R.bindFolderRole('seminars', undefined);
  assert.equal(R.folderOfRole('client'), undefined);
  R.bindFolderRole('clients', 'client');
  assert.equal(R.folderOfRole('client').id, 'clients');
});

test('удаление чата убирает его роли и приглашения', () => {
  R.assignRole('bogdan', 'client');
  assert.ok(R.getLinks('bogdan').length > 0);
  R.deleteChats(['bogdan']);
  assert.equal(R.getLinks('bogdan').length, 0);
  assert.equal(R.getInvites().some((i) => i.chatId === 'bogdan'), false);
});

test('счётчики и получатели: клиенты по активной роли, получатели тестов — чаты, где тесты работают', () => {
  const all = R.getAllLinks();
  const ids = R.getChats().map((c) => c.id);
  assert.ok(R.countWithRole(all, ids, ['client', 'patient']) >= 3);
  assert.equal(R.countWithRole(all, ids, ['colleague']), 2, 'Владислав и Анна');
  assert.equal(R.countWithRole(all, ['maxim'], ['patient']), 0);
});
