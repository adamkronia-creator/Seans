import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { TestResult } from '../../components/TestSettings/TestResult';
import { TestSettings } from '../../components/TestSettings/TestSettings';
import type { LibraryTest } from '../../data/library';
import { goBack } from '../../router';
import './ChatPage.css';

/*
 * Экраны, которые открываются из чата поверх него (настройка теста, результат). Это отдельные экраны-слои, как и сам чат:
 * жест «назад» тянет такой экран вправо, и под ним остаётся чат ровно в том месте, где его оставили.
 * Шапку и вкладки чата они заменяют своими; снизу нижняя панель приложения, как у вкладки «Тесты».
 */

interface ChatTestScreenProps {
  chatId: string;
  test: LibraryTest;
  onAppTabChange: (id: TabId) => void;
}

/** Настройка теста внутри чата: тест можно отправить собеседнику (адрес /chat/<чат>/tests/<тест>) */
export function ChatTestScreen({ chatId, test, onAppTabChange }: ChatTestScreenProps) {
  return (
    <section className="chat">
      <TestSettings test={test} chatId={chatId} onBack={() => goBack(`/chat/${chatId}`)} />
      <TabBar active="messages" onChange={onAppTabChange} />
    </section>
  );
}

interface ChatResultScreenProps {
  chatId: string;
  resultId: string;
  onAppTabChange: (id: TabId) => void;
}

/** Результат тестирования: своего прохождения или клиента (адрес /chat/<чат>/result/<результат>) */
export function ChatResultScreen({ chatId, resultId, onAppTabChange }: ChatResultScreenProps) {
  return (
    <section className="chat">
      <TestResult resultId={resultId} onBack={() => goBack(`/chat/${chatId}`)} />
      <TabBar active="messages" onChange={onAppTabChange} />
    </section>
  );
}
