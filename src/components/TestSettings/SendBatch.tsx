import { useState, type CSSProperties } from 'react';
import { CHATS } from '../../data/chats';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import { conclusionFor } from '../../data/conclusions';
import type { LibraryItem } from '../../data/library';
import { SAVE_BLANK_LABEL } from '../../data/optionHelp';
import { blindTitle, type ResultMode } from '../../data/resultMode';
import { formText, limitText, PERMANENT_LIMITS, permanentNote, TASK_DEADLINES, TASK_MESSAGE_LIMIT, taskSettings, type PermanentRule } from '../../data/taskSettings';
import { MESSAGE_LIMIT, testSettings } from '../../data/testSettings';
import { formHint } from '../../data/selfTest';
import { Frame } from '../Frame/Frame';
import { Switch } from '../Switch/Switch';
import { IconTestChevronDown } from '../icons';
import { FormMenu } from './FormMenu';
import { ResultChoice } from './ResultChoice';
import { CollapseCard } from './TestBlank';
import { MessageField, Row } from './TestSettings';
import { SELF_ID } from './TestActions';
import './SendBatch.css';

/** Настройки одного теста перед отправкой: те же, что на экране «Настройка теста» */
interface TestOpts {
  blind: boolean;
  saveBlank: boolean;
  result: ResultMode;
  form: string;
  messageOn: boolean;
  message: string;
}

/** Настройки одного задания перед отправкой: те же, что на экране «Настройка задания» */
interface TaskOpts {
  form: string;
  comment: boolean;
  state: boolean;
  permanent: boolean;
  limit: number;
  messageOn: boolean;
  message: string;
}

type Opts = TestOpts | TaskOpts;

const initialTest = (item: LibraryItem): TestOpts => {
  const data = testSettings(item as never);
  return { blind: true, saveBlank: true, result: 'thanks', form: data.forms?.[0] ?? '', messageOn: true, message: data.message };
};

const initialTask = (item: LibraryItem): TaskOpts => {
  const data = taskSettings(item);
  return { form: data?.defaultForm ?? data?.forms?.[0] ?? '', comment: true, state: true, permanent: false, limit: 0, messageOn: true, message: data?.message ?? '' };
};

interface Props {
  kind: 'test' | 'task';
  items: LibraryItem[];
  /** Кому: id чатов, «Себе» — SELF_ID */
  recipients: string[];
  /** Шаг назад: к выбору получателей */
  onBack: () => void;
  /** Отправлено: сколько материалов ушло и сколько их не удалось отправить (у части заданий настроек пока нет) */
  onSent: (sent: number, skipped: number) => void;
}

