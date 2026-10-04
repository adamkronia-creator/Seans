import { useState } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { ChatPage } from './pages/ChatPage/ChatPage';
import { EventsPage } from './pages/EventsPage/EventsPage';
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
  if (route.startsWith('/chat/')) {
    return (
      <div className="app">
        <main className="app__content">
          <ChatPage chatId={route.slice('/chat/'.length)} />
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
