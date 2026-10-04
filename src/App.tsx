import { useState } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { EventsPage } from './pages/EventsPage/EventsPage';
import { TasksPage } from './pages/TasksPage/TasksPage';
import { TestsPage } from './pages/TestsPage/TestsPage';
import { MessagesPage } from './pages/MessagesPage/MessagesPage';
import { navigate, useRoute } from './router';

export default function App() {
  const [tab, setTab] = useState<TabId>('messages');
  const route = useRoute();

  const handleTabChange = (id: TabId) => {
    setTab(id);
    // Нажатие на «Сообщения» ведёт на список чатов
    if (id === 'messages') navigate('/');
  };

  // Открытый чат занимает весь экран, без нижней панели разделов
  if (tab === 'messages' && route.startsWith('/chat/')) {
    return (
      <div className="app">
        <main className="app__content">
          <ChatPage chatId={route.slice('/chat/'.length)} onAppTabChange={handleTabChange} />
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
          <TestsPage />
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