/** Окно «Настройки перед отправкой»: настройки всех выбранных тестов или заданий друг под другом; их можно поменять до отправки */
export function SendBatchSheet({ kind, items, recipients, onBack, onSent }: Props) {
  // Задания без настроек отправить нельзя (клиенту нечего показать): они в окне не показаны
  const sendable = items.filter((item) => kind === 'test' || taskSettings(item));
  const [opts, setOpts] = useState<Record<string, Opts>>(() => Object.fromEntries(sendable.map((item) => [item.id, kind === 'test' ? initialTest(item) : initialTask(item)])));
  const change = <T extends Opts>(id: string, patch: Partial<T>) => setOpts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } as Opts }));

  const send = () => {
    sendable.forEach((item) => {
      const o = opts[item.id];
      recipients.forEach((to) => {
        if (kind === 'test') {
          const t = o as TestOpts;
          const data = testSettings(item as never);
          sendMessage(to, t.messageOn ? t.message : '', undefined, {
            test: item.id,
            testKind: 'sent',
            ...(to === SELF_ID ? { toSelf: true } : {}),
            testOptions: { blind: t.blind, ...(t.blind ? { blindTitle: blindTitle() } : {}), result: t.result, saveBlank: t.saveBlank, ...(data.forms ? { form: t.form } : {}) },
          });
          if (to === 'maxim') logStep('test', item.id, 'sent');
        } else {
          const t = o as TaskOpts;
          const data = taskSettings(item);
          if (!data) return;
          const rule: PermanentRule | undefined = t.permanent ? (t.limit ? { limit: t.limit } : {}) : undefined;
          const note = t.messageOn ? t.message.trim() : '';
          const outgoing = [note, rule ? permanentNote(rule) : ''].filter(Boolean).join('\n\n');
          sendMessage(to, outgoing, undefined, {
            task: item.id,
            ...(to === SELF_ID ? { toSelf: true } : {}),
            taskOptions: {
              ...(data.forms ? { form: t.form, ...(data.formLabel ? { formLabel: data.formLabel } : {}) } : {}),
              comment: t.comment,
              state: t.state,
              deadline: TASK_DEADLINES[0],
              remind: false,
              note,
              ...(rule ? { permanent: rule } : {}),
            },
          });
          if (to === 'maxim') logStep('task', item.id, 'sent', rule ? { permanent: rule } : undefined);
        }
      });
    });
    onSent(sendable.length, items.length - sendable.length);
  };

  const names = recipients.map((id) => (id === SELF_ID ? 'вы' : CHATS.find((c) => c.id === id)?.name)).filter(Boolean);
  const subtitle = `${sendable.length} ${kind === 'test' ? 'тест' : 'задан'}${kind === 'test' ? (sendable.length === 1 ? '' : sendable.length < 5 ? 'а' : 'ов') : sendable.length === 1 ? 'ие' : sendable.length < 5 ? 'ия' : 'ий'} · ${names.length === 1 ? names[0] : `получателей: ${names.length}`}`;

  return (
    <Frame
      title="Настройки перед отправкой"
      subtitle={subtitle}
      onClose={onBack}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onBack}>
            Назад
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={sendable.length === 0} onClick={send}>
            Отправить
          </button>
        </>
      }
    >
      {sendable.map((item, index) => (
        <section key={item.id} className="sb-item" aria-label={item.title}>
          <header className="sb-item__head">
            <span className="sb-item__icon" style={{ '--tint': item.tint } as CSSProperties}>
              <img src={item.icon} alt="" />
            </span>
            <div className="sb-item__text">
              {sendable.length > 1 && (
                <span className="sb-item__count">
                  {kind === 'test' ? 'Тест' : 'Задание'} {index + 1} из {sendable.length}
                </span>
              )}
              <h3 className="sb-item__title">{item.title}</h3>
            </div>
          </header>
          {kind === 'test' ? <TestFields item={item} o={opts[item.id] as TestOpts} onChange={(p) => change<TestOpts>(item.id, p)} /> : <TaskFields item={item} o={opts[item.id] as TaskOpts} onChange={(p) => change<TaskOpts>(item.id, p)} />}
        </section>
      ))}
    </Frame>
  );
}

