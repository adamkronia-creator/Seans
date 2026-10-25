// Проверка групп и значков: тестовые данные, правила видимости значков, создание и правка групп, вступление (свободное, по заявке,
// по приглашению), канал (кто читает и кто пишет), приглашения в чатах, статусы, поиск людей и сохранение между запусками: npm run test:groups
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
      export * from './src/data/groups';
      export * from './src/data/groupStore';
      export * from './src/data/people';
      export * from './src/data/status';
      export { getChats, getMessages, deleteChats } from './src/data/chatStore';
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-groups-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);

/** Память вместо localStorage: проверяется и сохранение, и загрузка при следующем запуске */
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => void memory.set(k, String(v)),
  removeItem: (k) => void memory.delete(k),
};

let instance = 0;
/** Новый «запуск приложения»: модуль грузится заново; хранилище браузера остаётся, если не просят очистить */
const launch = (keepStorage = false) => {
  if (!keepStorage) memory.clear();
  return import(pathToFileURL(file).href + '?run' + ++instance);
};

const FLAGS = { showEmblem: true, listed: true, audience: 'all' };
const input = (over = {}) => ({ name: 'Новая группа', about: 'Описание', city: 'Томск', emblem: { emoji: '🦊', tone: 'blue' }, join: 'open', channel: 'members', ...over });
const texts = (G, chatId) => G.getMessages(chatId).flatMap((g) => g.messages);

test('тестовые группы: значки разные, у каждой есть владелец, каждый человек из каталога где-то состоит', async () => {
  const G = await launch();
  const s = G.getGroupsState();
  assert.equal(s.groups.length, 6);
  assert.equal(new Set(s.groups.map((g) => `${G.plainEmoji(g.emblem.emoji)}|${g.emblem.tone}`)).size, s.groups.length, 'пара «эмодзи и цвет» не повторяется');
  assert.equal(new Set(s.groups.map((g) => g.name.toLowerCase())).size, s.groups.length, 'названия не повторяются');
  for (const g of s.groups) {
    assert.ok(g.test, `${g.id}: группа помечена как тестовая`);
    const owner = s.members.find((m) => m.groupId === g.id && m.role === 'owner');
    assert.equal(owner?.personId, g.owner, `${g.id}: владелец среди участников`);
  }
  for (const id of G.DIRECTORY_IDS) assert.ok(s.members.some((m) => m.personId === id), `${id} состоит хотя бы в одной группе`);
  assert.equal(G.membership(s.members, 'ural-intervision', G.ME)?.role, 'owner', 'вы владелец «Интервизии Урала»');
  assert.equal(G.membership(s.members, 'kpt-lab', G.ME)?.role, 'member', 'вы участник «КПТ-практикума»');
  assert.equal(G.membership(s.members, 'nsk-psa', G.ME), undefined, 'в круг психоаналитиков вы не входите');
  // Покрыты все режимы вступления и оба доступа к каналу
  assert.deepEqual([...new Set(s.groups.map((g) => g.join))].sort(), ['invite', 'open', 'request']);
  assert.deepEqual([...new Set(s.groups.map((g) => g.channel))].sort(), ['members', 'public']);
});

test('значок: пара «эмодзи и цвет» уникальна, вариант начертания эмодзи не меняет сути', async () => {
  const G = await launch();
  const { groups } = G.getGroupsState();
  assert.ok(G.sameEmblem({ emoji: '🛋️', tone: 'purple' }, { emoji: '🛋', tone: 'purple' }), 'с вариантом начертания и без — один значок');
  assert.ok(!G.sameEmblem({ emoji: '🛋️', tone: 'purple' }, { emoji: '🛋️', tone: 'blue' }), 'другой цвет — другой значок');
  assert.equal(G.emblemOwner(groups, { emoji: '🧩', tone: 'mint' })?.id, 'kpt-lab');
  assert.equal(G.emblemOwner(groups, { emoji: '🧩', tone: 'mint' }, 'kpt-lab'), undefined, 'сама группа свой значок не занимает');
  assert.equal(G.emblemOwner(groups, { emoji: '🧩', tone: 'pink' }), undefined, 'тот же эмодзи другого цвета свободен');
  const free = G.freeEmblem(groups);
  assert.equal(G.emblemOwner(groups, free), undefined, 'подставляемый значок свободен');
});

