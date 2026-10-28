// Проверка подключений канала к Telegram и ВК (макет): разбор адреса и ключа, длина поста, коды ошибок, публикация, повтор, правка и удаление,
// «гонки» (правка или удаление, пока пост ещё отправляется), ключи не остаются в состоянии приложения: npm run test:integrations
// Правила (data/crosspost.ts) и хранилище с «сервером-заглушкой» (data/integrations.ts) не зависят от экранов, поэтому собираются esbuild и
// запускаются в Node как есть. Каждая проверка получает свежую копию хранилищ; «сервер» подменяется на записывающий (`recorder`),
// который ничего не ждёт или ждёт, пока проверка сама его отпустит (`gate`).
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

// Окружение браузера, которое трогают модули данных; таймеры собираются в очередь, и проверка их не ждёт
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
// Случай отключён: никто сам не отвечает и не ставит реакций
Math.random = () => 0.9;

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
      export * from './src/data/crosspost';
      export * from './src/data/integrations';
      export { getMessages, sendMessage, updateMessage, deleteMessage } from './src/data/chatStore';
      export { getGroup, myRole, createGroup, leaveGroup } from './src/data/groups';
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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seans-integrations-'));
const file = path.join(dir, 'bundle.mjs');
fs.writeFileSync(file, built.outputFiles[0].text);
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));

let runs = 0;
/** Свежая копия хранилищ: начальные данные те же, что в приложении, «сервер» — заглушка без ожидания */
const fresh = async () => {
  timers.length = 0;
  runs += 1;
  const L = await import(`${pathToFileURL(file).href}?run=${runs}`);
  L.setTransport(L.createMockTransport({ delay: 0 }));
  return L;
};

/** Дать выполниться всему, что «сервер» ещё делает в фоне (правка после отправки, удаление отправленного пост-фактум) */
const flush = () => new Promise((done) => setImmediate(done));
const gate = () => {
  let open;
  const wait = new Promise((done) => (open = done));
  return { wait, open };
};
/** «Сервер», который записывает все обращения; отдельные методы можно подменить */
const recorder = (over = {}) => {
  const calls = [];
  const of = (name) => calls.filter((c) => c[0] === name).map((c) => c[1]);
  let serial = 0;
  const t = {
    calls,
    of,
    async verify(req) {
      calls.push(['verify', req]);
      return { ok: true, title: 'Название', account: 'Бот' };
    },
    async publish(req) {
      calls.push(['publish', req]);
      serial += 1;
      return { ok: true, remoteId: `R${serial}` };
    },
    async edit(req) {
      calls.push(['edit', req]);
      return { ok: true, remoteId: req.remoteId };
    },
    async remove(req) {
      calls.push(['remove', req]);
      return { ok: true };
    },
    async disconnect(req) {
      calls.push(['disconnect', req]);
    },
    ...over,
  };
  return t;
};

const CH = 'psy-notes';
const post = (L, id, chat = CH) => L.getMessages(chat).flatMap((g) => g.messages).find((m) => m.id === id);
const cross = (L, id, network, chat = CH) => post(L, id, chat)?.crossposts?.find((c) => c.network === network);
/** Подключить ВК заново: в начальных данных ключ отозван, а многие проверки идут по обеим сетям */
const fixVk = (L) => L.saveConnection(CH, { network: 'vk', target: 'club218734562', title: 'Сообщество', account: 'Ключ сообщества' });
const TOKEN = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';

// ---------------------------------------------------------------- правила: адреса, ключи, длина, тексты

test('адрес Telegram: любая привычная запись приводится к @имя, лишнее отклоняется с причиной', async () => {
  const L = await fresh();
  for (const raw of ['@psy_zametki', 'psy_zametki', '  psy_zametki  ', 't.me/psy_zametki', 'https://t.me/psy_zametki', 'https://t.me/psy_zametki/', 'http://www.t.me/psy_zametki', 'telegram.me/psy_zametki', 'https://t.me/s/psy_zametki', 'https://t.me/psy_zametki?start=1', 'T.ME/psy_zametki']) {
    assert.deepEqual(L.parseTelegramTarget(raw), { ok: true, value: '@psy_zametki' }, raw);
  }
  assert.deepEqual(L.parseTelegramTarget('-1001234567890'), { ok: true, value: '-1001234567890' }, 'числовой номер канала остаётся как есть');
  assert.deepEqual(L.parseTelegramTarget('Psy_Zametki'), { ok: true, value: '@Psy_Zametki' }, 'регистр сохраняется: сеть его не различает, сервер сравнит сам');

  const reason = (raw) => {
    const r = L.parseTelegramTarget(raw);
    assert.equal(r.ok, false, `«${raw}» не должен подойти`);
    assert.ok(r.reason.length > 10, raw);
    return r.reason;
  };
  assert.match(reason(''), /Укажите адрес канала/);
  assert.match(reason('   '), /Укажите адрес канала/);
  assert.match(reason('@'), /Укажите адрес канала/);
  assert.match(reason('https://t.me/+AbCdEfGhIjK'), /приглашение/, 'ссылка-приглашение не даёт номер канала');
  assert.match(reason('t.me/joinchat/AAAAAEx'), /приглашение/);
  assert.match(reason('https://t.me/psy_zametki/15'), /ссылка на пост/, 'ссылка на пост — не адрес канала');
  assert.match(reason('ab'), /от 5 до 32/);
  assert.match(reason('abcd'), /от 5 до 32/, 'меньше пяти знаков');
  assert.match(reason('1abcde'), /начинается с буквы/);
  assert.match(reason('name_'), /от 5 до 32/, 'не кончается на «_»');
  assert.match(reason('a__bcde'), /от 5 до 32/, 'двойное «_» Telegram не допускает');
  assert.match(reason('имя_канала'), /латиница/);
  assert.match(reason('a'.repeat(33)), /от 5 до 32/);
  assert.match(reason('-100123'), /от 5 до 32/, 'слишком короткий номер канала');
  assert.equal(L.parseTelegramTarget('a'.repeat(32)).ok, true, 'ровно 32 знака подходят');
  assert.equal(L.parseTelegramTarget('abcde').ok, true, 'ровно 5 знаков подходят');
});

