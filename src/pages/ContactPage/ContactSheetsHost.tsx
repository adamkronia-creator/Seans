import { EditContactSheet, GiftSheet, ReportSheet } from '../../components/ContactSheets/ContactSheets';
import { RoleSheet } from '../../components/ContactSheets/RoleSheet';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { clearHistory, deleteChats, sendMessage, setBlockedMany, updateContact } from '../../data/chatStore';
import type { Chat } from '../../data/chats';
import { navigate } from '../../router';
import type { ContactSheet } from './ContactPage';

/** Окна профиля собеседника: какое открыто, то и показано; действия пишут в хранилище чатов и сообщают подсказкой */
export function ContactSheetsHost({ chat, sheet, onClose, say }: { chat: Chat; sheet: ContactSheet | null; onClose: () => void; say: (text: string) => void }) {
  const done = (text: string, run: () => void) => () => {
    run();
    onClose();
    say(text);
  };
  switch (sheet) {
    case 'edit':
      return <EditContactSheet chat={chat} onClose={onClose} onSave={(v) => done('Контакт сохранён', () => updateContact(chat.id, v))()} />;
    case 'role':
      return <RoleSheet chat={chat} onClose={onClose} say={say} />;
    case 'gift':
      return <GiftSheet onClose={onClose} onSend={(text) => done('Подарок отправлен', () => sendMessage(chat.id, text))()} />;
    case 'report':
      return <ReportSheet name={chat.name} onClose={onClose} onSend={done('Жалоба отправлена', () => undefined)} />;
    case 'clear':
      return (
        <RemoveSheet
          title="Очистить историю?"
          text={`Вся переписка с «${chat.name}» будет удалена. Сам чат останется в списке.`}
          confirm="Очистить"
          onClose={onClose}
          onConfirm={done('История очищена', () => clearHistory([chat.id]))}
        />
      );
    case 'block':
      return (
        <RemoveSheet
          title="Заблокировать?"
          text={`«${chat.name}» больше не сможет вам писать. Разблокировать можно в этом же меню.`}
          confirm="Заблокировать"
          onClose={onClose}
          onConfirm={done('Собеседник заблокирован', () => setBlockedMany([chat.id], true))}
        />
      );
    case 'delete':
      return (
        <RemoveSheet
          title="Удалить контакт?"
          text={`Контакт «${chat.name}» будет удалён вместе с перепиской. Это нельзя отменить.`}
          confirm="Удалить"
          onClose={onClose}
          onConfirm={() => {
            onClose();
            deleteChats([chat.id]);
            navigate('/', 'back');
          }}
        />
      );
    default:
      return null;
  }
}
