import { useState } from 'react';
import { Frame } from '../Frame/Frame';
import { EmblemTile } from '../Emblem/Emblem';
import { answerGroupInvite, useGroupInvite, useGroupsState } from '../../data/groupStore';
import { DEFAULT_FLAGS, memberCount, type Flags } from '../../data/groups';
import { closeGroupSheet, toastGroup } from './groupSheets';
import { FlagsFields, groupLine, usePerson } from './parts';

/**
 * Ответ приглашённого на ваше приглашение в группу. Пока нет сервера, за него отвечаете вы: лист показывает приглашение его глазами,
 * с тем же выбором, что человек делает при вступлении («значок рядом с именем», «в списке участников»).
 */
export function ReplySheet({ invite: inviteId, onClose }: { invite: string; onClose: () => void }) {
  const invite = useGroupInvite(inviteId);
  const { groups, members } = useGroupsState();
  const person = usePerson();
  const [flags, setFlags] = useState<Flags>(DEFAULT_FLAGS);
  const group = invite ? groups.find((g) => g.id === invite.groupId) : undefined;
  if (!invite || !group) return null;

  const peer = person(invite.personId);
  const first = peer.name.split(/\s+/)[0] || peer.name;
  const open = invite.state === 'pending';
  const answer = (accept: boolean) => {
    answerGroupInvite(invite.id, accept, flags);
    closeGroupSheet();
    toastGroup(accept ? `${first} принял(а) приглашение` : `${first} отклонил(а) приглашение`);
  };

  return (
    <Frame
      title="Ответ собеседника"
      subtitle={`Так приглашение видит ${first}. Пока нет сервера, отвечаете вы.`}
      onClose={onClose}
      footer={
        open ? (
          <>
            <button type="button" className="sheet__button" onClick={() => answer(false)}>
              Отказаться
            </button>
            <button type="button" className="sheet__button sheet__button--primary" onClick={() => answer(true)}>
              Согласиться
            </button>
          </>
        ) : (
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
        )
      }
    >
      <section className="sheet__card frame-card">
        <div className="gs-hero">
          <EmblemTile emblem={group.emblem} size="lg" />
          <div className="gs-hero__text">
            <p className="gs-about">
              Вас приглашают в группу «{group.name}»
              {group.about ? `. ${group.about}` : ''}
            </p>
            <p className="gs-row__sub">{groupLine(group, memberCount(members, group.id))}</p>
          </div>
        </div>
      </section>
      {open && <FlagsFields value={flags} onChange={setFlags} />}
    </Frame>
  );
}
