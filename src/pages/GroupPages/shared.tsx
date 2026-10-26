import { useState, type ReactNode } from 'react';
import { ActionSheet, Pill, type SheetAction } from '../../components/GroupUi/GroupUi';
import { IconChat, IconShieldKey, IconUserBlock, IconUserCross, IconUserSpeak, IconUserMinus } from '../../components/GroupUi/GroupIcons';
import { IconUser } from '../ContactPage/ContactIcons';
import { ensureContactChat } from '../../data/chatStore';
import { ME, contactOf, firstNameOf, gendered, nameOf } from '../../data/contacts';
import { canManage, can, memberOf, removeMember, silenceMember, type GroupInfo, type Member } from '../../data/groups';
import { navigate } from '../../router';

/** Адрес страницы группы или канала: /chat/<чат>/g и дальше раздел */
export const gPath = (chatId: string, sub = ''): string => `/chat/${chatId}/g${sub ? `/${sub}` : ''}`;

/** Метка роли рядом с именем: владелец, администратор (со своей подписью, если она есть) */
export function rolePills(m: Member): ReactNode {
  if (m.role === 'owner') return <Pill tone="accent">Владелец</Pill>;
  if (m.role === 'admin') return <Pill>{m.title || 'Админ'}</Pill>;
  return null;
}

/** Роль словами для подписи в окне */
export function roleName(m: Member, g: GroupInfo): string {
  if (m.role === 'owner') return 'Владелец';
  if (m.role === 'admin') return m.title ? `Администратор, ${m.title}` : 'Администратор';
  return g.kind === 'group' ? 'Участник' : 'Подписчик';
}

/** Окно действий над человеком в группе: написать, профиль, права, ограничения, удаление и блокировка */
function MemberSheet({ info, id, say, onClose }: { info: GroupInfo; id: string; say: (text: string) => void; onClose: () => void }) {
  const target = memberOf(info, id);
  if (!target) return null;
  const channel = info.kind === 'channel';
  const contact = contactOf(id);
  const actions: SheetAction[] = [];
  if (contact) {
    const open = (path: string) => {
      ensureContactChat(contact);
      navigate(path);
    };
    actions.push({ key: 'chat', label: 'Написать', Icon: IconChat, run: () => open(`/chat/${id}`) });
    actions.push({ key: 'profile', label: 'Профиль', Icon: IconUser, run: () => open(`/chat/${id}/contact`) });
  }
  if (target.role !== 'owner' && can(info, 'addAdmins')) {
    actions.push({
      key: 'admin',
      label: target.role === 'admin' ? 'Права администратора' : 'Назначить администратором',
      Icon: IconShieldKey,
      run: () => navigate(gPath(info.chatId, `admin/${id}`)),
    });
  }
  if (canManage(info, target)) {
    if (!channel && target.role === 'member') {
      actions.push({
        key: 'silence',
        label: target.silenced ? 'Разрешить писать' : 'Запретить писать',
        Icon: IconUserSpeak,
        run: () => {
          silenceMember(info.chatId, id, !target.silenced);
          say(target.silenced ? `${firstNameOf(id)} снова может писать` : `${firstNameOf(id)} больше не может писать`);
        },
      });
    }
    actions.push({
      key: 'remove',
      label: channel ? 'Удалить из канала' : 'Удалить из группы',
      Icon: IconUserMinus,
      danger: true,
      run: () => {
        removeMember(info.chatId, id, false);
        say(`${firstNameOf(id)} ${gendered(id, 'удалён', 'удалена')}`);
      },
    });
    actions.push({
      key: 'ban',
      label: 'Заблокировать',
      note: 'Не сможет вернуться по ссылке',
      Icon: IconUserBlock,
      danger: true,
      run: () => {
        removeMember(info.chatId, id, true);
        say(`${firstNameOf(id)} ${gendered(id, 'заблокирован', 'заблокирована')}`);
      },
    });
  }
  if (actions.length === 0) actions.push({ key: 'none', label: 'Закрыть', Icon: IconUserCross, run: () => undefined });
  return <ActionSheet title={nameOf(id)} subtitle={roleName(target, info)} actions={actions} onClose={onClose} />;
}

/** Нажатие на человека в списке участников открывает окно действий: хук отдаёт open(id) и готовое окно */
export function useMemberActions(info: GroupInfo | undefined, say: (text: string) => void) {
  const [id, setId] = useState<string | null>(null);
  const node = id && info ? <MemberSheet info={info} id={id} say={say} onClose={() => setId(null)} /> : null;
  // На себе действий нет: строка «Вы» не отзывается
  return { open: (who: string) => who !== ME && setId(who), node, active: id !== null };
}
