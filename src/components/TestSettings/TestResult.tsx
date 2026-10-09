import { useState } from 'react';
import { IconBack } from '../icons';
import { findClientResult } from '../../data/clientResults';
import type { ConclusionData } from '../../data/conclusions';
import { LIBRARY } from '../../data/library';
import { testBlank } from '../../data/testBlank';
import { useSelfResult } from '../../data/selfTest';
import { SectionNav } from '../SectionNav/SectionNav';
import { TestBlank, blankSections } from './TestBlank';
import { TestHeader } from './TestHeader';
import { conclusionSections, TestConclusion } from './TestConclusion';
import './TestSettings.css';

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
  const [blankOpen, setBlankOpen] = useState(false);
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
        <p className="chat__empty chat__empty--grow">Результат не найден</p>
      </section>
    );
  }

  const status = own ? 'Результат тестирования' : 'Результат клиента';
  const { data } = result;

  // Для некоторых тестов (RSES) в приложении ещё нет шкал и подсчёта: заключение построить не из чего
  if (!data) {
    return (
      <section className="test-settings">
        <TestHeader test={test} status={status} onBack={onBack} />
        <p className="chat__empty chat__empty--grow">Заключение для этого теста пока недоступно</p>
      </section>
    );
  }

  const blank = result.answers ? testBlank(result.testId) : undefined;
  const showBlank = blankOpen && blank && result.answers;

  return (
    <section className="test-settings">
      <TestHeader
        test={test}
        status={showBlank ? 'Бланк тестирования' : status}
        onBack={showBlank ? () => setBlankOpen(false) : onBack}
      />
      {showBlank ? (
        <>
          <div className="test-settings__scroll" key="blank">
            <TestBlank data={blank} fill={{ answers: result.answers! }} />
          </div>
          <SectionNav sections={blankSections(blank)} scroller=".test-settings__scroll" />
        </>
      ) : (
        <div className="cc-wrap" key="result">
          <div className="test-settings__scroll">
            <TestConclusion data={data} form={result.form} onOpenBlank={blank ? () => setBlankOpen(true) : undefined} />
          </div>
          <SectionNav sections={conclusionSections(data)} scroller=".test-settings__scroll" />
        </div>
      )}
    </section>
  );
}
