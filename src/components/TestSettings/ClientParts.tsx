import type { ReactNode } from 'react';
import { TASK_DEADLINES, volumeText, type PermanentRule, type TaskSettingsData } from '../../data/taskValues';
import { BlankRules, CollapseCard } from './TestBlank';
import './ClientParts.css';

/**
 * То, чем экран клиента (тест или задание, присланное специалистом) отличается от прохождения самому.
 * Всё остальное — шапка, карточки бланка, счётчик и кнопки — те же, что при самостоятельном прохождении:
 * клиент видит ровно тот же интерфейс, а от специалиста у него только сообщение, сведения перед началом и «Спасибо» в конце.
 */

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    className="tp__fact-icon"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const IconClock = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const IconUndo = () => (
  <Icon>
    <path d="M4 12a8 8 0 1 1 2.6 5.9" />
    <path d="M4 5v5h5" />
  </Icon>
);
const IconLock = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const IconEyeOff = () => (
  <Icon>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.7A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.6M6.4 7.2A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
);
export const IconEye = () => (
  <Icon>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);
const IconRepeat = () => (
  <Icon>
    <path d="M17 2l3 3-3 3" />
    <path d="M4 11V9a4 4 0 0 1 4-4h12" />
    <path d="M7 22l-3-3 3-3" />
    <path d="M20 13v2a4 4 0 0 1-4 4H4" />
  </Icon>
);
const IconCalendar = () => (
  <Icon>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M8 3.5v4M16 3.5v4M4 10h16" />
  </Icon>
);

export interface ClientFact {
  icon: ReactNode;
  text: string;
}

/** «1 вопрос», «2 вопроса», «5 вопросов» */
function questionsWord(n: number) {
  const last = n % 10;
  if (n % 100 >= 11 && n % 100 <= 14) return 'вопросов';
  if (last === 1) return 'вопрос';
  return last >= 2 && last <= 4 ? 'вопроса' : 'вопросов';
}

/** Что клиент должен знать о тесте до начала: объём и время, что можно менять, кто видит ответы */
export function testFacts(total: number, duration: string | undefined): ClientFact[] {
  return [
    { icon: <IconClock />, text: `${total} ${questionsWord(total)}${duration ? ` · ${duration.replace(/\.$/, '')}` : ''}` },
    { icon: <IconUndo />, text: 'Можно менять ответы' },
    { icon: <IconLock />, text: 'Ответы видит только специалист' },
  ];
}

/** То же для задания: объём и время, срок (у постоянного — что оно постоянное), что поля можно пропустить, кто увидит ответы */
export function taskFacts(data: TaskSettingsData, form: string, deadline: string, permanent?: PermanentRule): ClientFact[] {
  return [
    { icon: <IconClock />, text: `${volumeText(data, form)} · ${data.duration}` },
    ...(permanent
      ? [{ icon: <IconRepeat />, text: permanent.limit ? `Постоянное задание: всего записей — ${permanent.limit}` : 'Постоянное задание: можно выполнять снова' }]
      : deadline !== TASK_DEADLINES[0]
        ? [{ icon: <IconCalendar />, text: `Срок выполнения: ${deadline.toLowerCase()}` }]
        : []),
    { icon: <IconUndo />, text: 'Любое поле можно пропустить' },
    { icon: <IconLock />, text: 'Ответы увидит только специалист' },
  ];
}

/** Первый экран клиента: сообщение специалиста, инструкция и сведения перед началом, каждое своим блоком */
export function ClientIntro({ message, rules, facts }: { message: string; rules: string[]; facts: ClientFact[] }) {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.length > 0 && (
        <CollapseCard title="Сообщение специалиста">
          <div className="blank-rules">
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </CollapseCard>
      )}
      <CollapseCard title="Инструкция" id="blank-rules">
        <BlankRules rules={rules} />
      </CollapseCard>
      <ul className="ts-card tp__facts">
        {facts.map((fact) => (
          <li key={fact.text}>
            {fact.icon}
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Экран клиента после выполнения: блок с благодарностью; под ним то, что клиент увидит дальше */
export function ClientDone({ title, handover = true, children }: { title: string; /** Строка «Ответы переданы вашему специалисту» под названием */ handover?: boolean; children?: ReactNode }) {
  return (
    <section className="blank-card tp__done">
      <span className="tp__done-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h2 className="tp__done-title">{title}</h2>
      {handover && <p className="tp__done-text">Ответы переданы вашему специалисту</p>}
      {children}
    </section>
  );
}

/** Окончание задания: благодарность и что будет дальше; у постоянного — запись добавлена, вернуться можно, когда нужно */
export function TaskDone({ record, limit }: { record?: number; limit?: number }) {
  if (record) {
    return (
      <ClientDone title="Спасибо, запись добавлена">
        <p className="tp__done-text">{limit && record >= limit ? 'Все записи выполнены' : 'Новую запись можно добавить, когда это понадобится'}</p>
      </ClientDone>
    );
  }
  return (
    <ClientDone title="Спасибо, задание выполнено">
      <p className="tp__done-text">Вы обсудите их на ближайшей встрече</p>
    </ClientDone>
  );
}
