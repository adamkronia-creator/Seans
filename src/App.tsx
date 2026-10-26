import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { registerTabSwitch } from './utils/tabNav';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { ChatResultScreen, ChatSentTestScreen, ChatTaskScreen, ChatTestScreen } from './pages/ChatPage/ChatScreens';
import { ChatTabsPage } from './pages/ChatTabsPage/ChatTabsPage';
import { ContactPage } from './pages/ContactPage/ContactPage';
import { EventsPage } from './pages/EventsPage/EventsPage';
import { FolderPage } from './pages/FolderPage/FolderPage';
import { FoldersPage, foldersPath } from './pages/FoldersPage/FoldersPage';
import { PersonProfilePage } from './pages/PersonProfilePage/PersonProfilePage';
import { ProfileEditPage } from './pages/ProfilePage/ProfileEdit';
import { PhotosPage } from './pages/PhotosPage/PhotosPage';
import { ProfilePage } from './pages/ProfilePage/ProfilePage';
import { TasksPage } from './pages/TasksPage/TasksPage';
import { TestsPage } from './pages/TestsPage/TestsPage';
import { TaskSettings } from './components/TestSettings/TaskSettingsLazy';
import { TestSettings } from './components/TestSettings/TestSettingsLazy';
import { getChat } from './data/chatStore';
import { getFolder, type FolderScope } from './data/folders';
import { LIBRARY, TASK_LIBRARY } from './data/library';
import { ArchivePage } from './pages/ArchivePage/ArchivePage';
import { MessagesPage } from './pages/MessagesPage/MessagesPage';
import { NewChatPage, type NewStep } from './pages/NewChatPage/NewChatPage';
import { GroupScreen, groupParentOf, groupSubOf } from './pages/GroupPages/GroupRoute';
import { JoinPage } from './pages/GroupPages/JoinPage';
import { goBack, keepTabbarOnNextShow, navigate, useRoute, wasPopped } from './router';
import { useEdgeBack } from './utils/edgeBack';
import { LayerContext } from './utils/layer';
import { transition, type TransitionKind } from './utils/transition';

/** Что показывает адрес: key один и тот же, пока на экране тот же экран, поэтому при смене слоёв он не рисуется заново */
interface Screen {
  key: string;
  node: ReactNode;
  /** Экран уже на новой системе (цвета, шрифт и сетка из справочника мессенджера): его слой получает data-pm */
  pm?: boolean;
}

/** Экран по адресу, ещё не построенный: у экрана и при смене слоёв один и тот же key */
interface Resolved {
  key: string;
  build: () => ReactNode;
  pm?: boolean;
}

/**
 * Адреса чата: /chat/<чат>, /chat/<чат>/tests/<тест> (настройка теста внутри чата), /chat/<чат>/tasks/<задание> (настройка задания)
 * и /chat/<чат>/result/<результат> (результат теста или задания); /chat/<чат>/contact — профиль собеседника; /chat/<чат>/tabs — настройки вкладок чата
 */
const CHAT_ROUTE = /^\/chat\/([^/]+)(?:\/(tests|tasks|result|sent)\/([^/]+)|\/(contact|profile|tabs))?/;

/** Мастер нового чата: /new (контакты), /new/group, /new/group/info, /new/channel, /new/channel/type, /new/channel/members */
const NEW_STEPS: Record<string, NewStep> = {
  '/new': 'start',
  '/new/group': 'group',
  '/new/group/info': 'group-info',
  '/new/channel': 'channel',
  '/new/channel/type': 'channel-type',
  '/new/channel/members': 'channel-members',
};
const newStepOf = (path: string): NewStep | undefined => NEW_STEPS[path.replace(/\/$/, '')];

/** Вступление по ссылке-приглашению или адресу @имя: /join/<код> */
const JOIN_ROUTE = /^\/join\/([^/]+)\/?$/;

/** Адрес настроек папки: /folder/<папка>; раздел (чаты, тесты, задания) определяет вкладка, на которой он открыт */
const FOLDER_ROUTE = /^\/folder\/([^/]+)/;

