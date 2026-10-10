import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { ComingSoon } from './components/ComingSoon/ComingSoon';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { ChatResultScreen, ChatTestScreen } from './pages/ChatPage/ChatScreens';
import { EventsPage } from './pages/EventsPage/EventsPage';
import { PlannerPage } from './pages/PlannerPage/PlannerPage';
import { TasksPage } from './pages/TasksPage/TasksPage';
import { TestsPage } from './pages/TestsPage/TestsPage';
import { TaskSettings } from './components/TestSettings/TaskSettingsLazy';
import { TestSettings } from './components/TestSettings/TestSettingsLazy';
import { wantSection, type ChatSection } from './data/chatIntent';
import { CHATS } from './data/chats';
import { LIBRARY, TASK_LIBRARY } from './data/library';
import { MessagesPage } from './pages/MessagesPage/MessagesPage';
import { goBack, navigate, useRoute } from './router';
import { useEdgeBack } from './utils/edgeBack';
import { LayerContext } from './utils/layer';
import { transition } from './utils/transition';

/** Разделы нижней панели, которых еще нет: название и что в них появится */
const COMING_SOON = {
  reading: { title: 'Материалы для чтения', text: 'Здесь появятся статьи, книги и памятки для работы с клиентами.' },
} as const;

/** Что показывает адрес: key один и тот же, пока на экране тот же экран, поэтому при смене слоёв он не рисуется заново */
interface Screen {
  key: string;
  node: ReactNode;
}

/** Экран по адресу, ещё не построенный: у экрана и при смене слоёв один и тот же key */
interface Resolved {
  key: string;
  build: () => ReactNode;
}

/**
 * Адреса чата: /chat/<чат>, /chat/<чат>/tests/<тест> (настройка теста внутри чата)
 * и /chat/<чат>/result/<результат> (результат самостоятельного прохождения)
 */
const CHAT_ROUTE = /^\/chat\/([^/]+)(?:\/(tests|result)\/([^/]+))?/;