test('значки у человека: видны, если он разрешил; чужие «только для клиентов» вам не видны, свои видны все', async () => {
  const G = await launch();
  const { groups, members } = G.getGroupsState();
  const of = (id) => G.visibleEmblems(groups, members, id).map((e) => e.group.id);
  assert.deepEqual(of('vladislav'), ['msk-intervision', 'kpt-lab'], 'старые участники первыми');
  assert.deepEqual(of('denis'), ['class-2026'], 'Денис скрыл значок «КПТ-практикума»');
  assert.deepEqual(of('maxim'), [], 'у клиента значков нет');
  const hidden = members.map((m) => (m.personId === 'irina' ? { ...m, audience: 'clients' } : m));
  assert.deepEqual(G.visibleEmblems(groups, hidden, 'irina'), [], 'значок для клиентов Ирины вы не видите');
  const mine = members.map((m) => (m.personId === G.ME ? { ...m, audience: 'clients' } : m));
  assert.deepEqual(G.visibleEmblems(groups, mine, G.ME).map((e) => e.group.id), ['ural-intervision', 'kpt-lab'], 'свои значки видны при любой аудитории');
});

test('участники в списке: скрытые не показываются, вы видите себя всегда, владелец первым', async () => {
  const G = await launch();
  const { members } = G.getGroupsState();
  assert.deepEqual(G.listedMembers(members, 'nsk-psa').map((m) => m.personId), ['marina', 'pavel', 'irina', 'vasilisa'], 'владелец, администратор, потом остальные по давности');
  const hidden = members.map((m) => (m.groupId === 'nsk-psa' && m.personId === 'irina' ? { ...m, listed: false } : m));
  assert.ok(!G.listedMembers(hidden, 'nsk-psa').some((m) => m.personId === 'irina'), 'Ирина вышла из списка');
  assert.equal(G.memberCount(hidden, 'nsk-psa'), 4, 'но участницей остаётся');
  const me = members.map((m) => (m.groupId === 'kpt-lab' && m.personId === G.ME ? { ...m, listed: false } : m));
  assert.ok(G.listedMembers(me, 'kpt-lab').some((m) => m.personId === G.ME), 'себя вы в списке видите');
  assert.equal(G.isFindable(hidden, 'irina'), false, 'без строки в списках человека не находят');
});

test('канал: читают все или только участники, пишут владелец и администраторы', async () => {
  const G = await launch();
  const { groups, members } = G.getGroupsState();
  const group = (id) => groups.find((g) => g.id === id);
  assert.ok(G.canRead(group('nsk-psa'), members, G.ME), 'открытый канал читает и не участник');
  assert.ok(!G.canRead(group('msk-intervision'), members, G.ME), 'закрытый канал не участнику не виден');
  assert.ok(G.canRead(group('kpt-lab'), members, G.ME), 'участнику виден');
  assert.ok(G.canPost(members, 'ural-intervision', G.ME), 'владелец пишет');
  assert.ok(G.canPost(members, 'nsk-psa', 'pavel'), 'администратор пишет');
  assert.ok(!G.canPost(members, 'kpt-lab', G.ME), 'обычный участник не пишет');
  assert.ok(!G.canPost(members, 'nsk-psa', G.ME), 'не участник не пишет');
});

test('создание: группу создаёт кто угодно, мешают пустое и занятое название и занятый значок', async () => {
  const G = await launch();
  assert.equal(G.validateGroup(input({ name: ' ' })), 'name');
  assert.equal(G.validateGroup(input({ name: 'a' })), 'name', 'одной буквы мало');
  assert.equal(G.validateGroup(input({ name: '  интервизия урала ' })), 'name-taken', 'без учёта регистра и пробелов');
  assert.equal(G.validateGroup(input({ emblem: { emoji: '🛋', tone: 'purple' } })), 'emblem-taken', 'значок занят даже без варианта начертания');
  assert.equal(G.validateGroup(input({ emblem: { emoji: '', tone: 'blue' } })), 'emblem');
  assert.equal(G.validateGroup(input()), null);

  const made = G.createGroup(input({ name: '  Томский круг  ', join: 'request', channel: 'public' }));
  assert.ok(made.ok);
  assert.equal(made.group.name, 'Томский круг', 'пробелы по краям убраны');
  assert.equal(made.group.owner, G.ME);
  assert.ok(!made.group.test, 'созданная вами группа не тестовая');
  const s = G.getGroupsState();
  assert.equal(G.membership(s.members, made.group.id, G.ME)?.role, 'owner', 'создатель — владелец и участник');
  assert.ok(G.canPost(s.members, made.group.id, G.ME) && G.canRead(made.group, s.members, G.ME));
  assert.equal(G.createGroup(input({ name: 'Томский круг' })).error, 'name-taken', 'второй раз то же название нельзя');
  assert.equal(G.createGroup(input({ name: 'Другая', emblem: made.group.emblem })).error, 'emblem-taken', 'и тот же значок нельзя');
});