test('адрес ВК: club, public, event и просто номер приводятся к club<номер>, личные страницы и разделы отклоняются', async () => {
  const L = await fresh();
  for (const raw of ['vk.com/club218734562', 'https://vk.com/club218734562', 'https://m.vk.com/club218734562', 'http://www.vk.ru/club218734562/', 'vk.com/public218734562', 'vk.com/event218734562', 'club218734562', '218734562', '-218734562', '  218734562  ', 'https://vk.com/club218734562?from=feed']) {
    assert.deepEqual(L.parseVkTarget(raw), { ok: true, value: 'club218734562' }, raw);
  }
  assert.deepEqual(L.parseVkTarget('vk.com/psy_notes'), { ok: true, value: 'psy_notes' });
  assert.deepEqual(L.parseVkTarget('https://vk.com/psy.notes'), { ok: true, value: 'psy.notes' }, 'точка в коротком адресе допустима');
  assert.deepEqual(L.parseVkTarget('@psy_notes'), { ok: true, value: 'psy_notes' });

  const reason = (raw) => {
    const r = L.parseVkTarget(raw);
    assert.equal(r.ok, false, `«${raw}» не должен подойти`);
    return r.reason;
  };
  assert.match(reason(''), /Укажите адрес сообщества/);
  assert.match(reason('vk.com/id12345'), /личная страница/);
  assert.match(reason('id12345'), /личная страница/);
  assert.match(reason('vk.com/club0'), /больше нуля/);
  assert.match(reason('0'), /больше нуля/);
  assert.match(reason('vk.com/feed'), /Это не адрес сообщества/);
  assert.match(reason('vk.com/wall-1_2'), /Короткий адрес/);
  assert.match(reason('vk.com/psy/photos'), /не ссылка на запись или раздел/);
  assert.match(reason('psy'), /Короткий адрес/);
  assert.match(reason('имя'), /Короткий адрес/);
});

test('parseTarget выбирает правило по сети', async () => {
  const L = await fresh();
  assert.equal(L.parseTarget('telegram', 'psy_zametki').value, '@psy_zametki');
  assert.equal(L.parseTarget('vk', '218734562').value, 'club218734562');
  assert.equal(L.parseTarget('telegram', '218734562').ok, false, 'номер без -100 — не канал Telegram');
  assert.equal(L.parseTarget('vk', 't.me/psy_zametki').ok, false);
});

test('ключи: формат токена бота и ключа сообщества; верность ключа проверяет только сервер', async () => {
  const L = await fresh();
  assert.equal(L.checkSecret('telegram', TOKEN), null);
  assert.equal(L.checkSecret('telegram', `  ${TOKEN}\n`), null, 'пробелы по краям при вставке не мешают');
  assert.match(L.checkSecret('telegram', ''), /токен бота/);
  assert.match(L.checkSecret('telegram', 'abc'), /123456789:AAH/);
  assert.match(L.checkSecret('telegram', TOKEN.replace(':', '-')), /123456789:AAH/, 'без двоеточия не токен');
  assert.match(L.checkSecret('telegram', TOKEN + ' лишнее'), /123456789:AAH/);
  assert.match(L.checkSecret('telegram', '12345:' + 'A'.repeat(35)), /123456789:AAH/, 'номер бота короче шести знаков');
  assert.equal(L.checkSecret('vk', 'vk1.a.' + 'x'.repeat(60)), null);
  assert.equal(L.checkSecret('vk', 'a'.repeat(30)), null);
  assert.match(L.checkSecret('vk', ''), /ключ доступа/);
  assert.match(L.checkSecret('vk', 'a'.repeat(29)), /длинная строка/);
  assert.match(L.checkSecret('vk', 'a'.repeat(20) + ' ' + 'b'.repeat(20)), /без пробелов/);
  assert.notEqual(L.checkSecret('telegram', 'x'.repeat(40)), null, 'ключ ВК не принимается за токен бота');
  assert.notEqual(L.checkSecret('vk', TOKEN), null, 'токен бота с двоеточием не принимается за ключ ВК');
});