/** Куда вёл бы «назад» с этого адреса, если истории нет (открыли по прямой ссылке) */
function parentOf(path: string): string | null {
  const nested = path.match(/^(\/chat\/[^/]+)\/(?:tests|result)\//);
  if (nested) return nested[1];
  return path === '/' ? null : '/';
}

/**
 * Один экран-слой. Верхний лежит поверх всего, нижний (тот, куда вернёмся) спрятан, но уже нарисован
 * и показывается при жесте «назад» (utils/edgeBack.ts), поэтому в нём сохраняются прокрутка и набранное.
 */
function Layer({ top, children }: { top: boolean; children: ReactNode }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const info = useMemo(() => ({ top, element }), [top, element]);
  // Нижний экран не получает нажатий и фокуса, даже когда виден при жесте
  useLayoutEffect(() => {
    if (element) element.inert = !top;
  }, [element, top]);
  return (
    <div ref={setElement} className="screen" data-layer={top ? 'top' : 'under'}>
      <LayerContext.Provider value={info}>{children}</LayerContext.Provider>
      <div className="screen__dim" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>('messages');
  // Вкладка, из которой открыли чат (из «Ежедневника»): «назад» из чата возвращает на неё, а не к списку чатов
  const [origin, setOrigin] = useState<TabId | null>(null);
  /** Чат уже открыт: возврат на корень считается возвратом из него (а не просто моментом до перехода) */
  const away = useRef(false);
  const { path: route, prev } = useRoute();
  const appRef = useRef<HTMLDivElement>(null);

  // Обработчики экранов живут дольше одного кадра (нижний слой не перерисовывается при каждой смене адреса),
  // поэтому свежие значения они берут отсюда, а не из замыкания
  const latest = useRef({ route, tab });
  useLayoutEffect(() => {
    latest.current = { route, tab };
  });

  const handleTabChange = useCallback((id: TabId) => {
    const { route: current, tab: active } = latest.current;
    // Вкладку выбрали сами: возвращаться на ту, откуда открыли чат, уже не нужно
    setOrigin(null);
    // Нажатие на «Сообщения» ведёт на список чатов; открытая настройка теста закрывается
    const toRoot = (id === 'messages' || current.startsWith('/tests/') || current.startsWith('/tasks/')) && current !== '/';
    if (id === active && !toRoot) return;
    // Другая вкладка — мягкая смена содержимого; та же вкладка — возврат к её списку: открытый экран уезжает вправо
    transition(() => {
      setTab(id);
      if (toRoot) navigate('/', 'none');
    }, id === active ? 'back' : 'fade');
  }, []);

  /** Открыть чат на нужном разделе из другой вкладки (из «Ежедневника»): назад возвращает на ту вкладку */
  const openChat = useCallback((chatId: string, section: ChatSection) => {
    wantSection(chatId, section);
    const from = latest.current.tab;
    transition(() => {
      away.current = false;
      setOrigin(from);
      setTab('messages');
      navigate(`/chat/${chatId}`, 'none');
    }, 'forward');
  }, []);

  /** Обычный экран приложения: содержимое и нижняя панель разделов */
  const page = (key: string, node: ReactNode, at: TabId): Resolved => ({
    key,
    build: () => (
      <>
        <main className="app__content">{node}</main>
        <TabBar active={at} onChange={handleTabChange} />
      </>
    ),
  });

  /** Что показывает адрес: ключ экрана и как его построить (строится один раз, пока экран на месте) */
  const resolve = (path: string, at: TabId): Resolved => {
    // Открытый чат занимает весь экран, без нижней панели разделов
    const chatRoute = at === 'messages' ? path.match(CHAT_ROUTE) : null;
    if (chatRoute) {
      const [, chatId, kind, id] = chatRoute;
      if (CHATS.some((chat) => chat.id === chatId)) {
        const test = kind === 'tests' ? LIBRARY.find((t) => t.id === id) : undefined;
        if (kind === 'result') {
          return {
            key: `chat/${chatId}/result/${id}`,
            build: () => (
              <main className="app__content">
                <ChatResultScreen chatId={chatId} resultId={id} onAppTabChange={handleTabChange} />
              </main>
            ),
          };
        }
        if (test) {
          return {
            key: `chat/${chatId}/tests/${id}`,
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
        build: () => (
          <main className="app__content">
            <ChatPage chatId={chatId} onAppTabChange={handleTabChange} />
          </main>
        ),
      };
    }

    if (at === 'messages') return path === '/events' ? page('events', <EventsPage />, at) : page('messages', <MessagesPage />, at);
    if (at === 'tests') {
      // /tests/<тест>: настройка теста из раздела «Психологические тесты»
      const testId = path.match(/^\/tests\/([^/]+)/)?.[1];
      const test = testId ? LIBRARY.find((t) => t.id === testId) : undefined;
      return test ? page(`tests/${test.id}`, <TestSettings test={test} onBack={() => goBack('/')} />, at) : page('tests', <TestsPage />, at);
    }
    if (at === 'tasks') {
      // /tasks/<задание>: настройка задания из раздела «Задания»
      const taskId = path.match(/^\/tasks\/([^/]+)/)?.[1];
      const task = taskId ? TASK_LIBRARY.find((t) => t.id === taskId) : undefined;
      return task ? page(`tasks/${task.id}`, <TaskSettings task={task} onBack={() => goBack('/')} />, at) : page('tasks', <TasksPage />, at);
    }
    if (at === 'planner') return page('planner', <PlannerPage onOpenChat={openChat} />, at);
    const soon = COMING_SOON[at];
    return page(`tab/${at}`, <ComingSoon title={soon.title} text={soon.text} />, at);
  };

  // Построенный экран переиспользуется, пока его вкладка та же: тот же элемент React не перерисовывает, и нижний слой
  // (чат под результатом, список под чатом) не работает вхолостую при каждой смене адреса
  const built = useRef(new Map<string, ReactNode>());
  const used = new Set<string>();
  const screenFor = (path: string, at: TabId = tab): Screen => {
    const { key, build } = resolve(path, at);
    const id = `${at}|${key}`;
    used.add(id);
    let node = built.current.get(id);
    if (node === undefined) {
      node = build();
      built.current.set(id, node);
    }
    return { key, node };
  };

  // Пока чат только открывается или уже закрылся, корень — это вкладка, откуда пришли: ее экран остается на месте и не пересоздается
  const topTab = origin && tab === 'messages' && route === '/' ? origin : tab;
  const top = screenFor(route, topTab);
  // Под экраном лежит тот, откуда пришли (а при прямой ссылке — тот, куда вёл бы «назад»). У корня «назад» нет
  const underPath = route === '/' ? null : prev ?? parentOf(route);
  // Чат открыт из другой вкладки: под ним лежит она (то же, что было на экране), а не список чатов
  const underTab = origin && underPath === '/' && tab === 'messages' ? origin : tab;
  let under = underPath !== null && underPath !== route ? screenFor(underPath, underTab) : null;
  if (under?.key === top.key) under = null;

  // Вернулись из чата на корень: открывается вкладка, с которой пришли; ее экран уже нарисован под чатом и остается как был
  useLayoutEffect(() => {
    if (origin === null) return;
    if (route !== '/') {
      away.current = true;
    } else if (away.current) {
      away.current = false;
      setTab(origin);
      setOrigin(null);
    }
  }, [route, origin]);

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
        <Layer key={screen.key} top={onTop}>
          {screen.node}
        </Layer>
      ))}
    </div>
  );
}