test('правка и удаление: только владелец; удаление уносит участников, заявки, приглашения и записи', async () => {
  const G = await launch();
  assert.equal(G.updateGroup('kpt-lab', input({ name: 'Моё' })), 'forbidden', 'чужую группу менять нельзя');
  assert.equal(G.deleteGroup('kpt-lab'), false);
  assert.equal(G.updateGroup('ural-intervision', input({ name: 'Интервизия Урала', emblem: { emoji: '🌲', tone: 'green' }, join: 'invite', channel: 'public' })), null, 'свой значок и название можно оставить');
  assert.equal(G.getGroup('ural-intervision')?.join, 'invite');
  assert.equal(G.getGroup('ural-intervision')?.channel, 'public');
  assert.equal(G.updateGroup('ural-intervision', input({ emblem: { emoji: '🧩', tone: 'mint' } })), 'emblem-taken', 'чужой значок брать нельзя');
  assert.equal(G.updateGroup('ural-intervision', input({ name: 'КПТ-практикум' })), 'name-taken');

  assert.ok(G.deleteGroup('ural-intervision'));
  const s = G.getGroupsState();
  assert.equal(s.groups.length, 5);
  for (const list of [s.members, s.requests, s.posts, s.invites]) assert.ok(!list.some((x) => x.groupId === 'ural-intervision'), 'всё, что было в группе, ушло');
  assert.ok(s.members.some((m) => m.groupId === 'kpt-lab'), 'другие группы целы');
});

test('вступление: свободное сразу, по заявке заявкой, по приглашению нельзя; повторно ничего не меняется', async () => {
  const G = await launch();
  assert.equal(G.joinGroup('class-2026', { ...FLAGS, audience: 'peers' }), 'ok');
  const mine = G.membership(G.getGroupsState().members, 'class-2026', G.ME);
  assert.equal(mine?.role, 'member');
  assert.equal(mine?.audience, 'peers', 'флаги, выбранные при вступлении, сохранились');
  assert.equal(G.joinGroup('class-2026', FLAGS), 'member');

  assert.equal(G.joinGroup('nsk-psa', FLAGS), 'requested');
  assert.equal(G.joinGroup('nsk-psa', FLAGS), 'pending', 'вторая заявка не создаётся');
  assert.equal(G.getGroupsState().requests.filter((r) => r.groupId === 'nsk-psa' && r.personId === G.ME).length, 1);
  assert.equal(G.membership(G.getGroupsState().members, 'nsk-psa', G.ME), undefined, 'пока заявку не приняли, вы не участник');
  G.cancelRequest('nsk-psa');
  assert.equal(G.getGroupsState().requests.some((r) => r.groupId === 'nsk-psa' && r.personId === G.ME), false, 'заявку можно отозвать');

  assert.equal(G.joinGroup('msk-intervision', FLAGS), 'invite-only');
  assert.equal(G.joinGroup('нет-такой', FLAGS), 'missing');
});