/** Куда вёл бы «назад» с этого адреса, если истории нет (открыли по прямой ссылке) */
function parentOf(path: string): string | null {
  // Мастер нового чата: шаг ведёт на предыдущий, первый — в список
  if (newStepOf(path)) {
    const steps: Record<NewStep, string> = { start: '/', group: '/new', 'group-info': '/new/group', channel: '/new', 'channel-type': '/new/channel', 'channel-members': '/new/channel/type' };
    return steps[newStepOf(path)!];
  }
  // Страницы группы и канала: каждая ведёт на страницу выше (ссылка → список ссылок → управление → группа → чат)
  const grp = groupSubOf(path);
  if (grp) return groupParentOf(grp.chatId, grp.sub);
  if (JOIN_ROUTE.test(path)) return '/';
  const nested = path.match(/^(\/chat\/[^/]+)\/(?:(?:tests|tasks|result|sent)\/|contact|profile|tabs)/);
  // Профиль собеседника лежит над его карточкой, карточка — над чатом
  if (nested) return path.endsWith('/profile') ? `${nested[1]}/contact` : nested[1];
  return path === '/' ? null : '/';
}

/**
 * Один экран-слой. Верхний лежит поверх всего, нижний (тот, куда вернёмся) спрятан, но уже нарисован
 * и показывается при жесте «назад» (utils/edgeBack.ts), поэтому в нём сохраняются прокрутка и набранное.
 */