test('длина поста: пределы сетей, пробелы по краям не считаются, эмодзи — два знака, подпись к фото короче', async () => {
  const L = await fresh();
  assert.deepEqual(L.NETWORKS, ['telegram', 'vk']);
  assert.equal(L.limitOf('telegram'), 4096);
  assert.equal(L.limitOf('telegram', true), 1024);
  assert.equal(L.limitOf('vk'), 16384);
  assert.equal(L.limitOf('vk', true), 16384);

  const fits = (text, networks, photo) => Object.fromEntries(L.planPublish({ text, photo }, networks).map((p) => [p.network, p.fits]));
  assert.deepEqual(fits('а'.repeat(4096), ['telegram', 'vk']), { telegram: true, vk: true });
  assert.deepEqual(fits('а'.repeat(4097), ['telegram', 'vk']), { telegram: false, vk: true });
  assert.deepEqual(fits('а'.repeat(16385), ['telegram', 'vk']), { telegram: false, vk: false });
  assert.deepEqual(fits('а'.repeat(1024), ['telegram'], true), { telegram: true });
  assert.deepEqual(fits('а'.repeat(1025), ['telegram', 'vk'], true), { telegram: false, vk: true });
  assert.deepEqual(fits('  ' + 'а'.repeat(4096) + '\n\n', ['telegram']), { telegram: true }, 'пробелы и переводы строк по краям сеть отрезает');
  assert.deepEqual(fits('😀'.repeat(2048), ['telegram']), { telegram: true }, '2048 эмодзи = 4096 знаков');
  assert.deepEqual(fits('😀'.repeat(2049), ['telegram']), { telegram: false });
  assert.deepEqual(L.planPublish({ text: 'привет' }, []), [], 'ни одной сети — проверять нечего');
  const [item] = L.planPublish({ text: 'а'.repeat(5000) }, ['telegram']);
  assert.deepEqual(item, { network: 'telegram', limit: 4096, length: 5000, fits: false }, 'в ответе есть и предел, и длина — для подсказки «не больше…, сейчас…»');
  assert.equal(L.lengthOf('😀'), 2);
});

test('тексты ошибок: у каждого кода и сети есть понятный текст; после каких ошибок подключение чинят', async () => {
  const L = await fresh();
  const codes = ['invalid_token', 'target_not_found', 'not_a_channel', 'bot_not_admin', 'no_post_right', 'not_connected', 'too_long', 'rate_limited', 'message_gone', 'unreachable', 'unknown'];
  const seen = new Set();
  for (const network of L.NETWORKS) {
    for (const code of codes) {
      const text = L.failureText(network, code, 4096);
      assert.ok(typeof text === 'string' && text.length > 15, `${network}/${code}`);
      assert.ok(/[.!]$/.test(text), `${network}/${code}: текст законченное предложение`);
      assert.ok(!/undefined|null|\{|\}/.test(text), `${network}/${code}: без подстановок «как есть»`);
      seen.add(text);
    }
  }
  assert.ok(seen.size >= 15, 'тексты различаются по кодам и сетям');
  assert.match(L.failureText('telegram', 'too_long', 4096), /4\s096/, 'число знаков с неразрывным пробелом-разделителем');
  assert.match(L.failureText('vk', 'too_long', 16384), /16\s384/);
  assert.match(L.failureText('telegram', 'too_long'), /длиннее, чем принимает Telegram/, 'без предела — без числа');
  assert.match(L.failureText('telegram', 'invalid_token'), /Токен бота/);
  assert.match(L.failureText('vk', 'invalid_token'), /Ключ доступа/);
  assert.match(L.failureText('telegram', 'what-is-this'), /Не получилось/, 'незнакомый код — общий текст');
  assert.deepEqual([...L.BREAKS_CONNECTION].sort(), ['bot_not_admin', 'invalid_token', 'no_post_right', 'not_a_channel', 'target_not_found']);
  for (const code of ['unreachable', 'rate_limited', 'too_long', 'message_gone', 'not_connected', 'unknown']) assert.equal(L.BREAKS_CONNECTION.has(code), false, `после «${code}» подключение не ломается`);
});

test('подпись к плашке: отправляется, обновляется, опубликовано, не отправлено, не обновлено', async () => {
  const L = await fresh();
  const label = (state, op, network = 'telegram') => L.crosspostLabel({ network, state, op });
  assert.equal(label('sending', 'publish'), 'Отправляется в Telegram');
  assert.equal(label('sending'), 'Отправляется в Telegram');
  assert.equal(label('sending', 'edit', 'vk'), 'Обновляется в ВКонтакте');
  assert.equal(label('sent', undefined, 'vk'), 'Опубликовано в ВКонтакте');
  assert.equal(label('failed', 'publish'), 'Не отправлено в Telegram');
  assert.equal(label('failed', 'edit'), 'Не обновлено в Telegram');
});

// ---------------------------------------------------------------- подключения

test('начальные данные: у вашего канала Telegram подключён, ключ ВК отозван; чужие каналы без подключений', async () => {
  const L = await fresh();
  assert.equal(L.INTEGRATIONS_MOCK, true, 'пока сервера нет, на экранах пометка «Макет»');
  const g = L.getGroup(CH);
  assert.equal(g.kind, 'channel');
  assert.equal(L.myRole(g), 'owner');
  const [tg, vk] = L.getConnections(CH);
  assert.deepEqual([tg.network, tg.status, tg.target, tg.byDefault], ['telegram', 'connected', '@psy_zametki', true]);
  assert.deepEqual([vk.network, vk.status, vk.problem, vk.byDefault], ['vk', 'error', 'invalid_token', false]);
  assert.equal(L.getConnection(CH, 'telegram'), tg);
  assert.equal(L.getConnection(CH, 'nope'), undefined);
  assert.deepEqual(L.getConnections('psy-myths'), [], 'в чужом канале подключений нет');
  assert.deepEqual(L.getConnections('нет такого'), []);
  assert.equal(L.getConnections('нет такого'), L.getConnections('другого нет'), 'пустой список один и тот же: подписка на хранилище не перерисовывает зря');

  const ids = ['pn-1', 'pn-2', 'pn-3'];
  assert.deepEqual(L.syncedNetworks(CH, ['pn-1']), ['telegram', 'vk']);
  assert.deepEqual(L.syncedNetworks(CH, ['pn-2']), ['telegram'], 'во ВК пост не вышел — удалять там нечего');
  assert.deepEqual(L.syncedNetworks(CH, ['pn-3']), []);
  assert.deepEqual(L.syncedNetworks(CH, ids), ['telegram', 'vk']);
  assert.deepEqual(L.syncedNetworks(CH, ['нет такого']), []);
});