test('заявки: принятого человека видно в группе с его флагами, отклонённого нет', async () => {
  const G = await launch();
  const before = G.memberCount(G.getGroupsState().members, 'ural-intervision');
  assert.ok(G.answerRequest('req-timur', true));
  const s = G.getGroupsState();
  assert.equal(G.memberCount(s.members, 'ural-intervision'), before + 1);
  assert.ok(G.membership(s.members, 'ural-intervision', 'timur'));
  assert.ok(!s.requests.some((r) => r.id === 'req-timur'));
  assert.ok(G.answerRequest('req-yulia', false));
  assert.ok(!G.membership(G.getGroupsState().members, 'ural-intervision', 'yulia'), 'отклонённая заявка участником не делает');
  assert.equal(G.answerRequest('req-yulia', true), false, 'на закрытую заявку второй раз не ответить');
  // Свою заявку «принимает» тот, кто смотрит (демо): человек входит с флагами, выбранными в заявке
  assert.equal(G.joinGroup('nsk-psa', { ...FLAGS, listed: false }), 'requested');
  const req = G.getGroupsState().requests.find((r) => r.groupId === 'nsk-psa' && r.personId === G.ME);
  assert.ok(G.answerRequest(req.id, true));
  assert.equal(G.membership(G.getGroupsState().members, 'nsk-psa', G.ME)?.listed, false);
});

test('выход и свои флаги: владелец не выходит, участник выходит, флаги меняются', async () => {
  const G = await launch();
  assert.equal(G.leaveGroup('ural-intervision'), 'owner');
  assert.equal(G.leaveGroup('nsk-psa'), 'missing');
  G.setMyFlags('kpt-lab', { showEmblem: false, audience: 'peers' });
  const flags = G.membership(G.getGroupsState().members, 'kpt-lab', G.ME);
  assert.equal(flags.showEmblem, false);
  assert.equal(flags.audience, 'peers');
  assert.equal(flags.listed, true, 'остальное не тронуто');
  assert.equal(G.leaveGroup('kpt-lab'), 'ok');
  assert.equal(G.membership(G.getGroupsState().members, 'kpt-lab', G.ME), undefined);
});

test('канал: публикует владелец и администратор, пустое не принимается, запись убирает автор или владелец', async () => {
  const G = await launch();
  assert.equal(G.publish('kpt-lab', 'Привет'), 'forbidden', 'обычный участник не пишет');
  assert.equal(G.publish('nsk-psa', 'Привет'), 'forbidden', 'не участник не пишет');
  assert.equal(G.publish('ural-intervision', '   '), 'empty');
  assert.equal(G.publish('ural-intervision', '  Интервизия переносится на пятницу.  '), 'ok');
  const posts = G.getGroupsState().posts.filter((p) => p.groupId === 'ural-intervision');
  assert.equal(posts.at(-1).text, 'Интервизия переносится на пятницу.');
  assert.equal(posts.at(-1).author, G.ME);
  assert.equal(G.deletePost('p3'), false, 'чужую запись в чужой группе не убрать');
  assert.ok(G.deletePost(posts.at(-1).id), 'свою запись убрать можно');
  const long = 'я'.repeat(G.POST_MAX + 50);
  assert.equal(G.publish('ural-intervision', long), 'ok');
  assert.equal(G.getGroupsState().posts.filter((p) => p.groupId === 'ural-intervision').at(-1).text.length, G.POST_MAX, 'длинная запись обрезается');
});

test('входящее приглашение: согласие делает вас участником с вашими флагами и пишет строку в чат', async () => {
  const G = await launch();
  assert.equal(G.getGroupsState().invites.find((i) => i.id === 'ginv-vladislav')?.state, 'pending');
  assert.equal(G.joinGroup('msk-intervision', FLAGS), 'invite-only', 'без приглашения не войти');
  assert.ok(G.answerGroupInvite('ginv-vladislav', true, { showEmblem: true, listed: false, audience: 'peers' }));
  const mine = G.membership(G.getGroupsState().members, 'msk-intervision', G.ME);
  assert.equal(mine?.role, 'member');
  assert.equal(mine?.listed, false);
  assert.equal(mine?.audience, 'peers');
  assert.equal(G.getGroupsState().invites.find((i) => i.id === 'ginv-vladislav')?.state, 'accepted');
  assert.equal(texts(G, 'vladislav').at(-1).text, 'Вы вступили в группу «Московские интервизии»');
  assert.ok(texts(G, 'vladislav').at(-1).system);
  assert.equal(G.answerGroupInvite('ginv-vladislav', false), false, 'на закрытое приглашение второй раз не ответить');
});

