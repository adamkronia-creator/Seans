import type { ReactNode } from 'react';
import { capsLine, consentCaps, shortDate } from '../../data/roles';
import { revokeInvite, useInvite, useRole, type Invite } from '../../data/roleStore';
import { answerInvite } from './answerInvite';
import './InviteCard.css';

/** Строка состояния под текстом карточки: по записи о приглашении, а не по самому сообщению */
function statusOf(invite: Invite): string {
  const date = shortDate(invite.answeredAt ?? invite.at);
  const mine = invite.dir === 'in';
  switch (invite.state) {
    case 'pending':
      return mine ? 'Ждёт вашего ответа' : 'Ждём ответа';
    case 'accepted':
      return `${mine ? 'Вы приняли приглашение' : 'Приглашение принято'} · ${date}`;
    case 'declined':
      return `${mine ? 'Вы отклонили приглашение' : 'Приглашение отклонено'} · ${date}`;
    case 'revoked':
      return `Приглашение отозвано · ${date}`;
  }
}

interface InviteCardProps {
  inviteId: string;
  /** Запасной текст сообщения, если записи о приглашении уже нет */
  fallback: string;
  out: boolean;
  /** Имя собеседника (первое слово) */
  peer: string;
  /** Время сообщения: тот же блок, что у остальных пузырей */
  meta: ReactNode;
  /** Подробности: лист «Что включится» (view) или демо-ответ собеседника (reply); лист живёт на экране чата, а не в ленте */
  onSheet: (inviteId: string, mode: 'reply' | 'view') => void;
  /** Короткая подсказка экрану («Добавлен в папку «Клиенты»») */
  onNote?: (text: string) => void;
}

/**
 * Карточка приглашения в ленте чата: пузырь, под ним кнопки, как у ботов в Telegram. Состояние берётся из записи о приглашении
 * (roleStore), поэтому карточка не расходится с настоящим состоянием роли.
 * Ваше приглашение: «Отозвать» и мелкая «Демо: ответ собеседника» (пока нет сервера, ответ даёте вы).
 * Чужое: «Согласиться», «Отказаться», «Подробнее».
 */
export function InviteCard({ inviteId, fallback, out, peer, meta, onSheet, onNote }: InviteCardProps) {
  const invite = useInvite(inviteId);
  const role = useRole(invite?.roleId ?? '');
  const side = out ? 'out' : 'in';

  if (!invite) {
    return (
      <div className={`bubble bubble--${side} bubble--last invite`}>
        <span className="invite__line">{fallback}</span>
        <span className="invite__status">
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            {meta}
          </span>
        </span>
        <span className="bubble__meta">{meta}</span>
      </div>
    );
  }

  const roleName = role?.name ?? 'Роль';
  const pending = invite.state === 'pending';
  const shared = consentCaps(invite.caps);

  const buttons: { key: string; label: string; quiet?: boolean; run: () => void }[] = [];
  if (pending && invite.dir === 'in') {
    buttons.push({ key: 'accept', label: 'Согласиться', run: () => answerInvite(invite.id, true, onNote) });
    buttons.push({ key: 'decline', label: 'Отказаться', run: () => answerInvite(invite.id, false, onNote) });
    buttons.push({ key: 'more', label: 'Подробнее', quiet: true, run: () => onSheet(invite.id, 'view') });
  } else if (pending) {
    buttons.push({ key: 'revoke', label: 'Отозвать', run: () => revokeInvite(invite.id) });
    buttons.push({ key: 'demo', label: 'Демо: ответ собеседника', quiet: true, run: () => onSheet(invite.id, 'reply') });
  } else if (invite.state === 'accepted' || invite.state === 'declined') {
    buttons.push({ key: 'more', label: 'Подробнее', quiet: true, run: () => onSheet(invite.id, 'view') });
  }

  return (
    <>
      <div className={`bubble bubble--${side} bubble--last${buttons.length ? ' bubble--with-buttons' : ''} invite`}>
        <span className="invite__label">{invite.kind === 'role' ? 'Приглашение' : 'Новые функции'}</span>
        <span className="invite__title">{invite.kind === 'role' ? `Роль «${roleName}»` : capsLine(invite.caps)}</span>
        {invite.kind === 'role' ? (
          <>
            <span className="invite__line">
              {peer}: {roleName} · Вы: {role?.mirror ?? ''}
            </span>
            {shared.length > 0 && <span className="invite__line">Общие функции: {capsLine(shared)}</span>}
            {out && role?.greeting && <span className="invite__greeting">{role.greeting}</span>}
          </>
        ) : (
          <span className="invite__line">К роли «{roleName}»</span>
        )}
        <span className={`invite__status invite__status--${invite.state}`}>
          {statusOf(invite)}
          {/* Невидимая копия времени резервирует место в конце строки состояния, настоящее стоит в углу пузыря */}
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            {meta}
          </span>
        </span>
        <span className="bubble__meta">{meta}</span>
      </div>
      {buttons.length > 0 && (
        <ul className="bubble-buttons">
          {buttons.map(({ key, label, quiet, run }) => (
            <li key={key}>
              <button type="button" className={`bubble-button${quiet ? ' bubble-button--quiet' : ''}`} onClick={run}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
