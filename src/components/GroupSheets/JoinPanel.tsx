import { IconChevronMk } from '../ChatItem/ChatIcons';
import { answerGroupInvite, answerRequest, cancelRequest, useGroupsState } from '../../data/groupStore';
import { membership, ROLE_LABEL, type Group } from '../../data/groups';
import { ME } from '../../data/people';
import { openGroupSheet, toastGroup } from './groupSheets';

interface JoinPanelProps {
  group: Group;
  /** Окна вступления открыты из листа группы: «Назад» в них возвращает к листу */
  back?: boolean;
  /** Лист группы закрывается после действия, которое его заканчивает (отказ от приглашения) */
  onDone?: () => void;
}

/**
 * Ваше положение в группе и что можно сделать: вступить, подать заявку, принять приглашение, поменять настройки.
 * Один и тот же блок стоит в листе группы и на её странице.
 */
export function JoinPanel({ group, back = false, onDone }: JoinPanelProps) {
  const { members, requests, invites } = useGroupsState();
  const id = group.id;
  const mine = membership(members, id, ME);
  const request = requests.find((r) => r.groupId === id && r.personId === ME);
  const invite = invites.find((i) => i.groupId === id && i.personId === ME && i.dir === 'in' && i.state === 'pending');

  if (mine) {
    return (
      <>
        <p className="gs-state">
          Вы в группе: {ROLE_LABEL[mine.role].toLowerCase()}. {mine.showEmblem ? 'Значок виден рядом с вашим именем.' : 'Значок рядом с именем скрыт.'}
        </p>
        <button type="button" className="gs-link" onClick={() => openGroupSheet({ kind: 'join', id, back })}>
          <span className="gs-link__text">Настройки в группе</span>
          <IconChevronMk className="gs-row__chevron" />
        </button>
      </>
    );
  }

  if (invite) {
    return (
      <>
        <p className="gs-state">Вас пригласили в эту группу.</p>
        <div className="gs-actions">
          <button
            type="button"
            className="gs-button"
            onClick={() => {
              answerGroupInvite(invite.id, false);
              toastGroup('Приглашение отклонено');
              onDone?.();
            }}
          >
            Отклонить
          </button>
          <button type="button" className="gs-button gs-button--primary" onClick={() => openGroupSheet({ kind: 'join', id, invite: invite.id, back })}>
            Принять
          </button>
        </div>
      </>
    );
  }

  if (request) {
    return (
      <>
        <p className="gs-state">Заявка отправлена. Ответит владелец или администратор группы.</p>
        <div className="gs-actions">
          <button
            type="button"
            className="gs-button"
            onClick={() => {
              cancelRequest(id);
              toastGroup('Заявка отозвана');
            }}
          >
            Отозвать заявку
          </button>
          <button
            type="button"
            className="gs-button gs-button--quiet"
            onClick={() => {
              answerRequest(request.id, true);
              toastGroup(`Вас приняли в группу «${group.name}»`);
            }}
          >
            Демо: владелец принимает
          </button>
        </div>
      </>
    );
  }

  if (group.join === 'invite') return <p className="gs-state">В эту группу можно вступить только по приглашению владельца или администратора.</p>;

  return (
    <>
      <p className="gs-state">
        {group.join === 'open' ? 'Вступить может любой: перед этим вы выберете, что другие увидят о вас.' : 'Владелец или администратор рассмотрит вашу заявку. Перед этим вы выберете, что другие увидят о вас.'}
      </p>
      <button type="button" className="gs-button gs-button--primary gs-button--block" onClick={() => openGroupSheet({ kind: 'join', id, back })}>
        {group.join === 'open' ? 'Вступить' : 'Подать заявку'}
      </button>
    </>
  );
}