test('выбор «Также в…»: по умолчанию как в настройках, один раз меняется для поста, после отправки сбрасывается', async () => {
  const L = await fresh();
  assert.deepEqual(L.pickedNetworks(CH), ['telegram'], 'ВК не в списке: подключение не работает');
  L.setPick(CH, 'telegram', false);
  assert.deepEqual(L.pickedNetworks(CH), []);
  L.setPick(CH, 'vk', true);
  assert.deepEqual(L.pickedNetworks(CH), [], 'сломанное подключение выбрать нельзя');
  L.resetPicks(CH);
  assert.deepEqual(L.pickedNetworks(CH), ['telegram'], 'после поста выбор снова по настройкам');
  L.resetPicks(CH);
  L.resetPicks('нет такого');

  L.setByDefault(CH, 'telegram', false);
  assert.deepEqual(L.pickedNetworks(CH), [], 'настройка «по умолчанию» выключена');
  L.setPick(CH, 'telegram', true);
  assert.deepEqual(L.pickedNetworks(CH), ['telegram'], 'для этого поста включён вручную');
  L.resetPicks(CH);
  assert.deepEqual(L.pickedNetworks(CH), []);
  L.setByDefault(CH, 'telegram', true);
  assert.deepEqual(L.pickedNetworks(CH), ['telegram']);
  assert.equal(L.getConnection(CH, 'vk').byDefault, false, 'настройка одной сети другую не трогает');
});

test('подключение: проверка у сервера, запись, переподключение, отключение; сеть, не бывшая подключённой, по умолчанию включена', async () => {
  const L = await fresh();
  const t = recorder();
  L.setTransport(t);
  const id = L.createGroup({ kind: 'channel', name: 'Новый канал', description: '', photo: null, members: [], isPublic: false, username: '' });
  assert.deepEqual(L.getConnections(id), []);

  const res = await L.verifyConnection({ chatId: id, network: 'telegram', target: '@new_channel', secret: TOKEN });
  assert.deepEqual(res, { ok: true, title: 'Название', account: 'Бот' });
  assert.deepEqual(t.of('verify'), [{ chatId: id, network: 'telegram', target: '@new_channel', secret: TOKEN }], 'ключ уходит на сервер один раз, вместе с проверкой');
  assert.deepEqual(L.getConnections(id), [], 'проверка сама ничего не записывает: подключение появляется, когда экран принял ответ');

  L.saveConnection(id, { network: 'telegram', target: '@new_channel', title: res.title, account: res.account });
  const conn = L.getConnection(id, 'telegram');
  assert.deepEqual([conn.status, conn.byDefault, conn.target, conn.title, conn.account], ['connected', true, '@new_channel', 'Название', 'Бот']);
  assert.ok(conn.connectedAt > 0);
  assert.deepEqual(L.pickedNetworks(id), ['telegram'], 'новое подключение по умолчанию участвует в публикации');
  L.saveConnection(id, { network: 'vk', target: 'club1', title: 'С', account: 'К' });
  assert.deepEqual(L.getConnections(id).map((c) => c.network), ['telegram', 'vk'], 'порядок сетей постоянный');

  // Переподключение заменяет запись и снимает пометку об ошибке, но сохраняет настройку «по умолчанию»
  L.setByDefault(id, 'vk', false);
  L.saveConnection(id, { network: 'vk', target: 'club2', title: 'С2', account: 'К2' });
  assert.equal(L.getConnections(id).length, 2);
  const vk = L.getConnection(id, 'vk');
  assert.deepEqual([vk.target, vk.title, vk.status, vk.problem, vk.byDefault], ['club2', 'С2', 'connected', undefined, false]);

  // Отключение: сервер забывает ключ, запись уходит
  L.disconnect(id, 'telegram');
  await flush();
  assert.deepEqual(L.getConnections(id).map((c) => c.network), ['vk']);
  assert.deepEqual(t.of('disconnect'), [{ chatId: id, network: 'telegram' }]);
  L.disconnect(id, 'telegram');
  await flush();
  assert.equal(t.of('disconnect').length, 1, 'отключённую сеть второй раз не отключаем');
});

test('переподключение ВК сбрасывает ручной выбор и снимает пометку «Ошибка»', async () => {
  const L = await fresh();
  L.setPick(CH, 'vk', true);
  fixVk(L);
  const vk = L.getConnection(CH, 'vk');
  assert.deepEqual([vk.status, vk.problem], ['connected', undefined]);
  assert.deepEqual(L.pickedNetworks(CH), ['telegram'], 'ручной выбор до переподключения не переносится: ВК по настройке «по умолчанию» выключен');
  L.setPick(CH, 'vk', true);
  assert.deepEqual(L.pickedNetworks(CH), ['telegram', 'vk']);
});

