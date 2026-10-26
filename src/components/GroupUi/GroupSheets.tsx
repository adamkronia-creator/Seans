import type { GroupInfo } from '../../data/groups';
import { myRole } from '../../data/groups';
import { RemoveSheet } from '../Profile/ProfileSheets';

/**
 * Подтверждение выхода из группы или канала: участник покидает группу (или отписывается), владелец удаляет её у всех.
 * Окно одно на чат и на экран «О группе»: тексты и название кнопки зависят от того, кто выходит и что это — группа или канал.
 */
export function LeaveSheet({ group, onConfirm, onClose }: { group: GroupInfo; onConfirm: () => void; onClose: () => void }) {
  const owner = myRole(group) === 'owner';
  const channel = group.kind === 'channel';
  const title = owner ? (channel ? 'Удалить канал?' : 'Удалить группу?') : channel ? 'Отписаться от канала?' : 'Покинуть группу?';
  const text = owner
    ? `${channel ? 'Канал' : 'Группа'} «${group.name}» и вся переписка будут удалены у всех. Это нельзя отменить.`
    : group.isPublic
      ? `Вернуться можно будет по адресу @${group.username}.`
      : 'Это частная группа: вернуться можно будет только по ссылке-приглашению.';
  const confirm = owner ? 'Удалить' : channel ? 'Отписаться' : 'Покинуть';
  return <RemoveSheet title={title} text={text} confirm={confirm} onConfirm={onConfirm} onClose={onClose} />;
}
