// Проверка групп и каналов: права, создание, профиль, участники, администраторы, ссылки-приглашения, вступление, заявки, выход: npm run test:groups
// Хранилище групп не зависит от экранов, поэтому собирается esbuild и запускается в Node как есть. Каждая проверка получает свежую копию
// хранилища (начальные данные те же, что в приложении), а таймеры «живости» (одобрение заявки, просмотры, ответы участников) собираются
// в очередь и запускаются руками: проверка не ждёт секунды и не зависит от случая.
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

// Окружение браузера, которое трогают модули данных
const timers = [];
globalThis.window = {
  location: { origin: 'https://seans.test', pathname: '/' },
  setTimeout: (fn) => {
    timers.push(fn);
    return timers.length;
  },
  clearTimeout: () => undefined,
  setInterval: () => 0,
  clearInterval: () => undefined,
};
const runTimers = () => {
  for (let guard = 0; timers.length && guard < 200; guard += 1) timers.shift()();
};
// Случай отключён: никто сам не отвечает и не ставит реакций; нужное значение включается на одну проверку
Math.random = () => 0.9;
const withRandom = async (value, fn) => {
  Math.random = () => value;
  try {
    return await fn();
  } finally {
    Math.random = () => 0.9;
  }
};

// Профиль лежит в localStorage и IndexedDB, картинки — файлы: для проверки хватает имени и заглушек
const stubs = {
  name: 'stubs',
  setup(build) {
    build.onResolve({ filter: /^\.\/profile$/ }, () => ({ path: 'profile', namespace: 'stub' }));
    build.onLoad({ filter: /^profile$/, namespace: 'stub' }, () => ({ contents: "export const getProfileName = () => 'Алексей Воронин';", loader: 'js' }));
    build.onLoad({ filter: /\.(png|webp|jpe?g|svg)$/ }, () => ({ contents: "export default 'asset';", loader: 'js' }));
  },
};

