import { TabBar, type TabId } from '../../components/TabBar/TabBar';
import { TaskResult } from '../../components/TestSettings/TaskResultLazy';
import { TaskSettings } from '../../components/TestSettings/TaskSettingsLazy';
import { TestResult } from '../../components/TestSettings/TestResult';
import { TestSettings } from '../../components/TestSettings/TestSettingsLazy';
import type { LibraryTask, LibraryTest } from '../../data/library';
import { isTaskResultId } from '../../data/selfTask';
import { useMessages } from '../../data/chatStore';
import { LIBRARY } from '../../data/library';
import { goBack } from '../../router';
import './ChatPage.css';

/*
 * Экраны, которые открываются из чата поверх него (настройка теста или задания, результат). Это отдельные экраны-слои, как и сам чат:
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

interface ChatSentTestScreenProps {
  chatId: string;
  messageId: string;
  onAppTabChange: (id: TabId) => void;
}

/** Настройки отправленного клиенту теста: тот же экран, только для просмотра, с водяным знаком (адрес /chat/<чат>/sent/<сообщение>) */
export function ChatSentTestScreen({ chatId, messageId, onAppTabChange }: ChatSentTestScreenProps) {
  const groups = useMessages(chatId);
  const message = groups.flatMap((g) => g.messages).find((m) => m.id === messageId);
  const test = message?.test ? LIBRARY.find((t) => t.id === message.test) : undefined;
  return (
    <section className="chat">
      {message && test ? (
        <TestSettings test={test} chatId={chatId} sent={message} onBack={() => goBack(`/chat/${chatId}`)} />
      ) : (
        <p className="chat__empty">Сообщение удалено</p>
      )}
      <TabBar active="messages" onChange={onAppTabChange} />
    </section>
  );
}

interface ChatTaskScreenProps {
  chatId: string;
  task: LibraryTask;
  onAppTabChange: (id: TabId) => void;
}

/** Настройка задания внутри чата: задание можно отправить собеседнику (адрес /chat/<чат>/tasks/<задание>) */
export function ChatTaskScreen({ chatId, task, onAppTabChange }: ChatTaskScreenProps) {
  return (
    <section className="chat">
      <TaskSettings task={task} chatId={chatId} onBack={() => goBack(`/chat/${chatId}`)} />
      <TabBar active="messages" onChange={onAppTabChange} />
    </section>
  );
}

interface ChatResultScreenProps {
  chatId: string;
  resultId: string;
  onAppTabChange: (id: TabId) => void;
}

/** Результат теста или задания: своего прохождения или клиента (адрес /chat/<чат>/result/<результат>) */
export function ChatResultScreen({ chatId, resultId, onAppTabChange }: ChatResultScreenProps) {
  return (
    <section className="chat">
      {isTaskResultId(resultId) ? (
        <TaskResult resultId={resultId} onBack={() => goBack(`/chat/${chatId}`)} />
      ) : (
        <TestResult resultId={resultId} onBack={() => goBack(`/chat/${chatId}`)} />
      )}
      <TabBar active="messages" onChange={onAppTabChange} />
    </section>
  );
}
