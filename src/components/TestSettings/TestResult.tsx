import { TestDescription } from './TestDescription';
import { testSettings } from '../../data/testSettings';
import { useState } from 'react';
import { EmptyState } from '../EmptyState/EmptyState';
import { IconBack, IconSearch, IconTabTests } from '../icons';
import { findClientResult } from '../../data/clientResults';
import type { ConclusionData } from '../../data/conclusions';
import { LIBRARY } from '../../data/library';
import { testBlank } from '../../data/testBlank';
import { useSelfResult } from '../../data/selfTest';
import { useBackHandler } from '../../utils/backHandler';
import { transition } from '../../utils/transition';
import { TestBlank } from './TestBlank';
import { TestHeader } from './TestHeader';
import { TestConclusion, TestConclusionActions } from './TestConclusion';
import './TestSettings.css';
import './TestSettings.pm.css';

interface TestResultProps {
  resultId: string;
  onBack: () => void;
}

/** Что показывает экран: у собственного прохождения заключение есть всегда, у результата клиента — если для теста заведён подсчёт */
interface ShownResult {
  testId: string;
  data?: ConclusionData;
  form: string;
  answers?: Record<number, number>;
}

/**
 * Результат теста: заключение с общей информацией и шкалами. Открывается для собственного прохождения психолога
 * и для теста, который прошёл клиент (кнопка «Посмотреть» под сообщением, карточка во вкладке «Тесты», «События»).
 * Если сохранены ответы (у результатов клиента они есть всегда, у своих — при включённой «Сохранить бланк»), в заключении есть кнопка к бланку со всеми ответами.
 */
export function TestResult({ resultId, onBack }: TestResultProps) {
  const own = useSelfResult(resultId);
  const result: ShownResult | undefined = own ?? findClientResult(resultId);
  const [detail, setDetail] = useState<'blank' | 'description' | null>(null);
  const closeDetail = () => transition(() => setDetail(null), 'back');
  // Жест «назад» из бланка ведёт к заключению, как кнопка в шапке
  useBackHandler(Boolean(detail), closeDetail);
  const test = result && LIBRARY.find((t) => t.id === result.testId);

  // Результаты живут, пока открыта страница: после перезагрузки по прямой ссылке их уже нет
  if (!result || !test) {
    return (
      <section className="test-settings">
        <header className="test-settings__header">
          <button type="button" className="test-settings__button" aria-label="Назад" onClick={onBack}>
            <IconBack />
          </button>
          <h1 className="test-settings__name">Результат тестирования</h1>
        </header>
        <EmptyState icon={<IconSearch />} title="Результат не найден" text="Результаты хранятся, пока приложение открыто: после перезагрузки страницы они пропадают." />
      </section>
    );
  }

  const status = own ? 'Результат тестирования' : 'Результат клиента';
  const { data } = result;

  if (detail === 'description') {
    const description = testSettings(test);
    return (
      <section className="test-settings">
        <TestHeader test={test} status="Описание теста" onBack={closeDetail} />
        <div className="test-settings__scroll" key="description">
          <div className="ts-desc">
            <div className="ts-desc__body"><TestDescription intro={description.intro} lead={description.lead} /></div>
          </div>
        </div>
      </section>
    );
  }
  const openDescription = () => transition(() => setDetail('description'), 'forward');

  // Для некоторых тестов (RSES) в приложении ещё нет шкал и подсчёта: заключение построить не из чего
  if (!data) {
    return (
      <section className="test-settings">
        <TestHeader test={test} status={status} onBack={onBack} />
        <TestConclusionActions onOpenDescription={openDescription} />
        <EmptyState icon={<IconTabTests />} title="Заключение пока недоступно" text="Для этого теста в приложении ещё нет шкал и подсчёта баллов." />
      </section>
    );
  }

  const blank = result.answers ? testBlank(result.testId) : undefined;
  const showBlank = detail === 'blank' && blank && result.answers;

  return (
    <section className="test-settings">
      <TestHeader
        test={test}
        status={showBlank ? 'Бланк тестирования' : status}
        onBack={showBlank ? closeDetail : onBack}
      />
      {showBlank ? (
        <div className="test-settings__scroll" key="blank">
          <TestBlank data={blank} fill={{ answers: result.answers! }} />
        </div>
      ) : (
        <div className="cc-wrap" key="result">
          <div className="test-settings__scroll">
            <TestConclusion data={data} form={result.form} onOpenDescription={openDescription} onOpenBlank={blank ? () => transition(() => setDetail('blank'), 'forward') : undefined} />
          </div>
        </div>
      )}
    </section>
  );
}
