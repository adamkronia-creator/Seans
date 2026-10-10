import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { ComingSoon } from './components/ComingSoon/ComingSoon';
import { IconReading } from './components/icons';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { ChatResultScreen, ChatTestScreen } from './pages/ChatPage/ChatScreens';
import { EventsPage } from './pages/EventsPage/EventsPage';
import { PlannerPage } from './pages/PlannerPage/PlannerPage';
import { TasksPage } from './pages/TasksPage/TasksPage';
import { TestsPage } from './pages/TestsPage/TestsPage';
import { TestSettings } from './components/TestSettings/TestSettings';
import { wantSection, type ChatSection } from './data/chatIntent';
import { CHATS } from './data/chats';
import { LIBRARY } from './data/library';
import { MessagesPage } from './pages/MessagesPage/MessagesPage';
import { goBack, navigate, useRoute } from './router';
import { useEdgeBack } from './utils/edgeBack';
import { LayerContext } from './utils/layer';
import { transition } from './utils/transition';

/** Разделы нижней панели, которых еще нет: значок и название на пустом экране */
const COMING_SOON = {
  reading: { title: 'Материалы для чтения', Icon: IconReading },
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
    // Нажатие на «Сообщения» ведёт на список чатов; открытая настройка теста закрывается
    const toRoot = (id === 'messages' || current.startsWith('/tests/')) && current !== '/';
    if (id === active && !toRoot) return;
    // Другая вкладка — мягкая смена содержимого; та же вкладка — возврат к её списку: открытый экран уезжает вправо
    transition(() => {
      setTab(id);
      if (toRoot) navigate('/', 'none');
    }, id === active ? 'back' : 'fade');
  }, []);

  /** Открыть чат на нужном разделе из другой вкладки (из «Ежедневника»): назад ведет к списку чатов */
  const openChat = useCallback((chatId: string, section: ChatSection) => {
    wantSection(chatId, section);
    transition(() => {
      setTab('messages');
      navigate(`/chat/${chatId}`, 'none');
    }, 'forward');
  }, []);

  /** Обычный экран приложения: содержимое и нижняя панель разделов */
  const page = (key: string, node: ReactNode): Resolved => ({
    key,
    build: () => (
      <>
        <main className="app__content">{node}</main>
        <TabBar active={tab} onChange={handleTabChange} />
      </>
    ),
  });

  /** Что показывает адрес: ключ экрана и как его построить (строится один раз, пока экран на месте) */
  const resolve = (path: string): Resolved => {
    // Открытый чат занимает весь экран, без нижней панели разделов
    const chatRoute = tab === 'messages' ? path.match(CHAT_ROUTE) : null;
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

    if (tab === 'messages') return path === '/events' ? page('events', <EventsPage />) : page('messages', <MessagesPage />);
    if (tab === 'tests') {
      // /tests/<тест>: настройка теста из раздела «Психологические тесты»
      const testId = path.match(/^\/tests\/([^/]+)/)?.[1];
      const test = testId ? LIBRARY.find((t) => t.id === testId) : undefined;
      return test ? page(`tests/${test.id}`, <TestSettings test={test} onBack={() => goBack('/')} />) : page('tests', <TestsPage />);
    }
    if (tab === 'tasks') return page('tasks', <TasksPage />);
    if (tab === 'planner') return page('planner', <PlannerPage onOpenChat={openChat} />);
    const soon = COMING_SOON[tab];
    return page(`tab/${tab}`, <ComingSoon Icon={soon.Icon} title={soon.title} />);
  };

  // Построенный экран переиспользуется, пока его вкладка та же: тот же элемент React не перерисовывает, и нижний слой
  // (чат под результатом, список под чатом) не работает вхолостую при каждой смене адреса
  const built = useRef(new Map<string, ReactNode>());
  const used = new Set<string>();
  const screenFor = (path: string): Screen => {
    const { key, build } = resolve(path);
    const id = `${tab}|${key}`;
    used.add(id);
    let node = built.current.get(id);
    if (node === undefined) {
      node = build();
      built.current.set(id, node);
    }
    return { key, node };
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
        <Layer key={screen.key} top={onTop}>
          {screen.node}
        </Layer>
      ))}
    </div>
  );
}