test('ключ нигде не остаётся: ни в подключениях, ни в постах, ни в переписке', async () => {
  const L = await fresh();
  const secret = TOKEN;
  const res = await L.verifyConnection({ chatId: CH, network: 'telegram', target: '@psy_zametki', secret });
  assert.equal(res.ok, true);
  L.saveConnection(CH, { network: 'telegram', target: '@psy_zametki', title: res.title, account: res.account });
  const id = L.sendMessage(CH, 'Пост после подключения');
  await L.publishPost(CH, id, ['telegram']);
  const dump = JSON.stringify({ c: L.getConnections(CH), m: L.getMessages(CH) });
  assert.ok(!dump.includes(secret), 'ключа в состоянии нет');
  assert.ok(!dump.includes('AAHdq'));
  for (const conn of L.getConnections(CH)) assert.deepEqual(Object.keys(conn).filter((k) => /secret|token|key|ключ/i.test(k)), [], 'в записи подключения нет поля для ключа');
});

test('сервер-заглушка: «успешно» даёт название и кем публикуем, «ошибка» — типичные причины по сети; упавший запрос становится unreachable', async () => {
  const L = await fresh();
  assert.equal(L.getMockReply(), 'ok');
  const ok = await L.verifyConnection({ chatId: CH, network: 'telegram', target: '@psy_zametki', secret: TOKEN });
  assert.deepEqual(ok, { ok: true, title: 'Заметки психолога', account: 'Бот @seans_demo_bot' });
  const okVk = await L.verifyConnection({ chatId: CH, network: 'vk', target: 'club1', secret: 'a'.repeat(40) });
  assert.deepEqual(okVk, { ok: true, title: 'Заметки психолога', account: 'Ключ сообщества' });

  L.setMockReply('fail');
  assert.equal(L.getMockReply(), 'fail');
  assert.deepEqual(await L.verifyConnection({ chatId: CH, network: 'telegram', target: '@psy_zametki', secret: TOKEN }), { ok: false, failure: { code: 'bot_not_admin' } });
  assert.deepEqual(await L.verifyConnection({ chatId: CH, network: 'vk', target: 'club1', secret: 'a'.repeat(40) }), { ok: false, failure: { code: 'invalid_token' } });
  L.setMockReply('ok');

  // Запрос упал совсем (нет сети, сервер недоступен): ответ приведён к одному виду
  L.setTransport(recorder({ verify: async () => { throw new Error('offline'); } }));
  assert.deepEqual(await L.verifyConnection({ chatId: CH, network: 'telegram', target: '@psy_zametki', secret: TOKEN }), { ok: false, failure: { code: 'unreachable' } });
});

// ---------------------------------------------------------------- публикация, повтор, правка, удаление

test('публикация: «отправляется» появляется сразу, по ответу сервера — «вышел» с номером записи; другие сети не затрагиваются', async () => {
  const L = await fresh();
  const t = recorder();
  L.setTransport(t);
  const id = L.sendMessage(CH, 'Новый пост канала');
  assert.equal(typeof id, 'string');
  assert.equal(post(L, id).crossposts, undefined, 'пока не отправляли, плашек нет');
  const done = L.publishPost(CH, id, ['telegram']);
  assert.deepEqual(cross(L, id, 'telegram'), { network: 'telegram', state: 'sending', op: 'publish', failure: undefined }, 'идёт отправка');
  await done;
  assert.deepEqual(cross(L, id, 'telegram'), { network: 'telegram', state: 'sent', op: undefined, failure: undefined, remoteId: 'R1', url: undefined });
  assert.equal(cross(L, id, 'vk'), undefined, 'во ВК не отправляли');
  assert.deepEqual(t.of('publish'), [{ chatId: CH, postId: id, network: 'telegram', text: 'Новый пост канала', photo: undefined }]);
  assert.deepEqual(L.syncedNetworks(CH, [id]), ['telegram']);

  // Две команды подряд, пока пост в пути: сервер получает его один раз
  const g = gate();
  let sent = 0;
  L.setTransport(
    recorder({
      async publish() {
        sent += 1;
        await g.wait;
        return { ok: true, remoteId: 'Z' };
      },
    }),
  );
  const id2 = L.sendMessage(CH, 'Второй пост');
  const a = L.publishPost(CH, id2, ['telegram']);
  const b = L.publishPost(CH, id2, ['telegram']);
  g.open();
  await Promise.all([a, b]);
  assert.equal(sent, 1, 'пост в пути второй раз не отправляется');
  assert.equal(cross(L, id2, 'telegram').remoteId, 'Z');
});

test('публикация сразу в две сети и ошибка одной из них: вторая выходит, у первой причина', async () => {
  const L = await fresh();
  fixVk(L);
  const t = recorder({
    async publish(req) {
      t.calls.push(['publish', req]);
      return req.network === 'vk' ? { ok: false, failure: { code: 'rate_limited', retryAfter: 30 } } : { ok: true, remoteId: 'T1', url: 'https://t.me/psy_zametki/1' };
    },
  });
  L.setTransport(t);
  const id = L.sendMessage(CH, 'Пост в обе сети');
  await L.publishPost(CH, id, ['telegram', 'vk']);
  assert.deepEqual(
    [cross(L, id, 'telegram').state, cross(L, id, 'telegram').remoteId, cross(L, id, 'telegram').url],
    ['sent', 'T1', 'https://t.me/psy_zametki/1'],
    'ссылка на запись сохраняется: по ней плашка открывает пост в сети',
  );
  assert.deepEqual([cross(L, id, 'vk').state, cross(L, id, 'vk').failure, cross(L, id, 'vk').op, cross(L, id, 'vk').remoteId], ['failed', 'rate_limited', 'publish', undefined]);
  assert.equal(L.getConnection(CH, 'vk').status, 'connected', '«просит подождать» подключение не ломает');
  assert.deepEqual(L.syncedNetworks(CH, [id]), ['telegram'], 'во ВК пост не вышел');
});

