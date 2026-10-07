import { useState } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { EventsPage } from './pages/EventsPage/EventsPage';
import { TasksPage } from './pages/TasksPage/TasksPage';
import { TestsPage } from './pages/TestsPage/TestsPage';
import { TestSettings } from './components/TestSettings/TestSettings';
import { LIBRARY } from './data/library';
import { MessagesPage } from './pages/MessagesPage/MessagesPage';
import { goBack, navigate, useRoute } from './router';

export default function App() {
  const [tab, setTab] = useState<TabId>('messages');
  const route = useRoute();

  // /tests/<тест>: настройка теста из раздела «Психологические тесты»
  const testId = route.match(/^\/tests\/([^/]+)/)?.[1];
  const testRoute = testId ? LIBRARY.find((t) => t.id === testId) : undefined;

  const handleTabChange = (id: TabId) => {
    setTab(id);
    // Нажатие на «Сообщения» ведёт на список чатов; открытая настройка теста закрывается
    if (id === 'messages' || route.startsWith('/tests/')) navigate('/');
  };

  // Открытый чат занимает весь экран, без нижней панели разделов.
  // Адрес: /chat/<чат>, /chat/<чат>/tests/<тест> (настройка теста внутри чата)
  // или /chat/<чат>/result/<результат> (результат самостоятельного прохождения)
  const chatRoute = route.match(/^\/chat\/([^/]+)(?:\/(tests|result)\/([^/]+))?/);
  if (tab === 'messages' && chatRoute) {
    return (
      <div className="app">
        <main className="app__content">
          <ChatPage
            chatId={chatRoute[1]}
            testId={chatRoute[2] === 'tests' ? chatRoute[3] : undefined}
            resultId={chatRoute[2] === 'result' ? chatRoute[3] : undefined}
            onAppTabChange={handleTabChange}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main className="app__content">
        {tab === 'messages' ? (
          route === '/events' ? (
            <EventsPage />
          ) : (
            <MessagesPage />
          )
        ) : tab === 'tests' ? (
          testRoute ? (
            <TestSettings test={testRoute} onBack={() => goBack('/')} />
          ) : (
            <TestsPage />
          )
        ) : tab === 'tasks' ? (
          <TasksPage />
        ) : (
          <p style={{ padding: 24, color: 'var(--color-text-caption)' }}>
            Раздел в разработке
          </p>
        )}
      </main>
      <TabBar active={tab} onChange={handleTabChange} />
    </div>
  );
}
