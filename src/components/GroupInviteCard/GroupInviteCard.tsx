import type { ReactNode } from 'react';
import { EmblemTile } from '../Emblem/Emblem';
import { openGroup, openGroupSheet, toastGroup } from '../GroupSheets/groupSheets';
import { groupLine } from '../GroupSheets/parts';
import { answerGroupInvite, revokeGroupInvite, useGroup, useGroupInvite, useGroupsState } from '../../data/groupStore';
import { memberCount, type GroupInvite } from '../../data/groups';
import '../InviteCard/InviteCard.css';

const day = (at: number) => new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

/** Строка состояния под карточкой: по записи о приглашении, а не по самому сообщению */
function statusOf(invite: GroupInvite): string {
  const date = day(invite.answeredAt ?? invite.at);
  const mine = invite.dir === 'in';
  switch (invite.state) {
    case 'pending':
      return mine ? 'Ждёт вашего ответа' : 'Ждём ответа';
    case 'accepted':
      return `${mine ? 'Вы вступили в группу' : 'Приглашение принято'} · ${date}`;
    case 'declined':
      return `${mine ? 'Вы отклонили приглашение' : 'Приглашение отклонено'} · ${date}`;
    case 'revoked':
      return `Приглашение отозвано · ${date}`;
  }
}

interface GroupInviteCardProps {
  inviteId: string;
  /** Запасной текст сообщения, если записи о приглашении уже нет */
  fallback: string;
  out: boolean;
  /** Имя собеседника (первое слово) */
  peer: string;
  /** Время сообщения: тот же блок, что у остальных пузырей */
  meta: ReactNode;
}

/**
 * Карточка приглашения в группу в ленте чата: пузырь со значком и названием, под ним кнопки, как у приглашения в роль.
 * Состояние берётся из записи о приглашении (groupStore), поэтому карточка не расходится с настоящим.
 * Ваше приглашение: «Отозвать» и мелкая «Демо: ответ собеседника» (пока нет сервера, ответ даёте вы).
 * Чужое: «Вступить» (сначала вы выберете, что другие увидят о вас), «Отказаться», «Подробнее».
 * Окна открываются из общего узла (GroupSheetHost): окно внутри пузыря получало бы жесты пузыря.
 */
export function GroupInviteCard({ inviteId, fallback, out, peer, meta }: GroupInviteCardProps) {
  const invite = useGroupInvite(inviteId);
  const group = useGroup(invite?.groupId ?? '');
  const { members } = useGroupsState();
  const side = out ? 'out' : 'in';

  if (!invite || !group) {
    return (
      <div className={`bubble bubble--${side} bubble--last invite`}>
        <span className="invite__line">{fallback}</span>
        {invite && <span className="invite__status">Группы больше нет</span>}
        <span className="invite__status">
          <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
            {meta}
          </span>
        </span>
        <span className="bubble__meta">{meta}</span>
      </div>
    );
  }

  const pending = invite.state === 'pending';
  const buttons: { key: string; label: string; quiet?: boolean; run: () => void }[] = [];
  if (pending && invite.dir === 'in') {
    buttons.push({ key: 'join', label: 'Вступить', run: () => openGroupSheet({ kind: 'join', id: group.id, invite: invite.id }) });
    buttons.push({
      key: 'decline',
      label: 'Отказаться',
      run: () => {
        answerGroupInvite(invite.id, false);
        toastGroup('Приглашение отклонено');
      },
    });
    buttons.push({ key: 'more', label: 'Подробнее', quiet: true, run: () => openGroup(group.id) });
  } else if (pending) {
    buttons.push({ key: 'revoke', label: 'Отозвать', run: () => revokeGroupInvite(invite.id) });
    buttons.push({ key: 'demo', label: 'Демо: ответ собеседника', quiet: true, run: () => openGroupSheet({ kind: 'reply', invite: invite.id }) });
  } else if (invite.state === 'accepted' || invite.state === 'declined') {
    buttons.push({ key: 'more', label: 'Подробнее', quiet: true, run: () => openGroup(group.id) });
  }

  return (
    <>
      <div className={`bubble bubble--${side} bubble--last${buttons.length ? ' bubble--with-buttons' : ''} invite`}>
        <span className="invite__label">{out ? `Вы зовёте ${peer} в группу` : `${peer} зовёт вас в группу`}</span>
        <span className="invite__group">
          <EmblemTile emblem={group.emblem} size="md" />
          <span className="invite__group-text">
            <span className="invite__title">{group.name}</span>
            <span className="invite__line">{groupLine(group, memberCount(members, group.id))}</span>
          </span>
        </span>
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
