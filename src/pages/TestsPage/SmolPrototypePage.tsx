import { ClientResultTiles } from '../../components/TestSettings/ClientResultTiles';
import { useState, type ReactNode } from 'react';
import { Switch } from '../../components/Switch/Switch';
import { FormMenu } from '../../components/TestSettings/FormMenu';
import { ScaleChips } from '../../components/TestSettings/ScaleChips';
import { PreviewSheet } from '../../components/TestSettings/SendSheet';
import { TestBlank } from '../../components/TestSettings/TestBlank';
import { TestConclusion } from '../../components/TestSettings/TestConclusion';
import { TestDescription } from '../../components/TestSettings/TestDescription';
import { TestHeader } from '../../components/TestSettings/TestHeader';
import { TestPreview } from '../../components/TestSettings/TestPreview';
import { conclusionFor } from '../../data/conclusions';
import { type ResultMode } from '../../data/resultMode';
import { formHint, questionOrder } from '../../data/selfTest';
import { testBlank } from '../../data/testBlank';
import { MESSAGE_LIMIT, testSettings } from '../../data/testSettings';
import { navigate } from '../../router';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { transition } from '../../utils/transition';
import IconAge from '../../assets/icons/solar/user.svg?react';
import IconTime from '../../assets/icons/solar/clock-circle.svg?react';
import IconBlank from '../../assets/icons/solar/clipboard-list.svg?react';
import IconConclusion from '../../assets/icons/solar/notebook.svg?react';
import '../../components/TestSettings/TestSettings.pm.css';
import { SMOL, SMOL_PROTOTYPE } from './smolPrototype';
import './SmolPrototypePage.css';

const data = testSettings(SMOL);
const blank = testBlank(SMOL.id)!;
const conclusion = conclusionFor(SMOL.id)!;
const headerTest = { ...SMOL_PROTOTYPE, title: SMOL.abbr ?? SMOL.title };
const TAB_LABELS = { setup: 'Настройки', overview: 'О методике', materials: 'Материалы' };
type Tab = keyof typeof TAB_LABELS;
const TABS = Object.keys(TAB_LABELS) as Tab[];

const DOCUMENT_LABELS = { blank: 'Бланк тестирования', conclusion: 'Пример заключения' };
type DocumentView = keyof typeof DOCUMENT_LABELS;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="smol-prototype__panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="smol-prototype__row">
      <div>
        <p>{label}</p>
        <p className="smol-prototype__hint">{hint}</p>
      </div>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