test('входящее приглашение: отказ не делает участником', async () => {
  const G = await launch();
  assert.ok(G.answerGroupInvite('ginv-vladislav', false));
  assert.equal(G.membership(G.getGroupsState().members, 'msk-intervision', G.ME), undefined);
  assert.equal(G.getGroupsState().invites.find((i) => i.id === 'ginv-vladislav')?.state, 'declined');
  assert.equal(texts(G, 'vladislav').at(-1).text, 'Вы отклонили приглашение в группу «Московские интервизии»');
});

test('ваше приглашение: карточка в чате (чат заводится), повторно не звать, ответ собеседника, отзыв', async () => {
  const G = await launch();
  assert.equal(G.getChats().some((c) => c.id === 'kirill'), false, 'чата с Кириллом пока нет');
  assert.equal(G.inviteToGroup('kpt-lab', 'kirill'), 'forbidden', 'звать может владелец или администратор, а вы тут участник');
  assert.equal(G.inviteToGroup('ural-intervision', 'kirill'), 'ok');
  const chat = G.getChats().find((c) => c.id === 'kirill');
  assert.equal(chat?.name, 'Кирилл Андреев', 'чат заведён');
  assert.equal(G.getChats()[1].id, 'kirill', 'встал вверху после «Избранного»');
  const card = texts(G, 'kirill').at(-1);
  assert.ok(card.groupInvite && card.from === 'me', 'в чате карточка приглашения от вас');
  const invite = G.getGroupsState().invites.find((i) => i.id === card.groupInvite);
  assert.deepEqual([invite.dir, invite.state, invite.personId, invite.by], ['out', 'pending', 'kirill', G.ME]);
  assert.equal(G.inviteToGroup('ural-intervision', 'kirill'), 'pending', 'второй раз не звать');
  assert.equal(G.inviteToGroup('ural-intervision', 'elena'), 'member', 'участника звать незачем');
  assert.equal(G.inviteToGroup('ural-intervision', 'нет'), 'missing');

  assert.ok(G.answerGroupInvite(invite.id, true), 'ответ собеседника (демо)');
  assert.ok(G.membership(G.getGroupsState().members, 'ural-intervision', 'kirill'));
  assert.equal(texts(G, 'kirill').at(-1).text, 'Приглашение в группу «Интервизия Урала» принято');

  assert.equal(G.inviteToGroup('ural-intervision', 'vasilisa'), 'ok');
  const second = G.getGroupsState().invites.find((i) => i.personId === 'vasilisa');
  G.revokeGroupInvite(second.id);
  assert.equal(G.getGroupsState().invites.find((i) => i.id === second.id).state, 'revoked');
  assert.equal(texts(G, 'vasilisa').at(-1).text, 'Приглашение в группу «Интервизия Урала» отозвано');
  assert.equal(G.answerGroupInvite(second.id, true), false, 'отозванное приглашение принять нельзя');
  assert.ok(!G.membership(G.getGroupsState().members, 'ural-intervision', 'vasilisa'));
});

test('удалили чат — карточки приглашений из него уходят, участие остаётся', async () => {
  const G = await launch();
  assert.equal(G.inviteToGroup('ural-intervision', 'kirill'), 'ok');
  G.deleteChats(['kirill']);
  assert.equal(G.getGroupsState().invites.some((i) => i.chatId === 'kirill'), false);
  assert.equal(G.getGroup('ural-intervision') !== undefined, true);
});

test('статус доступности: срок, обрезка текста, снятие', async () => {
  const G = await launch();
  const now = Date.now();
  assert.equal(G.liveStatus(undefined, now), undefined);
  assert.deepEqual(G.liveStatus({ emoji: '🟢', text: 'Принимаю' }, now), { emoji: '🟢', text: 'Принимаю' }, 'без срока держится');
  assert.deepEqual(G.liveStatus({ emoji: '🌴', text: 'Отпуск', until: now + 1000 }, now), { emoji: '🌴', text: 'Отпуск', until: now + 1000 });
  assert.equal(G.liveStatus({ emoji: '🌴', text: 'Отпуск', until: now - 1 }, now), undefined, 'срок вышел — статуса нет');
  G.setMyStatus({ emoji: '💬', text: `  ${'я'.repeat(80)}  `, until: now + 5000 });
  const mine = G.getGroupsState().status;
  assert.equal(mine.text.length, G.STATUS_TEXT_MAX);
  assert.equal(mine.until, now + 5000);
  G.setMyStatus({ emoji: '💬', text: '   ' });
  assert.equal(G.getGroupsState().status, undefined, 'пустой текст снимает статус');
  G.setMyStatus({ emoji: '🟢', text: 'Принимаю новых клиентов' });
  G.setMyStatus(undefined);
  assert.equal(G.getGroupsState().status, undefined);
  assert.equal(G.statusLine({ emoji: '🌴', text: 'В отпуске', until: new Date(2026, 10, 3).getTime() }), '🌴 В отпуске · до 3 ноября');
});

