import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { LibraryTest } from '../../data/library';
import type { ConclusionData } from '../../data/conclusions';
import type { TestBlankData } from '../../data/testBlank';
import { HELP_SHOT, type HelpScene, type HelpSlide } from '../../data/optionHelp';
import { TestHeader } from '../TestSettings/TestHeader';
import { TestPreview } from '../TestSettings/TestPreview';
import { TestConclusion } from '../TestSettings/TestConclusion';
import { TestBlank } from '../TestSettings/TestBlank';
import './HelpScenes.css';

/** Тест, к настройкам которого открыта подсказка: макеты в окне собираются из него, а не из снимков одного теста */
export interface HelpTest {
  test: LibraryTest;
  blank: TestBlankData | null;
  conclusion: ConclusionData | null;
  form: string;
  duration?: string;
}

export const HelpContext = createContext<HelpTest | null>(null);
export const useHelpTest = () => useContext(HelpContext);

/** У теста без примера заключения нет и слайдов про строку «Посмотреть бланк» в нём */
export function slidesFor(slides: HelpSlide[], ctx: HelpTest): HelpSlide[] {
  return slides.filter((s) => {
    if (s.scene === 'blank-off' || s.scene === 'blank-on') return Boolean(ctx.conclusion);
    if (s.scene === 'blank-view') return Boolean(ctx.blank);
    return true;
  });
}

/** Что рамкой отмечено в макете и что прокрутить в середину кадра */
const MARKS: Partial<Record<HelpScene, string>> = {
  'blind-off': '.test-settings__peer',
  'blind-on': '.test-settings__peer',
  'blind-chat': '.tcard',
  'blank-on': '.ts-row--link',
  'result-thanks': '.tp__done',
  'result-score': '.tp__sample',
};

/** Первый вопрос бланка с отмеченными ответами: чередуем первый и второй варианты */
const sampleAnswers = (blank: TestBlankData) => Object.fromEntries(blank.questions.map((_, i) => [i, i % 2]));

function Body({ scene, ctx }: { scene: HelpScene; ctx: HelpTest }) {
  const { test, blank, conclusion, form, duration } = ctx;
  if (scene === 'blind-off' || scene === 'blind-on') {
    return blank ? <TestPreview test={test} blank={blank} blind={scene === 'blind-on'} result="thanks" duration={duration} bare /> : null;
  }
  if (scene === 'result-thanks' || scene === 'result-score' || scene === 'result-full') {
    const result = scene === 'result-thanks' ? 'thanks' : scene === 'result-score' ? 'score' : 'full';
    return blank ? <TestPreview test={test} blank={blank} blind={false} result={result} duration={duration} initialStage="end" bare /> : null;
  }
  if (scene === 'blind-chat') {
    return (
      <div className="hs__chat">
        <ul className="messages__list">
          <li className="bubble-group bubble-group--card bubble-group--out">
            <div className="bubble bubble--out bubble--last bubble--with-buttons bubble--tcard bubble--tcard-bare">
              <div className="tcard">
                <span className="tcard__icon" style={{ background: test.tint }}>
                  <img src={test.icon} alt="" />
                </span>
                <span className="tcard__text">
                  <span className="tcard__label">Отправленный тест</span>
                  <span className="tcard__title">{test.title}</span>
                  <span className="tcard__note">Слепой тест: клиент не видит название</span>
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    );
  }
  // Остальные макеты — экраны специалиста под шапкой теста
  return (
    <section className="test-settings hs__screen">
      <TestHeader test={test} status={scene === 'blank-view' ? 'Бланк тестирования' : 'Пример заключения'} />
      <div className="test-settings__scroll hs__scroll">
        {scene === 'blank-view' && blank && <TestBlank data={blank} fill={{ answers: sampleAnswers(blank) }} />}
        {(scene === 'blank-on' || scene === 'blank-off') && conclusion && (
          <TestConclusion data={conclusion} form={form} onOpenBlank={scene === 'blank-on' ? () => {} : undefined} />
        )}
      </div>
    </section>
  );
}

/** Макет 393×340: настоящие экраны выбранного теста, уменьшенные до ширины слайда; рамка отмечает то, что меняет настройка */
export function HelpSceneView({ slide, ctx }: { slide: HelpSlide; ctx: HelpTest }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const [mark, setMark] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const update = () => setK(el.clientWidth / HELP_SHOT.width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const root = stage.current;
    if (!root || !k) return;
    const run = () => {
      const scroller = root.querySelector<HTMLElement>('.hs__scroll');
      const selector = MARKS[slide.scene];
      const target = selector ? root.querySelector<HTMLElement>(selector) : null;
      const st = root.getBoundingClientRect();
      if (scroller) {
        const sr = scroller.getBoundingClientRect();
        const anchor = target ?? root.querySelector<HTMLElement>('#blank-qa') ?? scroller.firstElementChild;
        if (anchor) {
          const ar = anchor.getBoundingClientRect();
          const want = target ? sr.height * 0.4 : 12 * k;
          scroller.scrollTop += (ar.top - sr.top - want) / k;
        }
      }
      if (target) {
        const tr = target.getBoundingClientRect();
        const pad = 4;
        setMark({
          left: (tr.left - st.left) / k - pad,
          top: (tr.top - st.top) / k - pad,
          width: tr.width / k + pad * 2,
          height: tr.height / k + pad * 2,
        });
      }
    };
    run();
    // Содержимое (шрифты, значки) встаёт на место не сразу: ещё раз после отрисовки
    const id = requestAnimationFrame(() => requestAnimationFrame(run));
    return () => cancelAnimationFrame(id);
  }, [k, slide.scene, ctx]);

  return (
    <div className="hs" ref={host} role="img" aria-label={slide.alt}>
      <div className="hs__stage" ref={stage} aria-hidden="true" {...{ inert: '' }} style={{ '--k': k } as CSSProperties}>
        <Body scene={slide.scene} ctx={ctx} />
        {mark && <span className="oh__mark" style={mark} />}
      </div>
    </div>
  );
}