export default function SmolPrototypePage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('setup');
  const [documentView, setDocumentView] = useState<DocumentView | null>(null);
  const [preview, setPreview] = useState(false);
  const forms = data.forms ?? [];
  const [form, setForm] = useState(forms[0] ?? '');
  const [blind, setBlind] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [saveBlank, setSaveBlank] = useState(true);
  const [result, setResult] = useState<ResultMode>('thanks');
  const [messageOn, setMessageOn] = useState(true);
  const [message, setMessage] = useState(data.message);

  const back = () => {
    if (documentView) transition(() => setDocumentView(null), 'back');
    else onBack();
  };
  useBackHandler(Boolean(documentView), back);
  useSwipeBack('.smol-prototype', !preview, back);

  const previewBlank = preview && shuffle
    ? {
        ...blank,
        questions: questionOrder(SMOL_PROTOTYPE.id, blank.questions.length, true)
          .map((index) => ({ ...blank.questions[index], heading: undefined })),
      }
    : blank;

  return (
    <section className="test-settings smol-prototype">
      <TestHeader test={headerTest} status={documentView ? DOCUMENT_LABELS[documentView] : 'Прототип'} onBack={back} />
      {documentView ? (
        <div className="test-settings__scroll smol-prototype__document" key={documentView}>
          {documentView === 'blank' ? <TestBlank data={blank} /> : <TestConclusion data={conclusion} form={form} />}
        </div>
      ) : (
        <>
          <div className="test-settings__scroll smol-prototype__scroll">
            <div className="smol-prototype__overview">
              {SMOL.catalogCover && <img className="smol-prototype__cover" src={SMOL.catalogCover} alt="" />}
              <div className="smol-prototype__intro">
                <p className="smol-prototype__title">{SMOL.title}</p>
                <ul className="smol-prototype__facts">
                  <li><IconBlank aria-hidden="true" />{data.questions} вопрос</li>
                  <li><IconTime aria-hidden="true" />{data.duration}</li>
                  <li><IconAge aria-hidden="true" />{data.age}</li>
                </ul>
              </div>
            </div>

            <div className="smol-prototype__tabs" role="group" aria-label="Разделы настройки СМОЛ">
              {TABS.map((id) => (
                <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{TAB_LABELS[id]}</button>
              ))}
            </div>

            <div className="smol-prototype__content" key={tab}>
              {tab === 'setup' && (
                <>
                  <Panel title="Прохождение">
                    {forms.length > 0 && (
                      <div className="smol-prototype__row">
                        <p>Форма бланка</p>
                        <FormMenu forms={forms} value={form} onChange={setForm} stableWidth hint={formHint(SMOL.id) || undefined} />
                      </div>
                    )}
                    <ToggleRow label="Слепое тестирование" hint="Клиент увидит нейтральное название." checked={blind} onChange={setBlind} />
                    <ToggleRow label="Перемешать вопросы" hint="Вопросы будут в случайном порядке." checked={shuffle} onChange={setShuffle} />
                  </Panel>

                  <Panel title="После теста">
                    <ClientResultTiles value={result} onChange={setResult} />
                    <ToggleRow label="Сохранять бланк" hint="Ответы останутся доступны специалисту." checked={saveBlank} onChange={setSaveBlank} />
                  </Panel>

                  <Panel title="Сообщение для клиента">
                    <ToggleRow label="Показать перед тестом" hint="Сообщение появится над инструкцией." checked={messageOn} onChange={setMessageOn} />
                    {messageOn && (
                      <label className="smol-prototype__message">
                        Текст сообщения
                        <textarea rows={4} maxLength={MESSAGE_LIMIT} value={message} onChange={(event) => setMessage(event.target.value)} />
                      </label>
                    )}
                  </Panel>
                  <p className="smol-prototype__hint">Настройки действуют в рамках этого просмотра.</p>
                </>
              )}
              {tab === 'overview' && (
                <>
                  <Panel title="Что оценивает СМОЛ">
                    <div className="ts-desc smol-prototype__description"><TestDescription intro={data.intro} lead={data.lead} /></div>
                  </Panel>
                  <button type="button" className="smol-prototype__original" onClick={() => navigate(`/tests/${SMOL.id}`)}>Открыть оригинал СМОЛ</button>
                </>
              )}
              {tab === 'materials' && (
                <>
                  <ul className="ts-actions">
                    {(['blank', 'conclusion'] as const).map((id) => {
                      const Icon = id === 'blank' ? IconBlank : IconConclusion;
                      return (
                        <li key={id}>
                          <button type="button" className="ts-action" onClick={() => transition(() => setDocumentView(id), 'forward')}>
                            <Icon className="ts-action__icon" aria-hidden="true" />
                            <span className="ts-action__label">{DOCUMENT_LABELS[id]}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {data.scales && (
                    <Panel title="Шкалы СМОЛ">
                      <div className="smol-prototype__scales">
                        <h3>Основные</h3>
                        <ScaleChips testId={SMOL.id} scales={data.scales.main} />
                        <h3>Шкалы достоверности</h3>
                        <ScaleChips testId={SMOL.id} scales={data.scales.extra} />
                      </div>
                    </Panel>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="test-settings__cta">
            <button type="button" className="test-settings__cta-button" onClick={() => setPreview(true)}>Предпросмотр для клиента</button>
          </div>
        </>
      )}
      {preview && (
        <PreviewSheet title={SMOL.title} onClose={() => setPreview(false)}>
          <TestPreview
            test={SMOL}
            blank={previewBlank}
            blind={blind}
            result={result}
            duration={data.duration}
            message={messageOn ? message : ''}
            screen
            onClose={() => setPreview(false)}
          />
        </PreviewSheet>
      )}
    </section>
  );
}