test('ошибка сервера и повтор: «не отправлено» → «Повторить» → вышел; повтор вышедшего ничего не делает', async () => {
  const L = await fresh();
  L.setMockReply('fail');
  const id = L.sendMessage(CH, 'Пост при ошибке сервера');
  await L.publishPost(CH, id, ['telegram']);
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').failure, cross(L, id, 'telegram').op], ['failed', 'unreachable', 'publish']);
  assert.equal(L.getConnection(CH, 'telegram').status, 'connected', 'временная ошибка подключение не ломает');
  assert.deepEqual(L.pickedNetworks(CH), ['telegram']);

  await L.retryCrosspost(CH, id, 'telegram');
  assert.equal(cross(L, id, 'telegram').state, 'failed', 'сервер всё ещё не отвечает');

  L.setMockReply('ok');
  const retry = L.retryCrosspost(CH, id, 'telegram');
  assert.equal(cross(L, id, 'telegram').state, 'sending');
  assert.equal(cross(L, id, 'telegram').failure, undefined, 'причина снимается, пока идёт повтор');
  await retry;
  assert.equal(cross(L, id, 'telegram').state, 'sent');
  assert.ok(cross(L, id, 'telegram').remoteId);

  const t = recorder();
  L.setTransport(t);
  await L.retryCrosspost(CH, id, 'telegram');
  await L.retryCrosspost(CH, 'нет такого', 'telegram');
  await L.retryCrosspost(CH, id, 'vk');
  assert.equal(t.calls.length, 0, 'повторять нечего: пост вышел, или не было такой сети, или такого поста');
});

test('ошибки, после которых подключение надо чинить, переводят его в «Ошибка»: поле ввода перестаёт предлагать сеть', async () => {
  const L = await fresh();
  const t = recorder({ publish: async () => ({ ok: false, failure: { code: 'bot_not_admin' } }) });
  L.setTransport(t);
  const id = L.sendMessage(CH, 'Бота убрали из канала');
  await L.publishPost(CH, id, ['telegram']);
  assert.equal(cross(L, id, 'telegram').failure, 'bot_not_admin');
  const conn = L.getConnection(CH, 'telegram');
  assert.deepEqual([conn.status, conn.problem], ['error', 'bot_not_admin']);
  assert.deepEqual(L.pickedNetworks(CH), [], 'ни одной рабочей сети');

  // Пока подключение не починено, повтор сразу говорит об этом, не обращаясь к серверу
  const calls = t.calls.length;
  await L.retryCrosspost(CH, id, 'telegram');
  assert.equal(t.calls.length, calls);
  assert.equal(cross(L, id, 'telegram').failure, 'not_connected');
  assert.equal(cross(L, id, 'telegram').state, 'failed');

  // Переподключили — повтор проходит
  L.saveConnection(CH, { network: 'telegram', target: '@psy_zametki', title: 'Заметки психолога', account: 'Бот' });
  L.setTransport(recorder());
  await L.retryCrosspost(CH, id, 'telegram');
  assert.equal(cross(L, id, 'telegram').state, 'sent');
});

test('отключённая или сломанная сеть: публикация сразу «не вышла» и сервер не вызывается', async () => {
  const L = await fresh();
  const t = recorder();
  L.setTransport(t);
  const id = L.sendMessage(CH, 'ВК с отозванным ключом');
  await L.publishPost(CH, id, ['vk']);
  assert.deepEqual([cross(L, id, 'vk').state, cross(L, id, 'vk').failure], ['failed', 'not_connected']);
  L.disconnect(CH, 'telegram');
  await L.publishPost(CH, id, ['telegram']);
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').failure], ['failed', 'not_connected']);
  assert.equal(t.of('publish').length, 0);
});

