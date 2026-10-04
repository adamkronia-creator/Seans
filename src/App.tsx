import { useState } from 'react';
import { TabBar, type TabId } from './components/TabBar/TabBar';
import { MessagesPage } from './pages/MessagesPage/MessagesPage';

export default function App() {
  const [tab, setTab] = useState<TabId>('messages');

  return (
    <div className="app">
      <main className="app__content">
        {tab === 'messages' ? (
          <MessagesPage />
        ) : (
          <p style={{ padding: 24, color: 'var(--color-text-caption)' }}>
            Раздел в разработке
          </p>
        )}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