function Layer({ top, pm, children }: { top: boolean; pm?: boolean; children: ReactNode }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const info = useMemo(() => ({ top, element }), [top, element]);
  // Нижний экран не получает нажатий и фокуса, даже когда виден при жесте
  useLayoutEffect(() => {
    if (element) element.inert = !top;
  }, [element, top]);
  return (
    <div ref={setElement} className="screen" data-layer={top ? 'top' : 'under'} data-pm={pm ? '' : undefined}>
      <LayerContext.Provider value={info}>{children}</LayerContext.Provider>
      <div className="screen__dim" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const [tabState, setTab] = useState<TabId>('messages');
  const { path: route, prev } = useRoute();
  const appRef = useRef<HTMLDivElement>(null);

  // «Назад» браузера возвращает на экран вместе с его разделом: раздел виден по началу адреса (/tests/…, /tasks/…, /profile/…)
  const prefixTab = /^\/(tests|tasks|profile)\//.exec(route)?.[1] as TabId | undefined;
  const known = prefixTab && wasPopped() ? prefixTab : undefined;
  const tab = known ?? tabState;
  useLayoutEffect(() => {
    if (known && known !== tabState) setTab(known);
  });

  // Открытое в каждом разделе: уходишь в другой раздел и возвращаешься — на том же экране, а не в списке
  const savedRoute = useRef<Partial<Record<TabId, string>>>({});

  // Обработчики экранов живут дольше одного кадра (нижний слой не перерисовывается при каждой смене адреса),
  // поэтому свежие значения они берут отсюда, а не из замыкания
  const latest = useRef({ route, tab });
  useLayoutEffect(() => {
    latest.current = { route, tab };
  });

  const handleTabChange = useCallback((id: TabId, kind?: TransitionKind) => {
    const { route: current, tab: active } = latest.current;
    const inChat = current.startsWith('/chat/') || current === '/events';
    const deep = current !== '/' && !inChat;
    // Нажатие на «Сообщения» ведёт на список чатов; открытая настройка теста закрывается
    const toRoot = (id === 'messages' || current.startsWith('/tests/') || current.startsWith('/tasks/')) && current !== '/';
    if (id === active && !toRoot) return;
    // Уходя из раздела, запоминаем, что в нём открыто; вернувшись, открываем это же
    if (id !== active) savedRoute.current[active] = deep ? current : undefined;
    const restore = id !== active ? savedRoute.current[id] : undefined;
    const dest = restore ?? (toRoot || (id !== active && deep) ? '/' : null);
    // Другая вкладка — мягкая смена содержимого; та же вкладка — возврат к её списку: открытый экран уезжает вправо
    if (dest) keepTabbarOnNextShow();
    transition(() => {
      setTab(id);
      if (dest && dest !== current) navigate(dest, 'none');
    }, id === active ? 'back' : (kind ?? 'fade'));
  }, []);
  useLayoutEffect(() => {
    registerTabSwitch(handleTabChange);
  }, [handleTabChange]);

  /** Настройки папки на весь экран, без нижней панели (как редактирование профиля); если такой папки нет, экран не строится */
  const folderScreen = (path: string, scope: FolderScope): Resolved | null => {
    if (path === foldersPath) {
      return {
        key: `folders/${scope}`,
        pm: true,
        build: () => (
          <main className="app__content">
            <FoldersPage scope={scope} />
          </main>
        ),
      };
    }
    const id = path.match(FOLDER_ROUTE)?.[1];
    if (!id || !getFolder(scope, id)) return null;
    return {
      key: `folder/${id}`,
      pm: true,
      build: () => (
        <main className="app__content">
          <FolderPage scope={scope} id={id} />
        </main>
      ),
    };
  };

  /** Обычный экран приложения: содержимое и нижняя панель разделов */
  const page = (key: string, node: ReactNode, at: TabId, pm = false): Resolved => ({
    key,
    pm,
    build: () => (
      <>
        <main className="app__content">{node}</main>
        <TabBar active={at} onChange={handleTabChange} />
      </>
    ),
  });

  /** Что показывает адрес: ключ экрана и как его построить (строится один раз, пока экран на месте) */
  const resolve = (path: string, at: TabId): Resolved => {
    // Страницы группы или канала (/chat/<чат>/g…) раньше самого чата: его адрес устроен как начало этого
    const groupRoute = at === 'messages' ? groupSubOf(path) : null;
    if (groupRoute && getChat(groupRoute.chatId)) {
      const { chatId, sub } = groupRoute;
      return {
        key: `chat/${chatId}/g/${sub}`,
        pm: true,
        build: () => (
          <main className="app__content">
            <GroupScreen chatId={chatId} sub={sub} />
          </main>
        ),
      };
    }
    // Открытый чат занимает весь экран, без нижней панели разделов
    const chatRoute = at === 'messages' ? path.match(CHAT_ROUTE) : null;
    if (chatRoute) {
      const [, chatId, kind, id, contact] = chatRoute;
      if (getChat(chatId)) {
        const test = kind === 'tests' ? LIBRARY.find((t) => t.id === id) : undefined;
        const task = kind === 'tasks' ? TASK_LIBRARY.find((t) => t.id === id) : undefined;
        if (contact === 'tabs') {
          return {
            key: `chat/${chatId}/tabs`,
            pm: true,
            build: () => (
              <main className="app__content">
                <ChatTabsPage chatId={chatId} />
              </main>
            ),
          };
        }
        if (contact === 'profile') {
          return {
            key: `chat/${chatId}/profile`,
            pm: true,
            build: () => (
              <main className="app__content">
                <PersonProfilePage chatId={chatId} />
              </main>
            ),
          };
        }
        if (contact) {
          return {
            key: `chat/${chatId}/contact`,
            pm: true,
            build: () => (
              <main className="app__content">
                <ContactPage chatId={chatId} />
              </main>
            ),
          };
        }
        if (kind === 'sent') {
          return {
            key: `chat/${chatId}/sent/${id}`,
            pm: true,
            build: () => (
              <main className="app__content">
                <ChatSentTestScreen chatId={chatId} messageId={id} onAppTabChange={handleTabChange} />
              </main>
            ),
          };
        }
        if (kind === 'result') {
          return {
            key: `chat/${chatId}/result/${id}`,
            pm: true,
            build: () => (
              <main className="app__content">
                <ChatResultScreen chatId={chatId} resultId={id} onAppTabChange={handleTabChange} />
              </main>
            ),
          };
        }
        if (task) {
          return {
            key: `chat/${chatId}/tasks/${id}`,
            pm: true,
            build: () => (
              <main className="app__content">
                <ChatTaskScreen chatId={chatId} task={task} onAppTabChange={handleTabChange} />
              </main>
            ),
          };
        }
        if (test) {
          return {
            key: `chat/${chatId}/tests/${id}`,
            pm: true,
            build: () => (
              <main className="app__content">
                <ChatTestScreen chatId={chatId} test={test} onAppTabChange={handleTabChange} />
              </main>
            ),
          };
        }
      }
      return {
        key: `chat/${chatId}`,
        pm: true,
        build: () => (
          <main className="app__content">
            <ChatPage chatId={chatId} onAppTabChange={handleTabChange} />
          </main>
        ),
      };
    }

    if (at === 'messages') {
      const folder = folderScreen(path, 'chats');
      if (folder) return folder;
      const join = path.match(JOIN_ROUTE);
      if (join) {
        const code = decodeURIComponent(join[1]);
        return {
          key: `join/${code}`,
          pm: true,
          build: () => (
            <main className="app__content">
              <JoinPage code={code} />
            </main>
          ),
        };
      }
      const step = newStepOf(path);
      if (step) {
        return {
          key: `new/${step}`,
          pm: true,
          build: () => (
            <main className="app__content">
              <NewChatPage step={step} />
            </main>
          ),
        };
      }
      // /archive: «Архив чатов» на весь экран, без нижней панели
      if (path === '/archive') {
        return {
          key: 'archive',
          pm: true,
          build: () => (
            <main className="app__content">
              <ArchivePage />
            </main>
          ),
        };
      }
      return path === '/events' ? page('events', <EventsPage />, at, true) : page('messages', <MessagesPage />, at, true);
    }
    if (at === 'tests') {
      const folder = folderScreen(path, 'tests');
      if (folder) return folder;
      // /tests/<тест>: настройка теста из раздела «Психологические тесты»
      const testId = path.match(/^\/tests\/([^/]+)/)?.[1];
      const test = testId ? LIBRARY.find((t) => t.id === testId) : undefined;
      return test ? page(`tests/${test.id}`, <TestSettings test={test} onBack={() => goBack('/')} />, at, true) : page('tests', <TestsPage />, at, true);
    }
    if (at === 'tasks') {
      const folder = folderScreen(path, 'tasks');
      if (folder) return folder;
      // /tasks/<задание>: настройка задания из раздела «Задания»
      const taskId = path.match(/^\/tasks\/([^/]+)/)?.[1];
      const task = taskId ? TASK_LIBRARY.find((t) => t.id === taskId) : undefined;
      return task ? page(`tasks/${task.id}`, <TaskSettings task={task} onBack={() => goBack('/')} />, at, true) : page('tasks', <TasksPage />, at, true);
    }
    // /profile/photos, /profile/photos/albums и /profile/photos/album/<альбом>: фото и альбомы на весь экран; у каждой вкладки свой ключ (экран строится заново)
    const photosRoute = path.match(/^\/profile\/photos(?:\/(albums)|\/album\/([^/]+))?\/?$/);
    if (photosRoute) {
      const albumId = photosRoute[2];
      const view = albumId ? 'album' : photosRoute[1] ? 'albums' : 'photos';
      return {
        key: albumId ? `profile/photos/album/${albumId}` : `profile/photos/${view}`,
        pm: true,
        build: () => (
          <main className="app__content">
            <PhotosPage view={view} albumId={albumId} />
          </main>
        ),
      };
    }
    // Остался «Профиль». /profile/edit: редактирование профиля на весь экран, без нижней панели (как чат)
    if (path === '/profile/edit') {
      return {
        key: 'profile/edit',
        pm: true,
        build: () => (
          <main className="app__content">
            <ProfileEditPage />
          </main>
        ),
      };
    }
    return page('profile', <ProfilePage />, at, true);
  };

  // Построенный экран переиспользуется, пока его вкладка та же: тот же элемент React не перерисовывает, и нижний слой
  // (чат под результатом, список под чатом) не работает вхолостую при каждой смене адреса
  const built = useRef(new Map<string, ReactNode>());
  const used = new Set<string>();
  const screenFor = (path: string, at: TabId = tab): Screen => {
    const { key, build, pm } = resolve(path, at);
    const id = `${at}|${key}`;
    used.add(id);
    let node = built.current.get(id);
    if (node === undefined) {
      node = build();
      built.current.set(id, node);
    }
    return { key, node, pm };
  };

  const top = screenFor(route);
  // Под экраном лежит тот, откуда пришли (а при прямой ссылке — тот, куда вёл бы «назад»). У корня «назад» нет
  const underPath = route === '/' ? null : prev ?? parentOf(route);
  let under = underPath !== null && underPath !== route ? screenFor(underPath) : null;
  if (under?.key === top.key) under = null;

  useEdgeBack(appRef, {
    enabled: under !== null,
    // Экран уже уехал за край жестом: возвращаемся без второй анимации
    onCommit: () => goBack(underPath ?? '/', 'none'),
    screenKey: top.key,
  });

  // Экраны, которых больше нет ни сверху, ни снизу, забываются
  useLayoutEffect(() => {
    built.current.forEach((_, id) => {
      if (!used.has(id)) built.current.delete(id);
    });
  });

  // Слои по порядку снизу вверх; экран держится за свой key, поэтому при переходе вглубь прежний остаётся на месте и лишь уходит вниз
  const layers = under ? [{ screen: under, top: false }, { screen: top, top: true }] : [{ screen: top, top: true }];

  return (
    <div className="app" ref={appRef}>
      {layers.map(({ screen, top: onTop }) => (
        <Layer key={screen.key} top={onTop} pm={screen.pm}>
          {screen.node}
        </Layer>
      ))}
    </div>
  );
}