/** Сообщение клиенту: переключатель и поле, как в настройках */
function MessageCard({ id, hint, o, limit, onChange }: { id: string; hint: string; o: { messageOn: boolean; message: string }; limit: number; onChange: (p: { messageOn?: boolean; message?: string }) => void }) {
  return (
    <section className="ts-card ts-message-card">
      <ul className="ts-rows">
        <Row label="Сообщение для клиента" hint={hint}>
          <Switch checked={o.messageOn} onChange={(v) => onChange({ messageOn: v })} label={`Сообщение для клиента: ${id}`} />
        </Row>
      </ul>
      <div className={`blank-card__collapse${o.messageOn ? ' blank-card__collapse--open' : ''}`} aria-hidden={!o.messageOn}>
        <div className="blank-card__inner">
          <div className="blank-card__body ts-message">
            <MessageField id={`sb-message-${id}`} value={o.message} limit={limit} onChange={(v) => onChange({ message: v })} />
            <div className="ts-message__foot">
              <span className="ts-message__count">
                {o.message.length} / {limit}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestFields({ item, o, onChange }: { item: LibraryItem; o: TestOpts; onChange: (p: Partial<TestOpts>) => void }) {
  const data = testSettings(item as never);
  return (
    <>
      <CollapseCard title="Особенности тестирования">
        <ul className="ts-rows">
          {data.forms && (
            <Row label="Форма бланка" info value={data.forms.length === 1 ? data.forms[0] : undefined}>
              {data.forms.length > 1 && <FormMenu forms={data.forms} value={o.form} hint={formHint(item.id) || undefined} onChange={(form) => onChange({ form })} />}
            </Row>
          )}
          <Row label="Слепое тестирование" help="blind">
            <Switch checked={o.blind} onChange={(blind) => onChange({ blind })} label={`Слепое тестирование: ${item.title}`} />
          </Row>
          <Row label={SAVE_BLANK_LABEL} help="blank">
            <Switch checked={o.saveBlank} onChange={(saveBlank) => onChange({ saveBlank })} label={`${SAVE_BLANK_LABEL}: ${item.title}`} />
          </Row>
        </ul>
      </CollapseCard>
      {conclusionFor(item.id) && <ResultChoice name={`result-${item.id}`} value={o.result} onChange={(result) => onChange({ result })} />}
      <MessageCard id={item.id} hint="Короткое пояснение придет вместе с тестом" o={o} limit={MESSAGE_LIMIT} onChange={onChange} />
    </>
  );
}

function TaskFields({ item, o, onChange }: { item: LibraryItem; o: TaskOpts; onChange: (p: Partial<TaskOpts>) => void }) {
  const data = taskSettings(item);
  if (!data) return null;
  const formLabel = data.formLabel ?? 'Форма бланка';
  const limits = PERMANENT_LIMITS.map(limitText);
  return (
    <>
      <CollapseCard title="Особенности задания">
        <ul className="ts-rows">
          {data.forms && (
            <Row label={formLabel} info value={data.forms.length === 1 ? data.forms[0] : undefined}>
              {data.forms.length > 1 && <FormMenu forms={data.forms} value={o.form} title={formLabel} hint={data.formHint} format={data.formCount ? (v) => formText(data, v) : undefined} onChange={(form) => onChange({ form })} />}
            </Row>
          )}
          <Row label="Комментарий клиента" help="comment">
            <Switch checked={o.comment} onChange={(comment) => onChange({ comment })} label={`Комментарий клиента: ${item.title}`} />
          </Row>
          <Row label="Оценить состояние" help="state">
            <Switch checked={o.state} onChange={(state) => onChange({ state })} label={`Оценить состояние: ${item.title}`} />
          </Row>
          <Row label="Назначить постоянным">
            <Switch checked={o.permanent} onChange={(permanent) => onChange({ permanent })} label={`Назначить постоянным: ${item.title}`} />
          </Row>
          <li className={`ts-fold${o.permanent ? ' ts-fold--open' : ''}`} aria-hidden={!o.permanent}>
            <div className="ts-fold__inner">
              <ul className="ts-rows">
                <Row label="Всего записей" info>
                  <label className="ts-select">
                    <span className="ts-select__value">{limitText(o.limit)}</span>
                    <IconTestChevronDown className="ts-select__chevron" />
                    <select className="ts-select__native" aria-label={`Всего записей: ${item.title}`} value={limitText(o.limit)} onChange={(e) => onChange({ limit: PERMANENT_LIMITS[limits.indexOf(e.target.value)] ?? 0 })}>
                      {limits.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </Row>
              </ul>
            </div>
          </li>
        </ul>
      </CollapseCard>
      <MessageCard id={item.id} hint="Короткое пояснение придет вместе с заданием" o={o} limit={TASK_MESSAGE_LIMIT} onChange={onChange} />
    </>
  );
}