test('слишком длинный пост: сервер не вызывается, причина «слишком длинный»; у фото подпись короче', async () => {
  const L = await fresh();
  fixVk(L);
  const t = recorder();
  L.setTransport(t);
  const id = L.sendMessage(CH, 'я'.repeat(5000));
  await L.publishPost(CH, id, ['telegram', 'vk']);
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').failure], ['failed', 'too_long']);
  assert.equal(cross(L, id, 'vk').state, 'sent', 'во ВК 5000 знаков помещаются');
  assert.deepEqual(t.of('publish').map((r) => r.network), ['vk'], 'в Telegram запрос не уходил');
  assert.equal(L.getConnection(CH, 'telegram').status, 'connected', 'длина подключение не ломает');

  // Фото: подпись до 1024 в Telegram
  const photoOk = L.sendMessage(CH, '', undefined, { image: 'blob:photo-1' });
  await L.publishPost(CH, photoOk, ['telegram']);
  assert.equal(cross(L, photoOk, 'telegram').state, 'sent');
  assert.deepEqual(t.of('publish').at(-1), { chatId: CH, postId: photoOk, network: 'telegram', text: '', photo: 'blob:photo-1' }, 'сервер получает адрес картинки (настоящий — сам файл)');
  const photoLong = L.sendMessage(CH, 'я'.repeat(1100), undefined, { image: 'blob:photo-2' });
  await L.publishPost(CH, photoLong, ['telegram', 'vk']);
  assert.equal(cross(L, photoLong, 'telegram').failure, 'too_long');
  assert.equal(cross(L, photoLong, 'vk').state, 'sent');

  // Правка, после которой текст перестал помещаться, не уходит в сеть
  const id2 = L.sendMessage(CH, 'Короткий пост');
  await L.publishPost(CH, id2, ['telegram']);
  L.updateMessage(CH, id2, { text: 'д'.repeat(4100), edited: true });
  await L.editCrossposts(CH, id2);
  assert.deepEqual([cross(L, id2, 'telegram').state, cross(L, id2, 'telegram').op, cross(L, id2, 'telegram').failure], ['failed', 'edit', 'too_long']);
  assert.ok(cross(L, id2, 'telegram').remoteId, 'номер записи в сети не потерян: пост там по-прежнему есть и его можно править');
  assert.equal(t.of('edit').length, 0);
});

test('правка: вышедший пост обновляется в сетях, «не обновлено» объясняется и повторяется; невышедший при повторе уйдёт с новым текстом', async () => {
  const L = await fresh();
  fixVk(L);
  const t = recorder();
  L.setTransport(t);
  const id = L.sendMessage(CH, 'Первый вариант');
  await L.publishPost(CH, id, ['telegram', 'vk']);
  L.updateMessage(CH, id, { text: 'Второй вариант', edited: true });
  const editing = L.editCrossposts(CH, id);
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').op], ['sending', 'edit'], 'идёт обновление');
  await editing;
  assert.deepEqual(
    t.of('edit').map((r) => [r.network, r.remoteId, r.text]),
    [['telegram', 'R1', 'Второй вариант'], ['vk', 'R2', 'Второй вариант']],
    'сервер получает номер записи в сети и новый текст',
  );
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').remoteId], ['sent', 'R1'], 'номер записи после правки прежний');

  // Сервер не принял правку: пометка «не обновлено», номер сохранён, повтор — именно правка, не новая публикация
  L.setTransport(recorder({ edit: async () => ({ ok: false, failure: { code: 'unreachable' } }) }));
  L.updateMessage(CH, id, { text: 'Третий вариант', edited: true });
  await L.editCrossposts(CH, id);
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').op, cross(L, id, 'telegram').failure, cross(L, id, 'telegram').remoteId], ['failed', 'edit', 'unreachable', 'R1']);
  assert.equal(L.crosspostLabel(cross(L, id, 'telegram')), 'Не обновлено в Telegram');
  const t2 = recorder();
  L.setTransport(t2);
  await L.retryCrosspost(CH, id, 'telegram');
  assert.equal(t2.of('publish').length, 0, 'повтор правки не публикует пост второй раз');
  assert.deepEqual(t2.of('edit').map((r) => [r.network, r.remoteId, r.text]), [['telegram', 'R1', 'Третий вариант']], 'и уходит последний текст');
  assert.equal(cross(L, id, 'telegram').state, 'sent');

  // Пост, который не вышел, правка в сеть не отправляет; повтор публикует уже новый текст
  L.setTransport(recorder({ publish: async () => ({ ok: false, failure: { code: 'unreachable' } }) }));
  const stuck = L.sendMessage(CH, 'Не вышел');
  await L.publishPost(CH, stuck, ['telegram']);
  const t3 = recorder();
  L.setTransport(t3);
  L.updateMessage(CH, stuck, { text: 'Не вышел, но поправлен', edited: true });
  await L.editCrossposts(CH, stuck);
  assert.equal(t3.calls.length, 0, 'правка невышедшего поста в сеть не уходит');
  await L.retryCrosspost(CH, stuck, 'telegram');
  assert.deepEqual(t3.of('publish').map((r) => r.text), ['Не вышел, но поправлен'], 'повтор публикует уже новый текст');
});

test('правка, пока пост ещё отправляется: сначала выходит как был, затем обновляется до нового текста', async () => {
  const L = await fresh();
  const g = gate();
  const t = recorder({
    async publish(req) {
      t.calls.push(['publish', req]);
      await g.wait;
      return { ok: true, remoteId: 'R1' };
    },
  });
  L.setTransport(t);
  const id = L.sendMessage(CH, 'Первый вариант');
  const done = L.publishPost(CH, id, ['telegram']);
  L.updateMessage(CH, id, { text: 'Второй вариант', edited: true });
  await L.editCrossposts(CH, id);
  assert.equal(t.of('edit').length, 0, 'пока пост в пути, править в сети нечего: номера записи ещё нет');
  assert.equal(cross(L, id, 'telegram').state, 'sending');
  g.open();
  await done;
  await flush();
  assert.deepEqual(t.of('publish').map((r) => r.text), ['Первый вариант']);
  assert.deepEqual(t.of('edit').map((r) => [r.remoteId, r.text]), [['R1', 'Второй вариант']], 'после выхода пост сразу обновлён до нового текста');
  assert.deepEqual([cross(L, id, 'telegram').state, cross(L, id, 'telegram').remoteId], ['sent', 'R1']);
});