test('поиск людей: по городу, подписи, названию группы и значку; скрытых и вас не находит', async () => {
  const G = await launch();
  const s = G.getGroupsState();
  const chats = G.getChats();
  const names = (q) => G.findPeople(s, chats, q).map((h) => h.person.id);
  assert.deepEqual(names('новосибирск'), ['irina', 'marina', 'pavel', 'vasilisa'].sort((a, b) => G.DIRECTORY[a].name.localeCompare(G.DIRECTORY[b].name, 'ru')), 'по городу');
  assert.ok(names('супервизор').includes('marina') && names('супервизор').includes('leonid'), 'по подписи');
  assert.ok(names('интервизи').includes('vladislav'), 'по названию группы, в которой состоит (чат-собеседник тоже находится)');
  assert.deepEqual(names('🧩'), ['anton', 'bogdan', 'timur', 'vladislav'].sort((a, b) => (G.DIRECTORY[a]?.name ?? chats.find((c) => c.id === a).name).localeCompare(G.DIRECTORY[b]?.name ?? chats.find((c) => c.id === b).name, 'ru')), 'по значку группы: Денис скрыл значок и не показан');
  assert.deepEqual(names(''), [], 'пустой запрос людей не ищет');
  assert.ok(!names('алексей').includes(G.ME), 'вас в поиске нет');
  assert.ok(!names('максим').length, 'клиент в группах не состоит и не находится');
  const unlisted = { ...s, members: s.members.map((m) => (m.personId === 'kirill' ? { ...m, listed: false } : m)) };
  assert.ok(!G.findPeople(unlisted, chats, 'андреев').length, 'вышедший из списка не находится');
  const found = G.findPeople(s, chats, 'КИРИЛЛ');
  assert.equal(found[0].person.id, 'kirill', 'регистр не важен');
  assert.deepEqual(found[0].emblems.map((e) => e.group.id), ['class-2026']);
});

test('группы под запрос: по названию, городу и значку', async () => {
  const G = await launch();
  const { groups } = G.getGroupsState();
  const ids = (q) => G.searchGroups(groups, q).map((g) => g.id);
  assert.deepEqual(ids('урал'), ['ural-intervision']);
  assert.deepEqual(ids('москва').sort(), ['kids', 'msk-intervision']);
  assert.deepEqual(ids('🧩'), ['kpt-lab']);
  assert.deepEqual(ids('🛋'), ['nsk-psa'], 'без варианта начертания тоже находит');
  assert.equal(ids('').length, groups.length, 'пустой запрос — все группы');
  assert.deepEqual(ids('такого нет'), []);
  assert.equal(G.popularGroups(G.getGroupsState(), 3).length, 3);
  assert.equal(G.popularGroups(G.getGroupsState(), 1)[0].id, 'kpt-lab', 'самая многолюдная первой');
});

