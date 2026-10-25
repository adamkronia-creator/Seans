import { useEffect, useState } from 'react';
import { Frame } from '../Frame/Frame';
import { Avatar } from '../Avatar/Avatar';
import { EmblemTile } from '../Emblem/Emblem';
import { answerGroupInvite, joinGroup, setMyFlags, useGroupsState } from '../../data/groupStore';
import { AUDIENCE_LABEL, DEFAULT_FLAGS, membership, type Flags } from '../../data/groups';
import { ME } from '../../data/people';
import { closeGroupSheet, openGroupSheet, toastGroup } from './groupSheets';
import { FlagsFields, usePerson } from './parts';

interface JoinSheetProps {
  id: string;
  /** Ответ согласием на приглашение (идентификатор приглашения) */
  invite?: string;
  /** «Отмена» возвращает к листу группы, а не закрывает всё */
  back?: boolean;
  onClose: () => void;
}

/**
 * Вступление и ваши настройки в группе: что другие увидят о вас. Ничего не показывается без вашего выбора, поэтому оба флага стоят здесь,
 * до вступления. Тот же лист меняет настройки, когда вы уже в группе; на заявку и приглашение он отвечает тем же выбором.
 */
export function JoinSheet({ id, invite, back, onClose }: JoinSheetProps) {
  const state = useGroupsState();
  const group = state.groups.find((g) => g.id === id);
  const mine = membership(state.members, id, ME);
  const person = usePerson();
  const [flags, setFlags] = useState<Flags>(() => (mine ? { showEmblem: mine.showEmblem, listed: mine.listed, audience: mine.audience } : DEFAULT_FLAGS));
  useEffect(() => {
    if (!group) onClose();
  }, [group, onClose]);
  if (!group) return null;

  const me = person(ME);
  const editing = mine !== undefined;
  const title = editing ? 'Настройки в группе' : invite ? 'Приглашение в группу' : group.join === 'request' ? 'Заявка в группу' : 'Вступление в группу';
  const action = editing ? 'Сохранить' : invite ? 'Принять' : group.join === 'request' ? 'Отправить заявку' : 'Вступить';

  const cancel = () => (back ? openGroupSheet({ kind: 'group', id }) : onClose());
  const finish = (text: string) => {
    closeGroupSheet();
    toastGroup(text);
  };

  const submit = () => {
    if (editing) {
      setMyFlags(id, flags);
      return finish('Настройки сохранены');
    }
    if (invite) {
      return finish(answerGroupInvite(invite, true, flags) ? `Вы вступили в группу «${group.name}»` : 'Приглашение уже недействительно');
    }
    const result = joinGroup(id, flags);
    finish(
      result === 'ok'
        ? `Вы вступили в группу «${group.name}»`
        : result === 'requested'
          ? 'Заявка отправлена. Ответит владелец или администратор'
          : result === 'pending'
            ? 'Заявка уже отправлена'
            : result === 'member'
              ? 'Вы уже в этой группе'
              : 'В эту группу можно вступить только по приглашению',
    );
  };

  return (
    <Frame
      title={title}
      subtitle={group.name}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={cancel}>
            {back ? 'Назад' : 'Отмена'}
          </button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={submit}>
            {action}
          </button>
        </>
      }
    >
      <section className="sheet__card frame-card">
        <span className="frame-label">Так вас увидят</span>
        <div className="gs-me">
          <Avatar src={me.avatar} name={me.name} size={40} />
          <span className="gs-row__text">
            <span className="gs-me__name">
              {me.name}
              {flags.showEmblem && <EmblemTile emblem={group.emblem} size="xs" />}
            </span>
            <span className="gs-row__sub">
              {flags.showEmblem ? `Значок виден: ${AUDIENCE_LABEL[flags.audience].toLowerCase()}` : 'Значка рядом с именем нет'}
              {' · '}
              {flags.listed ? 'в списке участников' : 'не в списке участников'}
            </span>
          </span>
        </div>
      </section>
      <FlagsFields value={flags} onChange={setFlags} />
      {!editing && !invite && group.join === 'request' && <p className="gs-note gs-note--inset">Эти настройки применятся, когда вас примут. Изменить их можно в любой момент.</p>}
      {!editing && (invite || group.join === 'open') && <p className="gs-note gs-note--inset">Изменить их можно в любой момент в настройках группы.</p>}
    </Frame>
  );
}
