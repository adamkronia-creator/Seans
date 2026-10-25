import { RemoveSheet } from '../Profile/ProfileSheets';
import { Toast } from '../Toast/Toast';
import { deleteGroup, leaveGroup, useGroupsState } from '../../data/groupStore';
import { afterSheetClose, currentPath, goBack } from '../../router';
import { GroupEditSheet } from './GroupEditSheet';
import { GroupSheet } from './GroupSheet';
import { closeGroupSheet, groupPath, groupsPath, toastGroup, useGroupSheet } from './groupSheets';
import { JoinSheet } from './JoinSheet';
import { PeopleSheet } from './PeopleSheet';
import { ReplySheet } from './ReplySheet';
import { StatusSheet } from './StatusSheet';

/**
 * Единственное место, где показываются окна групп (лист группы, вступление, создание, приглашение людей, ответ на приглашение, статус).
 * Окна открываются с разных экранов и из пузырей ленты чата, а нажатие внутри окна, выведенного в пузыре, дошло бы до жестов пузыря
 * (долгое нажатие, свайп ответа): поэтому состояние общее (groupSheets.ts), а показывает его один узел на весь экран.
 */
export function GroupSheetHost() {
  const { sheet, toast } = useGroupSheet();
  const { groups } = useGroupsState();
  const onClose = closeGroupSheet;

  let node = null;
  switch (sheet?.kind) {
    case 'group':
      node = <GroupSheet key={`g-${sheet.id}`} id={sheet.id} onClose={onClose} />;
      break;
    case 'join':
      node = <JoinSheet key={`j-${sheet.id}-${sheet.invite ?? ''}`} id={sheet.id} invite={sheet.invite} back={sheet.back} onClose={onClose} />;
      break;
    case 'edit':
      node = <GroupEditSheet key={`e-${sheet.id ?? 'new'}`} id={sheet.id} onClose={onClose} />;
      break;
    case 'people':
      node = <PeopleSheet key={`p-${sheet.id}`} id={sheet.id} onClose={onClose} />;
      break;
    case 'reply':
      node = <ReplySheet key={`r-${sheet.invite}`} invite={sheet.invite} onClose={onClose} />;
      break;
    case 'status':
      node = <StatusSheet key="status" onClose={onClose} />;
      break;
    case 'leave': {
      const group = groups.find((g) => g.id === sheet.id);
      node = group && (
        <RemoveSheet
          key={`l-${sheet.id}`}
          title="Выйти из группы?"
          text={`Значок группы «${group.name}» исчезнет у вашего имени, а вас не будет в списке участников. Вернуться можно по правилам вступления в группу.`}
          confirm="Выйти"
          onClose={onClose}
          onConfirm={() => {
            leaveGroup(sheet.id);
            closeGroupSheet();
            toastGroup(`Вы вышли из группы «${group.name}»`);
          }}
        />
      );
      break;
    }
    case 'delete': {
      const group = groups.find((g) => g.id === sheet.id);
      node = group && (
        <RemoveSheet
          key={`d-${sheet.id}`}
          title="Удалить группу?"
          text={`Группа «${group.name}», её канал и значки у всех участников исчезнут. Это нельзя отменить.`}
          confirm="Удалить"
          onClose={onClose}
          onConfirm={() => {
            deleteGroup(sheet.id);
            closeGroupSheet();
            // Страницу удалённой группы закрываем после листа: переход раньше оставил бы запись листа посреди истории
            afterSheetClose(() => {
              if (currentPath() === groupPath(sheet.id)) goBack(groupsPath);
            });
            toastGroup(`Группа «${group.name}» удалена`);
          }}
        />
      );
      break;
    }
  }

  return (
    <>
      {node}
      {toast && <Toast text={toast} className="gs-toast" />}
    </>
  );
}