test('сохранение: созданное и выбранное переживает перезапуск; чужая версия, мусор и пустота дают пример', async () => {
  const A = await launch();
  const made = A.createGroup(input({ name: 'Томский круг', emblem: { emoji: '🦉', tone: 'teal' } }));
  assert.ok(made.ok);
  A.joinGroup('class-2026', { ...FLAGS, audience: 'peers' });
  A.setMyFlags('kpt-lab', { showEmblem: false });
  A.publish(made.group.id, 'Первая запись');
  A.setMyStatus({ emoji: '🟢', text: 'Принимаю новых клиентов' });
  A.answerRequest('req-timur', true);

  const B = await launch(true);
  const s = B.getGroupsState();
  assert.ok(s.groups.some((g) => g.id === made.group.id && g.name === 'Томский круг'), 'созданная группа на месте');
  assert.equal(B.membership(s.members, 'class-2026', B.ME)?.audience, 'peers');
  assert.equal(B.membership(s.members, 'kpt-lab', B.ME)?.showEmblem, false);
  assert.ok(s.posts.some((p) => p.text === 'Первая запись'));
  assert.equal(s.status?.text, 'Принимаю новых клиентов');
  assert.ok(B.membership(s.members, 'ural-intervision', 'timur'), 'принятая заявка осталась принятой');

  // Другая версия тестовых данных: начинаем с примера
  const saved = JSON.parse(memory.get('seans.groups.v1'));
  memory.set('seans.groups.v1', JSON.stringify({ ...saved, seed: B.SEED_VERSION + 1 }));
  assert.equal((await launch(true)).getGroupsState().groups.length, 6, 'чужая версия отброшена');
  memory.set('seans.groups.v1', '{нечитаемое');
  assert.equal((await launch(true)).getGroupsState().groups.length, 6, 'мусор вместо JSON — пример');
  memory.set('seans.groups.v1', JSON.stringify({ seed: B.SEED_VERSION, state: { groups: [], members: [] } }));
  assert.equal((await launch(true)).getGroupsState().groups.length, 6, 'пустое состояние — пример');
});

test('сохранённое чистится: битые записи отбрасываются, группа без владельца и осиротевшие записи уходят', async () => {
  const G = await launch();
  const good = G.getGroupsState();
  const dirty = JSON.parse(JSON.stringify(good));
  dirty.groups.push({ id: 'bad', name: '', emblem: { emoji: '🙂', tone: 'blue' } }, { id: 'ghost', name: 'Без владельца', emblem: { emoji: '👻', tone: 'gray' }, about: '', city: '', join: 'open', channel: 'public', owner: 'x', createdAt: 1 });
  dirty.groups[0].emblem.tone = 'нет-такого-цвета';
  dirty.members.push({ groupId: 'nope', personId: 'irina', role: 'member', since: 1, showEmblem: true, listed: true, audience: 'all' }, 5, null, { groupId: 'kids' });
  dirty.posts.push({ id: 'pp', groupId: 'nope', author: 'x', at: 1, text: 'сирота' });
  dirty.members.find((m) => m.groupId === 'kids' && m.personId === 'olga').audience = 'всем-подряд';
  const out = G.sanitize(dirty);
  assert.ok(out);
  assert.equal(out.groups.length, good.groups.length - 1, 'группа с несуществующим цветом, битая и без владельца отброшены');
  assert.ok(!out.groups.some((g) => g.id === 'bad' || g.id === 'ghost'));
  assert.ok(!out.members.some((m) => m.groupId === 'nope'), 'участники несуществующей группы ушли');
  assert.ok(!out.posts.some((p) => p.id === 'pp'));
  assert.equal(out.members.find((m) => m.groupId === 'kids' && m.personId === 'olga').audience, 'all', 'непонятная аудитория вернулась к «всем»');
  assert.equal(G.sanitize(null), null);
  assert.equal(G.sanitize('строка'), null);
});

test('дата записи: сегодня, вчера и давнее', async () => {
  const G = await launch();
  const noon = new Date(2026, 9, 22, 12, 0).getTime();
  assert.equal(G.whenLabel(new Date(2026, 9, 22, 9, 5).getTime(), noon), 'сегодня, 09:05');
  assert.equal(G.whenLabel(new Date(2026, 9, 21, 23, 40).getTime(), noon), 'вчера, 23:40');
  assert.equal(G.whenLabel(new Date(2026, 9, 3, 10, 0).getTime(), noon), '3 октября');
});

test('люди: профиль чата и каталога, первое слово — имя', async () => {
  const G = await launch();
  const chats = G.getChats();
  assert.equal(G.personOf('vladislav', chats)?.city, 'Москва', 'собеседник из чатов');
  assert.equal(G.personOf('irina', chats)?.name, 'Ирина Кравец', 'специалист из каталога');
  assert.equal(G.personOf('нет', chats), undefined);
  assert.ok(G.profileOf('irina') && G.profileOf('vladislav') && !G.profileOf('нет'));
  assert.ok(G.hasChat('vladislav', chats) && !G.hasChat('irina', chats));
});