const built = await esbuild.build({
  stdin: {
    contents: `
      export * from './src/data/groups';
      export { getChat, getChats, getMessages, sendMessage, ensureContactChat } from './src/data/chatStore';
      export { CONTACTS, ME, authorColor, nameOf } from './src/data/contacts';
      export { initialsAvatar, isGenerated, heroAvatar, initialsOf } from './src/utils/initialsAvatar';
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  plugins: [stubs],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'error',
});
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-groups-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

let runs = 0;
/** Свежая копия хранилища: у каждой проверки начальные данные и пустая очередь таймеров */
const fresh = async () => {
  timers.length = 0;
  runs += 1;
  return import(`${pathToFileURL(file).href}?run=${runs}`);
};

const draft = (over = {}) => ({ kind: 'group', name: 'Тестовая группа', description: '', photo: null, members: ['anna', 'igor'], isPublic: false, username: '', ...over });
const texts = (g) => g.log.map((e) => e.text);
const ids = (g) => g.members.map((m) => m.id);
const messagesOf = (L, id) => L.getMessages(id).flatMap((x) => x.messages);
/** Та же группа, но ваша запись в ней изменена: так проверяются права администратора, которым вас нельзя сделать напрямую */
const asMe = (L, g, patch) => ({ ...g, members: g.members.map((m) => (m.id === L.ME ? { ...m, ...patch } : m)) });
const noRights = (L) => Object.fromEntries(L.RIGHT_KEYS.map((k) => [k, false]));
/** Вступить в «Молодых психологов» (по заявке) и дождаться одобрения */
const joinYoung = (L) => {
  assert.equal(L.joinGroup('@young_psy'), 'requested');
  runTimers();
  assert.ok(L.isMember(L.getGroup('pub-young')));
};

test('начальные данные: вы владелец «Супервизии» и подписчик канала, в публичные ещё не вступали', async () => {
  const L = await fresh();
  const sup = L.getGroup('supervision');
  assert.equal(sup.kind, 'group');
  assert.equal(L.myRole(sup), 'owner');
  assert.equal(sup.members.length, 6);
  assert.equal(sup.requests.length, 2);
  const bogdan = sup.members.find((m) => m.id === 'bogdan');
  assert.equal(bogdan.role, 'admin');
  assert.equal(bogdan.title, 'Куратор');
  assert.equal(sup.links.filter((l) => l.primary).length, 1);

  const myths = L.getGroup('psy-myths');
  assert.equal(myths.kind, 'channel');
  assert.equal(L.myRole(myths), 'member');
  for (const id of ['pub-young', 'pub-cbt']) {
    assert.equal(L.isMember(L.getGroup(id)), false);
    assert.equal(L.getGroup(id).isPublic, true);
    assert.equal(L.getChat(id), undefined, 'чата в списке ещё нет');
  }
  assert.ok(L.getChat('supervision') && L.getChat('psy-myths'));
  assert.equal(L.getGroup('нет такой'), undefined);
});

test('справочники: права по умолчанию, подписи прав и разрешений, медленный режим', async () => {
  const L = await fresh();
  const group = L.defaultRights('group');
  const channel = L.defaultRights('channel');
  assert.equal(group.addAdmins, false, 'других администраторов новый администратор не назначает');
  assert.equal(channel.addAdmins, false);
  assert.equal(group.postMessages, false);
  assert.equal(channel.postMessages, true);
  assert.equal(channel.editMessages, true);
  for (const kind of ['group', 'channel']) {
    const keys = L.RIGHT_LABELS[kind].map((r) => r.key);
    assert.equal(new Set(keys).size, keys.length, 'права в списке не повторяются');
    for (const key of keys) assert.ok(L.RIGHT_KEYS.includes(key), key);
  }
  assert.deepEqual(L.PERMISSION_LABELS.map((p) => p.key).sort(), Object.keys(L.DEFAULT_PERMISSIONS).sort());
  assert.deepEqual(L.SLOW_MODES.map((s) => L.slowLabel(s)), ['Выкл.', '10 с', '30 с', '1 мин', '5 мин', '15 мин', '1 ч']);
});

test('права владельца: можно всё', async () => {
  const L = await fresh();
  const g = L.getGroup(L.createGroup(draft()));
  for (const key of L.RIGHT_KEYS) assert.ok(L.can(g, key), key);
  assert.ok(L.canWrite(g) && L.canSendMedia(g) && L.canInvite(g) && L.canPin(g) && L.canChangeInfo(g) && L.canDeleteOthers(g));
  const anna = g.members.find((m) => m.id === 'anna');
  assert.ok(L.canManage(g, anna), 'пользователя можно убрать');
  assert.equal(L.canManage(g, g.members.find((m) => m.id === L.ME)), false, 'себя — нельзя');
});

test('личный чат (группы нет): писать, закреплять и удалять чужое можно, звать и менять профиль — нет', async () => {
  const L = await fresh();
  assert.equal(L.can(undefined, 'banUsers'), false);
  assert.equal(L.canWrite(undefined), true);
  assert.equal(L.canSendMedia(undefined), true);
  assert.equal(L.canPin(undefined), true);
  assert.equal(L.canDeleteOthers(undefined), true);
  assert.equal(L.canInvite(undefined), false);
  assert.equal(L.canChangeInfo(undefined), false);
});

test('права администратора группы: только отмеченное', async () => {
  const L = await fresh();
  const base = L.getGroup('supervision');
  const admin = (over) => asMe(L, base, { role: 'admin', rights: { ...noRights(L), ...over } });
  const g = admin({ banUsers: true, pinMessages: true });
  assert.ok(L.can(g, 'banUsers') && L.can(g, 'pinMessages'));
  for (const key of ['addAdmins', 'changeInfo', 'deleteMessages', 'inviteUsers']) assert.equal(L.can(g, key), false, key);
  assert.ok(L.canWrite(g) && L.canSendMedia(g) && L.canPin(g));
  assert.equal(L.canChangeInfo(g), false);
  assert.equal(L.canInvite(g), false, 'без права приглашать нельзя, даже если это разрешено пользователям');
  assert.equal(L.canDeleteOthers(g), false);

  const member = (id) => g.members.find((m) => m.id === id);
  assert.ok(L.canManage(g, member('anna')), 'пользователя убрать можно');
  assert.equal(L.canManage(g, member('bogdan')), false, 'другого администратора — нет');
  assert.equal(L.canManage(g, member(L.ME)), false, 'себя — нет');
  assert.equal(L.canManage(g, { id: 'vladislav', role: 'owner', joinedAt: '' }), false, 'владельца — нет');
  const noBan = admin({ pinMessages: true });
  assert.equal(L.canManage(noBan, noBan.members.find((m) => m.id === 'anna')), false, 'без права блокировать пользователей не убрать');

  const full = admin({ changeInfo: true, deleteMessages: true, inviteUsers: true });
  assert.ok(L.canChangeInfo(full) && L.canDeleteOthers(full) && L.canInvite(full));
});

test('права в канале: писать и закреплять могут только администраторы с правом публикации', async () => {
  const L = await fresh();
  const myths = L.getGroup('psy-myths'); // вы подписчик
  assert.equal(L.canWrite(myths), false);
  assert.equal(L.canPin(myths), false);
  assert.equal(L.canInvite(myths), false, 'подписчик людей не зовёт');
  assert.equal(L.canChangeInfo(myths), false);
  assert.equal(L.canDeleteOthers(myths), false);

  const rights = (over) => ({ ...L.defaultRights('channel'), ...over });
  const poster = asMe(L, myths, { role: 'admin', rights: rights({ postMessages: true }) });
  assert.ok(L.canWrite(poster) && L.canPin(poster));
  const editor = asMe(L, myths, { role: 'admin', rights: rights({ postMessages: false, inviteUsers: true }) });
  assert.equal(L.canWrite(editor), false);
  assert.equal(L.canPin(editor), false);
  assert.ok(L.canInvite(editor));

  const owner = asMe(L, myths, { role: 'owner' });
  assert.ok(L.canWrite(owner) && L.canPin(owner) && L.canInvite(owner) && L.canChangeInfo(owner) && L.canDeleteOthers(owner));
});

test('права обычного пользователя группы: общие разрешения и запрет писать', async () => {
  const L = await fresh();
  const base = L.getGroup('supervision');
  const member = (perms = {}, patch = {}) => ({ ...asMe(L, base, { role: 'member', rights: undefined, ...patch }), permissions: { ...base.permissions, ...perms } });

  let g = member();
  assert.ok(L.canWrite(g) && L.canSendMedia(g) && L.canInvite(g));
  assert.equal(L.canPin(g), false);
  assert.equal(L.canChangeInfo(g), false);
  assert.equal(L.canDeleteOthers(g), false);
  assert.equal(L.can(g, 'banUsers'), false);

  assert.equal(L.canWrite(member({ sendMessages: false })), false);
  g = member({ sendMedia: false });
  assert.equal(L.canSendMedia(g), false);
  assert.equal(L.canWrite(g), true, 'текст при этом можно');
  assert.equal(L.canInvite(member({ addMembers: false })), false);
  assert.ok(L.canPin(member({ pinMessages: true })));
  assert.ok(L.canChangeInfo(member({ changeInfo: true })));

  g = member({}, { silenced: true });
  assert.equal(L.canWrite(g), false, 'ограниченному писать нельзя');
  assert.equal(L.canSendMedia(g), false);

  // Кто не состоит в группе, не может ничего
  const outsider = { ...base, members: base.members.filter((m) => m.id !== L.ME) };
  for (const check of [L.canWrite, L.canSendMedia, L.canInvite, L.canPin, L.canChangeInfo]) assert.equal(check(outsider), false);
});

test('адрес @имя: пусто, коротко, длинно, недопустимые знаки, занято, свободно', async () => {
  const L = await fresh();
  assert.equal(L.usernameStatus(''), 'empty');
  assert.equal(L.usernameStatus('  @ '), 'empty');
  assert.equal(L.usernameStatus('psy'), 'short');
  assert.equal(L.usernameStatus('a'.repeat(33)), 'long');
  assert.equal(L.usernameStatus('a'.repeat(32)), 'free');
  assert.equal(L.usernameStatus('1psyabc'), 'invalid');
  assert.equal(L.usernameStatus('пси_канал'), 'invalid');
  assert.equal(L.usernameStatus('psy-канал'), 'invalid');
  assert.equal(L.usernameStatus('young_psy'), 'taken');
  assert.equal(L.usernameStatus('@YOUNG_PSY'), 'taken', 'регистр не важен');
  const person = L.CONTACTS.find((c) => c.username).username;
  assert.equal(L.usernameStatus(person), 'taken', 'адрес человека занят');
  assert.equal(L.usernameStatus('young_psy', 'pub-young'), 'free', 'свой адрес не мешает сам себе');
  assert.equal(L.usernameStatus('free_name_42'), 'free');
  for (const status of ['empty', 'short', 'long', 'invalid', 'taken', 'free']) assert.ok(L.USERNAME_TEXT[status], `есть текст для «${status}»`);
});

test('подписи с числами: склонение и «в сети»', async () => {
  const L = await fresh();
  const forms = [[1, 'пользователь'], [2, 'пользователя'], [4, 'пользователя'], [5, 'пользователей'], [11, 'пользователей'], [12, 'пользователей'], [21, 'пользователь'], [22, 'пользователя'], [100, 'пользователей'], [101, 'пользователь']];
  for (const [n, word] of forms) assert.equal(L.countWord('group', n), word, String(n));
  assert.deepEqual([1, 3, 7, 11].map((n) => L.countWord('channel', n)), ['подписчик', 'подписчика', 'подписчиков', 'подписчиков']);
  assert.equal(L.kindWord('group'), 'общий чат');
  assert.equal(L.kindWord('channel'), 'канал');

  const sup = L.getGroup('supervision');
  assert.equal(L.countText(sup), '6 пользователей');
  const online = sup.members.filter((m) => m.id === L.ME || L.CONTACTS.find((c) => c.id === m.id)?.online).length;
  assert.ok(online >= 1);
  assert.equal(L.onlineCount(sup), online);
  assert.equal(L.subtitleOf(sup), `6 пользователей, ${online} в сети`);
  const myths = L.getGroup('psy-myths');
  assert.equal(L.countText(myths), '7 подписчиков');
  assert.equal(L.subtitleOf(myths), '7 подписчиков', 'в канале «в сети» не пишут');
});

test('ссылки для показа: настоящий адрес этого приложения', async () => {
  const L = await fresh();
  assert.equal(L.inviteUrl('Abc123'), 'https://seans.test/#/join/Abc123');
  assert.equal(L.publicUrl('young_psy'), 'https://seans.test/#/join/@young_psy');
  assert.equal(L.shortUrl('https://seans.test/#/join/Abc123'), 'Seans/#/join/Abc123');
  assert.equal(L.shortUrl('http://x.y'), 'Seans/');
});

test('создание группы: вы владелец, пользователи добавлены, чат в списке, записи в переписке и журнале', async () => {
  const L = await fresh();
  const before = L.getChats().length;
  const id = L.createGroup(draft({ name: '  Моя группа  ', description: ' О чём-то ' }));
  const g = L.getGroup(id);
  assert.equal(g.name, 'Моя группа');
  assert.equal(g.description, 'О чём-то');
  assert.equal(g.kind, 'group');
  assert.deepEqual(ids(g), [L.ME, 'anna', 'igor']);
  assert.deepEqual(g.members.map((m) => m.role), ['owner', 'member', 'member']);
  assert.equal(g.isPublic, false);
  assert.equal(g.username, '');
  assert.equal(g.joinApproval, false);
  assert.equal(g.historyVisible, true);
  assert.equal(g.slowMode, 0);
  assert.deepEqual(g.permissions, { sendMessages: true, sendMedia: true, addMembers: true, pinMessages: false, changeInfo: false });
  assert.deepEqual(g.reactions, L.REACTION_CHOICES);
  assert.ok(L.isGenerated(g.avatar), 'без фото — цветные инициалы');

  assert.equal(g.links.length, 1);
  assert.ok(g.links[0].primary && L.isLinkAlive(g.links[0]));
  assert.deepEqual(texts(g), ['Вы создали общий чат «Моя группа»']);

  assert.equal(L.getChats().length, before + 1);
  const chat = L.getChat(id);
  assert.equal(chat.kind, 'group');
  assert.equal(chat.name, 'Моя группа');
  assert.equal(chat.avatar, g.avatar);
  const lines = messagesOf(L, id);
  assert.deepEqual(lines.map((m) => m.text), ['Вы создали общий чат «Моя группа»', 'Вы добавили пользователей: Анна Королёва, Игорь Назаров']);
  assert.ok(lines.every((m) => m.service));
  assert.equal(chat.lastMessage, 'Вы добавили пользователей: Анна Королёва, Игорь Назаров');

  const one = L.createGroup(draft({ members: ['anna'] }));
  assert.equal(messagesOf(L, one)[1].text, 'Вы добавили пользователя: Анна Королёва');
  const alone = L.createGroup(draft({ members: [] }));
  assert.equal(messagesOf(L, alone).length, 1, 'никого не добавили — записи об этом нет');
  assert.equal(L.countText(L.getGroup(alone)), '1 пользователь');
});

test('создание канала: публичный с адресом, своё фото остаётся как есть, подписчики без записи в переписке', async () => {
  const L = await fresh();
  const photo = 'data:image/jpeg;base64,AAAA';
  const id = L.createGroup(draft({ kind: 'channel', name: 'Мой канал', members: ['anna', 'igor', 'elena'], isPublic: true, username: '@my_channel_1', photo }));
  const g = L.getGroup(id);
  assert.equal(g.kind, 'channel');
  assert.equal(g.isPublic, true);
  assert.equal(g.username, 'my_channel_1', '«@» в адрес не входит');
  assert.equal(g.avatar, photo);
  assert.equal(L.isGenerated(g.avatar), false);
  assert.equal(L.countText(g), '4 подписчика');
  assert.deepEqual(texts(g), ['Вы создали канал «Мой канал»']);
  assert.deepEqual(messagesOf(L, id).map((m) => m.text), ['Вы создали канал «Мой канал»']);
  assert.equal(L.getChat(id).kind, 'channel');
  assert.ok(L.canWrite(g), 'владелец канала публикует');
  assert.equal(L.usernameStatus('my_channel_1'), 'taken');
  const found = L.lookupJoin('@my_channel_1');
  assert.equal(found.status, 'ok');
  assert.equal(found.group.chatId, id);
  assert.equal(found.member, true);
});

test('профиль: название меняет цветные инициалы, своё фото не трогает; всё пишется в журнал и переписку', async () => {
  const L = await fresh();
  const id = L.createGroup(draft({ name: 'Первая группа' }));
  const first = L.getGroup(id).avatar;

  L.updateInfo(id, { name: 'Вторая школа' });
  let g = L.getGroup(id);
  assert.equal(g.name, 'Вторая школа');
  assert.notEqual(g.avatar, first, 'инициалы пересчитаны');
  assert.equal(L.getChat(id).name, 'Вторая школа');
  assert.equal(L.getChat(id).avatar, g.avatar);
  assert.ok(texts(g).includes('Вы изменили название общего чата на «Вторая школа»'));
  assert.ok(messagesOf(L, id).some((m) => m.service && m.text === 'Вы изменили название общего чата на «Вторая школа»'));

  L.updateInfo(id, { name: '   ' });
  assert.equal(L.getGroup(id).name, 'Вторая школа', 'пустое название не принимается');

  L.updateInfo(id, { description: 'Новое описание' });
  assert.equal(L.getGroup(id).description, 'Новое описание');
  assert.ok(texts(L.getGroup(id)).includes('Вы изменили описание общего чата'));
  L.updateInfo(id, { description: '' });
  assert.equal(L.getGroup(id).description, '');
  assert.ok(texts(L.getGroup(id)).includes('Вы удалили описание общего чата'));

  const photo = 'data:image/jpeg;base64,BBBB';
  L.updateInfo(id, { photo });
  g = L.getGroup(id);
  assert.equal(g.avatar, photo);
  assert.equal(L.getChat(id).avatar, photo);
  assert.ok(texts(g).includes('Вы обновили фото общего чата'));
  L.updateInfo(id, { name: 'Третья школа' });
  assert.equal(L.getGroup(id).avatar, photo, 'своё фото остаётся при смене названия');
  L.updateInfo(id, { photo: null });
  g = L.getGroup(id);
  assert.ok(L.isGenerated(g.avatar), 'без фото снова инициалы');
  assert.equal(L.initialsOf(g.name), 'ТШ');
  assert.ok(texts(g).includes('Вы удалили фото общего чата'));

  const same = L.getGroup(id);
  L.updateInfo(id, { name: 'Третья школа', description: '' });
  assert.equal(L.getGroup(id), same, 'без изменений ничего не меняется и в журнал не пишется');
  L.updateInfo('нет такой', { name: 'Что-то' });

  const channel = L.createGroup(draft({ kind: 'channel', name: 'Канал' }));
  L.updateInfo(channel, { name: 'Другой канал' });
  assert.ok(messagesOf(L, channel).some((m) => m.service && m.text === 'Вы изменили название канала на «Другой канал»'), 'в канале изменение профиля тоже видно');
});

test('тип: публичным можно сделать только со свободным адресом, частным — без адреса и заявок', async () => {
  const L = await fresh();
  const id = L.createGroup(draft());
  L.setType(id, true, 'young_psy');
  assert.equal(L.getGroup(id).isPublic, false, 'занятый адрес не принят');
  L.setType(id, true, 'ab');
  assert.equal(L.getGroup(id).isPublic, false, 'короткий адрес не принят');

  L.setType(id, true, '@Free_Group_77');
  let g = L.getGroup(id);
  assert.ok(g.isPublic);
  assert.equal(g.username, 'Free_Group_77');
  assert.ok(texts(g).includes('Вы сделали общий чат публичным: @Free_Group_77'));
  assert.equal(L.lookupJoin('@free_group_77').status, 'ok', 'регистр адреса не важен');
  const len = g.log.length;
  L.setType(id, true, 'Free_Group_77');
  assert.equal(L.getGroup(id).log.length, len, 'тот же тип и адрес — записи нет');

  L.setSetting(id, { joinApproval: true });
  assert.ok(L.getGroup(id).joinApproval);
  L.setType(id, false);
  g = L.getGroup(id);
  assert.equal(g.isPublic, false);
  assert.equal(g.username, '');
  assert.equal(g.joinApproval, false, 'у частной группы заявок нет');
  assert.ok(texts(g).includes('Вы сделали общий чат частным'));
  assert.equal(L.usernameStatus('free_group_77'), 'free', 'адрес освободился');
  assert.equal(L.lookupJoin('@free_group_77').status, 'invalid');

  const channel = L.createGroup(draft({ kind: 'channel' }));
  L.setType(channel, true, 'chan_address');
  assert.ok(texts(L.getGroup(channel)).includes('Вы сделали канал публичным: @chan_address'));
  L.setType(channel, false);
  assert.ok(texts(L.getGroup(channel)).includes('Вы сделали канал частным'));
});

test('настройки: каждое изменение пишется в журнал один раз, повтор того же значения — нет', async () => {
  const L = await fresh();
  const id = L.createGroup(draft());
  L.setSetting(id, { protectContent: true, slowMode: 30 });
  let g = L.getGroup(id);
  assert.ok(g.protectContent);
  assert.equal(g.slowMode, 30);
  assert.ok(texts(g).includes('Вы запретили сохранять и пересылать содержимое'));
  assert.ok(texts(g).includes('Вы включили медленный режим: 30 с'));

  const len = g.log.length;
  L.setSetting(id, { protectContent: true, slowMode: 30 });
  assert.equal(L.getGroup(id).log.length, len);

  L.setSetting(id, { slowMode: 0, reactions: [], signatures: true, historyVisible: false });
  g = L.getGroup(id);
  assert.deepEqual(g.reactions, []);
  assert.ok(g.signatures && !g.historyVisible);
  for (const line of ['Вы выключили медленный режим', 'Вы выключили реакции', 'Вы включили подписи авторов', 'Вы скрыли историю от новых пользователей']) assert.ok(texts(g).includes(line), line);
  L.setSetting(id, { reactions: ['👍', '🔥'] });
  assert.ok(texts(L.getGroup(id)).includes('Вы изменили разрешённые реакции: 👍 🔥'));

  L.setPermissions(id, { sendMedia: false, pinMessages: true });
  assert.deepEqual(L.getGroup(id).permissions, { sendMessages: true, sendMedia: false, addMembers: true, pinMessages: true, changeInfo: false });
  assert.ok(texts(L.getGroup(id)).includes('Вы изменили разрешения пользователей'));
});

test('журнал держит последние 200 записей, новые сверху', async () => {
  const L = await fresh();
  const id = L.createGroup(draft());
  for (let i = 0; i < 205; i += 1) L.setSetting(id, { protectContent: i % 2 === 0 });
  const g = L.getGroup(id);
  assert.equal(g.log.length, 200);
  assert.equal(g.log[0].text, 'Вы запретили сохранять и пересылать содержимое', 'последнее изменение — вверху');
  assert.ok(g.log.every((e, i) => i === 0 || g.log[i - 1].at >= e.at));
});

test('пользователи: добавление без повторов, удаление, блокировка и разблокировка', async () => {
  const L = await fresh();
  const id = L.createGroup(draft({ members: ['anna'] }));
  L.addMembers(id, ['anna', 'igor', 'elena']);
  assert.deepEqual(ids(L.getGroup(id)), [L.ME, 'anna', 'igor', 'elena']);
  assert.ok(texts(L.getGroup(id)).includes('Вы добавили пользователей: Игорь Назаров, Елена Миронова'));
  assert.ok(messagesOf(L, id).some((m) => m.service && m.text === 'Вы добавили пользователей: Игорь Назаров, Елена Миронова'));
  L.addMembers(id, ['olga']);
  assert.ok(texts(L.getGroup(id)).includes('Вы добавили пользователя: Ольга Громова'));
  const len = L.getGroup(id).log.length;
  L.addMembers(id, ['anna', 'olga']);
  assert.equal(L.getGroup(id).log.length, len, 'кто уже в группе, повторно не добавляется');

  L.removeMember(id, 'igor');
  assert.equal(ids(L.getGroup(id)).includes('igor'), false);
  assert.deepEqual(L.getGroup(id).banned, []);
  assert.ok(texts(L.getGroup(id)).includes('Вы удалили пользователя: Игорь Назаров'));
  L.removeMember(id, 'elena', true);
  assert.deepEqual(L.getGroup(id).banned, ['elena']);
  assert.ok(texts(L.getGroup(id)).includes('Вы заблокировали пользователя: Елена Миронова'));

  L.addMembers(id, ['elena']);
  assert.equal(ids(L.getGroup(id)).includes('elena'), false, 'заблокированного не добавить');
  L.unban(id, 'elena');
  assert.deepEqual(L.getGroup(id).banned, []);
  assert.ok(texts(L.getGroup(id)).includes('Вы разблокировали: Елена Миронова'));
  L.addMembers(id, ['elena']);
  assert.ok(ids(L.getGroup(id)).includes('elena'));

  const after = L.getGroup(id).log.length;
  L.removeMember(id, 'нет такого');
  assert.equal(L.getGroup(id).log.length, after);

  const channel = L.createGroup(draft({ kind: 'channel', members: [] }));
  const posts = messagesOf(L, channel).length;
  L.addMembers(channel, ['anna']);
  assert.ok(texts(L.getGroup(channel)).includes('Вы добавили подписчика: Анна Королёва'));
  L.removeMember(channel, 'anna', true);
  assert.ok(texts(L.getGroup(channel)).includes('Вы заблокировали подписчика: Анна Королёва'));
  assert.equal(messagesOf(L, channel).length, posts, 'в ленте канала служебных записей о подписчиках нет');
});

test('запрет писать: ставится и снимается; вам самим тоже можно запретить', async () => {
  const L = await fresh();
  const id = L.createGroup(draft({ members: ['anna'] }));
  L.silenceMember(id, 'anna', true);
  assert.equal(L.getGroup(id).members.find((m) => m.id === 'anna').silenced, true);
  assert.ok(texts(L.getGroup(id)).includes('Вы запретили писать: Анна Королёва'));
  L.silenceMember(id, 'anna', false);
  assert.equal(L.getGroup(id).members.find((m) => m.id === 'anna').silenced, undefined);
  assert.ok(texts(L.getGroup(id)).includes('Вы разрешили писать: Анна Королёва'));

  // В чужой группе вы обычный участник, и администратор может ограничить вас
  joinYoung(L);
  assert.ok(L.canWrite(L.getGroup('pub-young')));
  L.silenceMember('pub-young', L.ME, true);
  assert.equal(L.canWrite(L.getGroup('pub-young')), false);
  assert.equal(L.canSendMedia(L.getGroup('pub-young')), false);
  L.silenceMember('pub-young', L.ME, false);
  assert.ok(L.canWrite(L.getGroup('pub-young')));
});

test('администраторы: назначение с правами и подписью, изменение, снятие; владельца не тронуть', async () => {
  const L = await fresh();
  const id = L.createGroup(draft({ members: ['anna', 'igor'] }));
  const rights = { ...noRights(L), banUsers: true, inviteUsers: true };
  L.setAdmin(id, 'anna', rights, '  Помощница директора по учебной части  ', true);
  let anna = L.getGroup(id).members.find((m) => m.id === 'anna');
  assert.equal(anna.role, 'admin');
  assert.equal(anna.title, 'Помощница директ', 'подпись не длиннее 16 знаков');
  assert.equal(anna.title.length, 16);
  assert.equal(anna.anonymous, true);
  assert.deepEqual(anna.rights, rights);
  assert.ok(texts(L.getGroup(id)).includes('Вы назначили администратором: Анна Королёва'));
  assert.ok(messagesOf(L, id).some((m) => m.service && m.text === 'Вы назначили администратором: Анна Королёва'));
  assert.ok(L.canManage(L.getGroup(id), anna), 'владелец управляет администратором');

  const notes = messagesOf(L, id).length;
  L.setAdmin(id, 'anna', L.defaultRights('group'), '', false);
  anna = L.getGroup(id).members.find((m) => m.id === 'anna');
  assert.equal(anna.role, 'admin');
  assert.equal(anna.title, undefined);
  assert.equal(anna.anonymous, undefined);
  assert.ok(texts(L.getGroup(id)).includes('Вы изменили права администратора: Анна Королёва'));
  assert.equal(messagesOf(L, id).length, notes, 'смена прав в переписке не отмечается');

  const joinedAt = anna.joinedAt;
  L.setAdmin(id, 'anna', null);
  anna = L.getGroup(id).members.find((m) => m.id === 'anna');
  assert.deepEqual(anna, { id: 'anna', role: 'member', joinedAt });
  assert.ok(texts(L.getGroup(id)).includes('Вы сняли администратора: Анна Королёва'));

  L.setAdmin(id, L.ME, null);
  assert.equal(L.myRole(L.getGroup(id)), 'owner', 'владельца снять нельзя');
  L.setAdmin(id, 'нет такого', L.defaultRights('group'));
  assert.equal(L.getGroup(id).members.length, 3);

  const channel = L.createGroup(draft({ kind: 'channel', members: ['anna'] }));
  L.setAdmin(channel, 'anna', L.defaultRights('channel'), 'Редактор', true);
  const editor = L.getGroup(channel).members.find((m) => m.id === 'anna');
  assert.equal(editor.title, 'Редактор');
  assert.equal(editor.anonymous, undefined, 'анонимность только в группах');
});

test('список пользователей: владелец, администраторы, затем остальные — сначала те, кто в сети, по алфавиту', async () => {
  const L = await fresh();
  const sorted = L.sortedMembers(L.getGroup('supervision'));
  assert.equal(sorted.length, 6);
  assert.equal(sorted[0].id, L.ME);
  assert.equal(sorted[1].id, 'bogdan');
  const rest = sorted.slice(2);
  const online = (m) => Boolean(L.CONTACTS.find((c) => c.id === m.id)?.online);
  const firstOffline = rest.findIndex((m) => !online(m));
  assert.ok(firstOffline === -1 || rest.slice(firstOffline).every((m) => !online(m)), 'в сети — выше');
  const alphabetical = (list) => list.every((m, i) => i === 0 || L.nameOf(list[i - 1].id).localeCompare(L.nameOf(m.id), 'ru') <= 0);
  assert.ok(alphabetical(rest.filter(online)));
  assert.ok(alphabetical(rest.filter((m) => !online(m))));
});

test('ссылки-приглашения: создание, правка, отзыв, удаление отозванной, сброс основной', async () => {
  const L = await fresh();
  const id = L.createGroup(draft());
  const primary = L.getGroup(id).links[0];
  const link = L.createLink(id, { name: '  Для семинара  ', limit: 2, needApproval: false });
  assert.equal(link.name, 'Для семинара');
  assert.equal(link.primary, false);
  assert.equal(link.joined, 0);
  assert.equal(link.limit, 2);
  assert.notEqual(link.code, primary.code);
  assert.match(link.code, /^[A-Za-z0-9]{12}$/);
  assert.equal(L.getGroup(id).links.length, 2);
  assert.ok(texts(L.getGroup(id)).includes('Вы создали ссылку-приглашение «Для семинара»'));
  assert.equal(L.createLink(id, { name: 'а'.repeat(40), needApproval: false }).name.length, 32, 'название ссылки — до 32 знаков');
  assert.equal(L.createLink('нет такой', { name: '', needApproval: false }), undefined);

  const soon = Date.now() + 3600_000;
  L.editLink(id, link.id, { name: 'Для школы', expiresAt: soon, needApproval: true });
  const edited = L.getGroup(id).links.find((l) => l.id === link.id);
  assert.equal(edited.name, 'Для школы');
  assert.equal(edited.limit, undefined, 'лимит снят');
  assert.equal(edited.expiresAt, soon);
  assert.equal(edited.needApproval, true);
  assert.equal(edited.code, link.code, 'адрес ссылки при правке не меняется');

  L.deleteLink(id, link.id);
  assert.ok(L.getGroup(id).links.some((l) => l.id === link.id), 'действующую ссылку удалить нельзя');
  L.revokeLink(id, link.id);
  assert.equal(L.isLinkAlive(L.getGroup(id).links.find((l) => l.id === link.id)), false);
  assert.ok(texts(L.getGroup(id)).includes('Вы отозвали ссылку-приглашение'));
  L.deleteLink(id, link.id);
  assert.equal(L.getGroup(id).links.some((l) => l.id === link.id), false, 'отозванную можно удалить');

  const fresher = L.resetPrimaryLink(id);
  const links = L.getGroup(id).links;
  const old = links.find((l) => l.id === primary.id);
  assert.equal(old.revoked, true);
  assert.equal(old.primary, false);
  assert.ok(links.find((l) => l.id === fresher.id).primary);
  assert.notEqual(fresher.code, primary.code);
  assert.equal(links.filter((l) => l.primary).length, 1, 'основная ссылка одна');
  assert.ok(texts(L.getGroup(id)).includes('Вы сбросили основную ссылку-приглашение'));
  assert.equal(L.lookupJoin(primary.code).status, 'invalid', 'прежняя основная больше не работает');
  assert.equal(L.lookupJoin(fresher.code).status, 'ok');
  L.deleteLink(id, primary.id);
  assert.equal(L.getGroup(id).links.some((l) => l.id === primary.id), false);
  assert.equal(L.resetPrimaryLink('нет такой'), undefined);
});

test('срок и лимит: ссылка перестаёт работать', async () => {
  const L = await fresh();
  const alive = { revoked: false, joined: 0 };
  assert.ok(L.isLinkAlive(alive));
  assert.equal(L.isLinkAlive({ ...alive, revoked: true }), false);
  assert.equal(L.isLinkAlive({ ...alive, expiresAt: Date.now() - 1 }), false);
  assert.ok(L.isLinkAlive({ ...alive, expiresAt: Date.now() + 1000 }));
  assert.equal(L.isLinkAlive({ ...alive, limit: 3, joined: 3 }), false);
  assert.ok(L.isLinkAlive({ ...alive, limit: 3, joined: 2 }));
  assert.ok(L.isLinkAlive({ ...alive, limit: 0, joined: 5 }), 'ноль — без лимита');
});

test('адрес вступления: чужой код, отозванная, просроченная, исчерпанная, заблокированный и публичный @адрес', async () => {
  const L = await fresh();
  assert.equal(L.lookupJoin('nope').status, 'invalid');
  assert.equal(L.lookupJoin('@nobody_here').status, 'invalid');
  assert.equal(L.lookupJoin('@supervision').status, 'invalid', 'у частной группы адреса нет');

  const young = L.lookupJoin('@young_psy');
  assert.equal(young.status, 'ok');
  assert.equal(young.group.chatId, 'pub-young');
  assert.equal(young.needApproval, true);
  assert.equal(young.member, false);
  assert.equal(young.pending, false);
  assert.equal(L.lookupJoin('@Young_Psy').status, 'ok', 'регистр адреса не важен');
  assert.equal(L.lookupJoin('@cbt_start').needApproval, false);

  // Ссылки из начальных данных
  const seminar = L.lookupJoin('Xe8TmW3cJd5H');
  assert.equal(seminar.status, 'ok');
  assert.equal(seminar.link.name, 'Для семинара');
  assert.equal(seminar.needApproval, true);
  assert.equal(seminar.member, true, 'вы в этой группе владелец');
  assert.equal(L.lookupJoin('Ys5KcB7nVf2D').needApproval, false, 'у основной ссылки заявок нет, даже если по адресу они нужны');

  const id = L.createGroup(draft({ members: [] }));
  const code = L.getGroup(id).links[0].code;
  const gone = L.createLink(id, { name: 'старая', expiresAt: Date.now() - 1000, needApproval: false });
  const limited = L.createLink(id, { name: 'мало', limit: 1, needApproval: false });
  const revoked = L.createLink(id, { name: 'отозвана', needApproval: false });
  L.revokeLink(id, revoked.id);
  assert.equal(L.lookupJoin(gone.code).status, 'expired');
  assert.equal(L.lookupJoin(revoked.code).status, 'invalid');
  assert.equal(L.lookupJoin(limited.code).status, 'ok');
  const usedUp = { [id]: { ...L.getGroup(id), links: L.getGroup(id).links.map((l) => (l.id === limited.id ? { ...l, joined: 1 } : l)) } };
  assert.equal(L.lookupJoin(limited.code, usedUp).status, 'full');
  const banned = { [id]: { ...L.getGroup(id), banned: [L.ME] } };
  assert.equal(L.lookupJoin(code, banned).status, 'banned');
});

test('вступление в публичный канал без заявок: сразу подписка, чат появляется в списке с прежними постами', async () => {
  const L = await fresh();
  assert.equal(L.getChat('pub-cbt'), undefined);
  const before = L.getGroup('pub-cbt').members.length;
  assert.equal(L.joinGroup('@cbt_start'), 'joined');
  const g = L.getGroup('pub-cbt');
  assert.equal(g.members.length, before + 1);
  assert.equal(L.myRole(g), 'member');
  assert.equal(L.getChat('pub-cbt').kind, 'channel');
  assert.ok(texts(g).includes('Вы подписались на канал'));
  assert.ok(messagesOf(L, 'pub-cbt').length > 0, 'прежние посты на месте');
  assert.equal(g.links.find((l) => l.primary).joined, 4, 'вход по @адресу в счётчик ссылки не входит');
  assert.equal(L.joinGroup('@cbt_start'), 'joined', 'повторное вступление безопасно');
  assert.equal(L.getGroup('pub-cbt').members.length, before + 1);
  assert.equal(L.joinGroup('@cbt_start_not_here'), 'failed');
});

test('вступление по ссылке: счётчик растёт, исчерпанная и отозванная ссылки не пускают', async () => {
  const L = await fresh();
  const primary = L.getGroup('pub-young').links.find((l) => l.primary);
  assert.equal(primary.joined, 3);
  assert.equal(L.joinGroup(primary.code), 'joined', 'по основной ссылке заявок нет');
  assert.equal(L.getGroup('pub-young').links.find((l) => l.primary).joined, 4);
  assert.ok(L.getChat('pub-young'));
  assert.ok(messagesOf(L, 'pub-young').some((m) => m.service && m.text === 'Вы вступили в общий чат'));
  assert.ok(messagesOf(L, 'pub-young').some((m) => m.pinned), 'прежняя переписка и закреп на месте');

  const once = L.createLink('pub-cbt', { name: 'один раз', limit: 1, needApproval: false });
  assert.equal(L.joinGroup(once.code), 'joined');
  assert.equal(L.isLinkAlive(L.getGroup('pub-cbt').links.find((l) => l.id === once.id)), false, 'лимит исчерпан');

  const id = L.createGroup(draft());
  const link = L.createLink(id, { name: 'л', needApproval: false });
  L.revokeLink(id, link.id);
  assert.equal(L.joinGroup(link.code), 'failed');
  assert.equal(L.joinGroup('wrong-code'), 'failed');
});

test('вступление по заявке: заявка висит, одобрение вводит в группу, чат встаёт в список непрочитанным', async () => {
  const L = await fresh();
  const mine = () => L.getGroup('pub-young').requests.filter((r) => r.contactId === L.ME);
  assert.equal(L.joinGroup('@young_psy'), 'requested');
  assert.equal(mine().length, 1);
  assert.equal(L.lookupJoin('@young_psy').pending, true);
  assert.equal(L.joinGroup('@young_psy'), 'requested');
  assert.equal(mine().length, 1, 'вторая заявка не создаётся');
  assert.equal(timers.length, 1, 'ответ придёт один раз');
  assert.equal(L.getChat('pub-young'), undefined, 'до одобрения чата нет');
  assert.equal(L.isMember(L.getGroup('pub-young')), false);

  runTimers();
  const g = L.getGroup('pub-young');
  assert.ok(L.isMember(g));
  assert.equal(mine().length, 0);
  assert.equal(L.getChat('pub-young').unread, 1);
  assert.ok(messagesOf(L, 'pub-young').some((m) => m.service && m.text === 'Заявка одобрена: вы вступили в общий чат'));
  assert.ok(texts(g).includes('Вы вступили в общий чат'));
  assert.equal(L.lookupJoin('@young_psy').member, true);
});

test('заявка по ссылке с одобрением: в счётчик ссылки попадает после одобрения; отклонённую можно подать снова', async () => {
  const L = await fresh();
  const link = L.createLink('pub-young', { name: 'по заявке', needApproval: true });
  assert.equal(L.joinGroup(link.code), 'requested');
  const request = L.getGroup('pub-young').requests.find((r) => r.contactId === L.ME);
  assert.equal(request.linkId, link.id);
  assert.equal(L.getGroup('pub-young').links.find((l) => l.id === link.id).joined, 0);
  runTimers();
  assert.equal(L.getGroup('pub-young').links.find((l) => l.id === link.id).joined, 1);
  assert.ok(L.isMember(L.getGroup('pub-young')));

  // Заявку отклонили, пока ответ не пришёл
  const M = await fresh();
  assert.equal(M.joinGroup('@young_psy'), 'requested');
  const mine = M.getGroup('pub-young').requests.find((r) => r.contactId === M.ME);
  M.declineRequest('pub-young', mine.id);
  assert.ok(texts(M.getGroup('pub-young')).some((t) => t.startsWith('Вы отклонили заявку')));
  runTimers();
  assert.equal(M.isMember(M.getGroup('pub-young')), false, 'отклонённая заявка вступлением не стала');
  assert.equal(M.getChat('pub-young'), undefined);
  assert.equal(M.lookupJoin('@young_psy').pending, false);
  assert.equal(M.joinGroup('@young_psy'), 'requested', 'подать заявку можно снова');
  runTimers();
  assert.ok(M.isMember(M.getGroup('pub-young')));
});

test('заявки в вашей группе: принять, отклонить, принять всех, отклонить всех', async () => {
  const L = await fresh();
  const sup = L.getGroup('supervision');
  const [first, second] = sup.requests;
  const members = sup.members.length;
  L.approveRequest('supervision', first.id);
  assert.equal(L.getGroup('supervision').requests.length, 1);
  assert.equal(L.getGroup('supervision').members.length, members + 1);
  assert.ok(ids(L.getGroup('supervision')).includes(first.contactId));
  assert.ok(texts(L.getGroup('supervision')).includes('Вы приняли заявку: Павел Зайцев'));
  assert.ok(messagesOf(L, 'supervision').some((m) => m.service && m.text === 'В общем чате новый пользователь: Павел Зайцев'));
  L.declineRequest('supervision', second.id);
  assert.equal(L.getGroup('supervision').requests.length, 0);
  assert.equal(L.getGroup('supervision').members.length, members + 1);
  assert.ok(texts(L.getGroup('supervision')).includes('Вы отклонили заявку: Ольга Громова'));
  const len = L.getGroup('supervision').log.length;
  L.approveRequest('supervision', 'нет такой');
  L.declineRequest('supervision', 'нет такой');
  assert.equal(L.getGroup('supervision').log.length, len);

  const all = await fresh();
  all.approveAll('supervision');
  assert.equal(all.getGroup('supervision').requests.length, 0);
  assert.ok(['pavel', 'olga'].every((id) => ids(all.getGroup('supervision')).includes(id)));
  const none = await fresh();
  none.declineAll('supervision');
  assert.equal(none.getGroup('supervision').requests.length, 0);
  assert.equal(none.getGroup('supervision').members.length, 6);
});

test('выход: владелец удаляет группу у всех, пользователь уходит и может вернуться', async () => {
  const L = await fresh();
  const id = L.createGroup(draft());
  const code = L.getGroup(id).links[0].code;
  assert.ok(L.getChat(id));
  L.leaveGroup(id);
  assert.equal(L.getChat(id), undefined);
  assert.equal(L.getGroup(id), undefined, 'у владельца группа исчезает целиком');
  assert.deepEqual(L.getMessages(id), []);
  assert.equal(L.lookupJoin(code).status, 'invalid', 'ссылка больше не работает');

  assert.ok(L.getChat('psy-myths'));
  L.leaveGroup('psy-myths');
  assert.equal(L.getChat('psy-myths'), undefined);
  const myths = L.getGroup('psy-myths');
  assert.ok(myths, 'канал остаётся у остальных подписчиков');
  assert.equal(L.isMember(myths), false);
  assert.equal(myths.members.length, 6);
  assert.ok(texts(myths).includes('Вы отписались от канала'));

  assert.equal(L.joinGroup('@psy_bez_mifov'), 'joined');
  assert.ok(L.getChat('psy-myths'));
  assert.ok(L.isMember(L.getGroup('psy-myths')));
  assert.equal(L.getGroup('psy-myths').members.length, 7);
});

test('медленный режим: после сообщения участнику ждать, потом можно; владельца и канал он не касается', async () => {
  const L = await fresh();
  joinYoung(L);
  assert.equal(L.getGroup('pub-young').slowMode, 30);
  assert.equal(L.slowLeft('pub-young'), 0);
  L.sendMessage('pub-young', 'Всем привет');
  const left = L.slowLeft('pub-young');
  assert.ok(left > 0 && left <= 30, `осталось ${left} с`);

  const realNow = Date.now;
  Date.now = () => realNow() + 31_000;
  try {
    assert.equal(L.slowLeft('pub-young'), 0, 'через 30 секунд можно снова');
  } finally {
    Date.now = realNow;
  }
  assert.ok(L.slowLeft('pub-young') > 0);
  L.setSetting('pub-young', { slowMode: 0 });
  assert.equal(L.slowLeft('pub-young'), 0, 'выключили — ждать не нужно');

  const own = L.createGroup(draft({ members: ['anna'] }));
  L.setSetting(own, { slowMode: 60 });
  L.sendMessage(own, 'раз');
  assert.equal(L.slowLeft(own), 0, 'владельца медленный режим не касается');
  const channel = L.createGroup(draft({ kind: 'channel' }));
  L.setSetting(channel, { slowMode: 60 });
  L.sendMessage(channel, 'пост');
  assert.equal(L.slowLeft(channel), 0);
  assert.equal(L.slowLeft('нет такой'), 0);
});

test('канал: пост получает просмотры, подпись автора, если она включена, и реакции подписчиков', async () => {
  const L = await fresh();
  const id = L.createGroup(draft({ kind: 'channel', name: 'Канал для постов', members: ['anna', 'igor', 'elena'] }));
  timers.length = 0;
  L.sendMessage(id, 'Первый пост');
  let post = messagesOf(L, id).at(-1);
  assert.equal(post.text, 'Первый пост');
  assert.equal(post.views, 1);
  assert.equal(post.signature, undefined);
  assert.equal(timers.length, 3, 'просмотры набираются тремя порциями');
  runTimers();
  post = messagesOf(L, id).at(-1);
  assert.equal(post.views, 3, '90% от трёх подписчиков');

  L.setSetting(id, { signatures: true });
  L.sendMessage(id, 'Второй пост');
  assert.equal(messagesOf(L, id).at(-1).signature, 'Алексей Воронин');

  await withRandom(0.1, async () => {
    timers.length = 0;
    L.sendMessage(id, 'Третий пост');
    assert.equal(timers.length, 4, 'ещё и реакция подписчика');
    runTimers();
    assert.deepEqual(messagesOf(L, id).at(-1).counts, { '❤️': 1 });
    L.setSetting(id, { reactions: [] });
    timers.length = 0;
    L.sendMessage(id, 'Четвёртый пост');
    assert.equal(timers.length, 3, 'реакции выключены — их никто не ставит');
  });

  // В группе и в личном чате просмотров и подписи нет
  const group = L.createGroup(draft());
  L.sendMessage(group, 'Привет');
  assert.equal(messagesOf(L, group).at(-1).views, undefined);
  L.ensureContactChat(L.CONTACTS.find((c) => c.id === 'igor'));
  L.sendMessage('igor', 'Игорь, добрый день');
  const direct = messagesOf(L, 'igor').at(-1);
  assert.equal(direct.text, 'Игорь, добрый день');
  assert.equal(direct.views, undefined);
  assert.equal(direct.signature, undefined);
});

test('группа: пользователь иногда отвечает; ограниченный и ушедший — нет', async () => {
  const L = await fresh();
  await withRandom(0.1, async () => {
    const id = L.createGroup(draft({ members: ['anna', 'igor'] }));
    timers.length = 0;
    L.sendMessage(id, 'Коллеги, добрый день');
    assert.equal(timers.length, 1);
    runTimers();
    const reply = messagesOf(L, id).at(-1);
    assert.equal(reply.from, 'them');
    assert.ok(['anna', 'igor'].includes(reply.author));
    assert.equal(reply.text, 'Спасибо, учту.');
    assert.equal(L.getChat(id).unread, 1, 'чат не открыт — ответ непрочитан');

    // Игорю писать запрещено — отвечает Анна
    L.silenceMember(id, 'igor', true);
    timers.length = 0;
    L.sendMessage(id, 'Ещё вопрос');
    runTimers();
    assert.equal(messagesOf(L, id).at(-1).author, 'anna');

    // Запрещено всем — отвечать некому
    L.silenceMember(id, 'anna', true);
    timers.length = 0;
    L.sendMessage(id, 'Есть кто?');
    assert.equal(timers.length, 0);

    // Ответчик ушёл из группы, пока шла «печать»
    const small = L.createGroup(draft({ members: ['anna'] }));
    timers.length = 0;
    L.sendMessage(small, 'Анна, здравствуйте');
    assert.equal(timers.length, 1);
    L.removeMember(small, 'anna');
    runTimers();
    assert.equal(messagesOf(L, small).some((m) => m.from === 'them'), false);
  });
});

test('цвета имён авторов: у пользователей групп все разные', async () => {
  const L = await fresh();
  for (const chatId of ['supervision', 'pub-young']) {
    const colors = L.getGroup(chatId).members.filter((m) => m.id !== L.ME).map((m) => L.authorColor(m.id));
    assert.equal(new Set(colors).size, colors.length, `${chatId}: ${colors}`);
    for (const c of colors) assert.ok(Number.isInteger(c) && c >= 0 && c < 7);
  }
  const stranger = L.authorColor('unknown-id');
  assert.ok(stranger >= 0 && stranger < 7);
  assert.equal(L.authorColor('unknown-id'), stranger, 'у незнакомого цвет постоянный');
});

test('цветные инициалы: один цвет на одно имя; для шапки профиля — мельче; своё фото не подменяется', async () => {
  const L = await fresh();
  const a = L.initialsAvatar('Анна Королёва', 'anna');
  assert.equal(a, L.initialsAvatar('Анна Королёва', 'anna'));
  assert.ok(a.startsWith('data:image/svg+xml'));
  assert.ok(L.isGenerated(a));
  const hero = L.heroAvatar(a);
  assert.notEqual(hero, a);
  assert.ok(hero.startsWith('data:image/svg+xml'));
  assert.equal(L.heroAvatar(a), hero, 'вариант для шапки не пересчитывается');
  const photo = 'data:image/jpeg;base64,CCCC';
  assert.equal(L.isGenerated(photo), false);
  assert.equal(L.heroAvatar(photo), photo);
  assert.equal(L.initialsOf('Супервизия КПТ'), 'СК');
  assert.equal(L.initialsOf('🔥 Психология без мифов'), 'ПБ');
  assert.equal(L.initialsOf('Канал'), 'К');
  assert.equal(L.initialsOf('123'), '1');
  assert.equal(L.initialsOf('   '), '?');
});
