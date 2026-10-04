import { Badge } from '../Badge/Badge';
import { TestCard } from '../TestCard/TestCard';
import { TESTS, type TestStatus } from '../../data/tests';
import './ChatTests.css';

const SECTIONS: { status: TestStatus; title: string; badge: 'yellow' | 'green' }[] = [
  { status: 'sent', title: 'Отправленные', badge: 'yellow' },
  { status: 'done', title: 'Завершенные', badge: 'green' },
];

/** Вкладка «Тесты» в открытом чате: отправленные и завершённые тесты клиента */
export function ChatTests() {
  return (
    <div className="chat-tests">
      {SECTIONS.map(({ status, title, badge }) => {
        const tests = TESTS.filter((t) => t.status === status);
        if (tests.length === 0) return null;
        return (
          <section key={status} className="chat-tests__section">
            <div className="chat-tests__heading">
              <h2 className="chat-tests__title">{title}</h2>
              <Badge count={tests.length} variant={badge} ariaLabel={`Тестов: ${tests.length}`} />
              {status === 'sent' && (
                <button type="button" className="chat-tests__remind">
                  Напомнить
                </button>
              )}
            </div>
            <ul className="chat-tests__list">
              {tests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
