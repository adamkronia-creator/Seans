import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SubPage } from '../../components/GroupUi/GroupUi';
import { IconUsersGroup } from '../../components/GroupUi/GroupIcons';
import { can, canChangeInfo, canInvite, isMember, myRole, useGroup, type GroupInfo } from '../../data/groups';
import { goBack } from '../../router';
import { GroupInfoPage } from './GroupInfoPage';
import { GroupAddMembersPage, GroupAdminPickPage, GroupAdminRightsPage, GroupAdminsPage, GroupMembersPage } from './GroupPeoplePages';
import { GroupBannedPage, GroupLogPage, GroupManagePage, GroupPermsPage, GroupReactionsPage, GroupRequestsPage, GroupTypePage } from './GroupManagePages';
import { GroupLinkEditPage, GroupLinkPage, GroupLinksPage } from './GroupLinkPages';
import { gPath } from './shared';

/*
 * Страницы группы и канала: /chat/<чат>/g и раздел после него. Раздел виден, только если у человека есть на него право
 * (владелец, администратор с нужным правом или обычный участник там, где это разрешено); иначе страница объясняет, что доступа нет.
 */

/** Разделы адреса: edit, type, links, link/<id>, link/new, link/<id>/edit, members, add, admins, admin/<id>, admin/new, perms, banned, requests, log, reactions */
export function groupSubOf(path: string): { chatId: string; sub: string } | null {
  const m = path.match(/^\/chat\/([^/]+)\/g(?:\/(.+?))?\/?$/);
  return m ? { chatId: m[1], sub: m[2] ?? '' } : null;
}

/** Куда ведёт «назад» с раздела, когда истории нет (открыли по прямой ссылке) */
export function groupParentOf(chatId: string, sub: string): string {
  const [head, second, third] = sub.split('/');
  if (sub === '') return `/chat/${chatId}`;
  if (head === 'edit' || head === 'add' || head === 'members') return gPath(chatId);
  if (head === 'link') return third === 'edit' ? gPath(chatId, `link/${second}`) : gPath(chatId, 'links');
  if (head === 'admin') return gPath(chatId, 'admins');
  return gPath(chatId, 'edit');
}

/** Есть ли у человека право открыть этот раздел */
export function groupAllowed(sub: string, g: GroupInfo): boolean {
  const role = myRole(g);
  if (!role) return false;
  const staff = role !== 'member';
  switch (sub.split('/')[0]) {
    case '':
      return true;
    case 'edit':
      return staff || canChangeInfo(g);
    case 'type':
      return role === 'owner';
    case 'links':
    case 'link':
      return can(g, 'inviteUsers');
    case 'members':
    case 'admins':
      return g.kind === 'group' || staff;
    case 'add':
      return canInvite(g);
    case 'admin':
      return can(g, 'addAdmins');
    case 'perms':
      return g.kind === 'group' && (role === 'owner' || can(g, 'banUsers'));
    case 'banned':
      return can(g, 'banUsers');
    case 'requests':
      return can(g, 'inviteUsers');
    case 'log':
      return staff;
    case 'reactions':
      return can(g, 'changeInfo');
    default:
      return false;
  }
}

function Missing({ chatId, sub, text }: { chatId: string; sub: string; text: string }) {
  return (
    <SubPage title="Недоступно" onBack={() => goBack(groupParentOf(chatId, sub))}>
      <EmptyState icon={<IconUsersGroup />} title="Раздел недоступен" text={text} />
    </SubPage>
  );
}

export function GroupScreen({ chatId, sub }: { chatId: string; sub: string }) {
  const info = useGroup(chatId);
  // Группу удалили или вы вышли из неё, а экран ещё уезжает: пустая рамка без мелькания «недоступно»
  if (!info || !isMember(info)) return <section className="fp ct" />;
  if (!groupAllowed(sub, info)) return <Missing chatId={chatId} sub={sub} text="У вас нет прав на этот раздел." />;

  const [head, second, third] = sub.split('/');
  switch (head) {
    case '':
      return <GroupInfoPage chatId={chatId} />;
    case 'edit':
      return <GroupManagePage chatId={chatId} />;
    case 'type':
      return <GroupTypePage chatId={chatId} />;
    case 'perms':
      return <GroupPermsPage chatId={chatId} />;
    case 'reactions':
      return <GroupReactionsPage chatId={chatId} />;
    case 'banned':
      return <GroupBannedPage chatId={chatId} />;
    case 'requests':
      return <GroupRequestsPage chatId={chatId} />;
    case 'log':
      return <GroupLogPage chatId={chatId} />;
    case 'members':
      return <GroupMembersPage chatId={chatId} />;
    case 'add':
      return <GroupAddMembersPage chatId={chatId} />;
    case 'admins':
      return <GroupAdminsPage chatId={chatId} />;
    case 'admin':
      return second === 'new' ? <GroupAdminPickPage chatId={chatId} /> : second ? <GroupAdminRightsPage chatId={chatId} memberId={second} /> : <GroupAdminsPage chatId={chatId} />;
    case 'links':
      return <GroupLinksPage chatId={chatId} />;
    case 'link':
      if (second === 'new') return <GroupLinkEditPage chatId={chatId} />;
      if (second && third === 'edit') return <GroupLinkEditPage chatId={chatId} linkId={second} />;
      return second ? <GroupLinkPage chatId={chatId} linkId={second} /> : <GroupLinksPage chatId={chatId} />;
    default:
      return <Missing chatId={chatId} sub={sub} text="Такого раздела нет." />;
  }
}
