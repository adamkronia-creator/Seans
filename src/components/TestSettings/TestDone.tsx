import { conclusionFor, levelOf, type ConclusionScale } from '../../data/conclusions';
import { RESULT_FACT, type ResultMode } from '../../data/resultMode';
import { ClientDone } from './ClientParts';

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Пример итога на экране завершения: баллы или баллы с уровнями (по образцу заключения теста) */
function SampleResult({ testId, mode }: { testId: string; mode: Exclude<ResultMode, 'thanks'> }) {
  const data = conclusionFor(testId);
  if (!data) return null;
  const main = data.scales.filter((s) => s.group === 'main');
  const shown: ConclusionScale[] = (main.length > 0 ? main : data.scales).slice(0, 3);
  return (
    <div className="tp__sample">
      <p className="tp__sample-label">Пример результата</p>
      <ul className="tp__sample-list">
        {shown.map((scale) => (
          <li key={scale.code} className="tp__sample-row">
            <span className="tp__sample-name">
              {scale.name}
              {mode === 'full' && scale.leveled && <span className="tp__sample-level">{levelOf(data, scale.score, scale).chip}</span>}
            </span>
            <span className="tp__sample-score">
              {fmt(scale.score)} <span className="tp__sample-max">из {fmt(scale.max)}</span>
            </span>
          </li>
        ))}
      </ul>
      {mode === 'full' && <p className="tp__sample-more">Ниже — расшифровка каждой шкалы</p>}
    </div>
  );
}

/** Окончание теста: благодарность и то, что клиент увидит о результате */
export function TestDone({ testId, result }: { testId: string; result: ResultMode }) {
  return (
    <ClientDone title="Спасибо, тест завершен">
      {result === 'thanks' ? <p className="tp__done-text">{RESULT_FACT.thanks}</p> : <SampleResult testId={testId} mode={result} />}
    </ClientDone>
  );
}