test('удаление пока пост ещё отправляется: когда сервер ответит, пост убирается и из сети', async () => {
  const L = await fresh();
  const g = gate();
  const t = recorder({
    async publish(req) {
      t.calls.push(['publish', req]);
      await g.wait;
      return { ok: true, remoteId: 'R1' };
    },
  });
  L.setTransport(t);
  const id = L.sendMessage(CH, 'Передумал');
  const done = L.publishPost(CH, id, ['telegram']);
  L.deleteMessage(CH, id);
  assert.equal(post(L, id), undefined);
  g.open();
  await done;
  await flush();
  assert.deepEqual(t.of('remove'), [{ chatId: CH, postId: id, network: 'telegram', remoteId: 'R1' }], 'вышедшая запись удалена в сети');

  // Ошибка у удалённого поста никому не нужна: плашки нет, пометок не остаётся
  const t2 = recorder({ publish: async () => ({ ok: false, failure: { code: 'unreachable' } }) });
  L.setTransport(t2);
  const id2 = L.sendMessage(CH, 'Ещё один');
  const p2 = L.publishPost(CH, id2, ['telegram']);
  L.deleteMessage(CH, id2);
  await p2;
  assert.equal(post(L, id2), undefined);
  assert.equal(t2.of('remove').length, 0, 'публикации не было — удалять в сети нечего');
});

test('удаление вышедших постов: уходят в сетях по номерам записей; «уже удалён там» не ошибка, остальное возвращается для сообщения', async () => {
  const L = await fresh();
  const t = recorder();
  L.setTransport(t);
  // «Упражнение 5-4-3-2-1» вышло в обе сети, «Три вопроса» — только в Telegram, «Завтра выложу» — нигде
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-1', 'pn-2', 'pn-3']), []);
  assert.deepEqual(
    t.of('remove').map((r) => [r.postId, r.network, r.remoteId]).sort(),
    [['pn-1', 'telegram', '11'], ['pn-1', 'vk', '4'], ['pn-2', 'telegram', '12']],
  );
  assert.ok(post(L, 'pn-1'), 'removeCrossposts переписку не трогает: вызывается до удаления, переписку убирает экран');

  const down = recorder({ remove: async (req) => (req.network === 'telegram' ? { ok: false, failure: { code: 'unreachable' } } : { ok: true }) });
  L.setTransport(down);
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-1']), ['telegram'], 'Telegram не ответил: человеку скажут удалить пост там вручную');
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-1', 'pn-2']), ['telegram']);

  const gone = recorder({ remove: async () => ({ ok: false, failure: { code: 'message_gone' } }) });
  L.setTransport(gone);
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-1']), [], 'пост уже удалён в сети вручную — это то, чего мы и хотели');

  const boom = recorder({ remove: async () => { throw new Error('offline'); } });
  L.setTransport(boom);
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-1']), ['telegram', 'vk'], 'упавший запрос считается неудачей');

  L.setMockReply('fail');
  L.setTransport(L.createMockTransport({ delay: 0 }));
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-2', 'pn-3']), ['telegram'], 'через заглушку: ответ «ошибка»');
  assert.deepEqual(await L.removeCrossposts(CH, ['pn-3']), [], 'пост без выходов в сети ничего не требует');
});

test('заглушка сервера: номера записей растут, правка возвращает прежний номер, ответ «ошибка» даёт временные причины', async () => {
  const L = await fresh();
  const mock = L.createMockTransport({ delay: 0 });
  const a = await mock.publish({ chatId: CH, postId: 'x', network: 'telegram', text: 'a' });
  const b = await mock.publish({ chatId: CH, postId: 'y', network: 'vk', text: 'b' });
  assert.equal(a.ok && b.ok, true);
  assert.notEqual(a.remoteId, b.remoteId);
  assert.deepEqual(await mock.edit({ chatId: CH, postId: 'x', network: 'telegram', text: 'a2', remoteId: a.remoteId }), { ok: true, remoteId: a.remoteId });
  assert.deepEqual(await mock.remove({ chatId: CH, postId: 'x', network: 'telegram', remoteId: a.remoteId }), { ok: true });
  L.setMockReply('fail');
  assert.deepEqual(await mock.publish({ chatId: CH, postId: 'x', network: 'telegram', text: 'a' }), { ok: false, failure: { code: 'unreachable' } });
  assert.deepEqual(await mock.publish({ chatId: CH, postId: 'x', network: 'vk', text: 'a' }), { ok: false, failure: { code: 'rate_limited' } });
  assert.deepEqual((await mock.edit({ chatId: CH, postId: 'x', network: 'telegram', text: 'a', remoteId: '1' })).ok, false);
  assert.deepEqual((await mock.remove({ chatId: CH, postId: 'x', network: 'vk', remoteId: '1' })).ok, false);
  for (const code of ['unreachable', 'rate_limited']) assert.equal(L.BREAKS_CONNECTION.has(code), false, 'временные ошибки подключение не ломают');
});

test('канал удалён или покинут — подключения уходят вместе с ним', async () => {
  const L = await fresh();
  assert.equal(L.getConnections(CH).length, 2);
  L.leaveGroup(CH);
  assert.deepEqual(L.getConnections(CH), []);
  assert.deepEqual(L.pickedNetworks(CH), []);
  assert.deepEqual(L.syncedNetworks(CH, ['pn-1']), [], 'и постов в переписке больше нет');
});
