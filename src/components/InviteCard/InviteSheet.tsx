import { Frame } from '../Frame/Frame';
import { useProfile } from '../../data/profile';
import { CAP_BY_ID, consentCaps, inSentence, orderCaps, type CapId } from '../../data/roles';
import { useLinks, useInvite, useRole } from '../../data/roleStore';
import { answerInvite } from './answerInvite';
import './InviteCard.css';

interface InviteSheetProps {
  inviteId: string;
  /** Имя собеседника (первое слово) */
  peer: string;
  /**
   * reply: вы отвечаете за собеседника на своё приглашение (демо, пока нет сервера): лист показывает приглашение его глазами.
   * view: вы смотрите, что включится у вас и у собеседника.
   */
  mode: 'reply' | 'view';
  onClose: () => void;
  onNote?: (text: string) => void;
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="invite-list">
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}

/** Что включает приглашение, по обе стороны: перечень собирается из тех же возможностей, что реально включатся */
export function InviteSheet({ inviteId, peer, mode, onClose, onNote }: InviteSheetProps) {
  const invite = useInvite(inviteId);
  const role = useRole(invite?.roleId ?? '');
  const link = useLinks(invite?.chatId ?? '').find((l) => l.id === invite?.linkId);
  const me = useProfile().name.trim().split(/\s+/)[0] || 'Специалист';
  if (!invite) return null;

  const live = (caps: readonly CapId[]) => orderCaps(caps).filter((id) => !CAP_BY_ID[id].soon);
  // Приглашение в роль включает всё, что включено в роли; дополнение — только добавленное
  const caps = live(invite.kind === 'role' ? (link?.caps ?? invite.caps) : invite.caps);
  const shared = consentCaps(caps);
  const own = caps.filter((id) => !CAP_BY_ID[id].shared);
  const reply = mode === 'reply';
  const answerable = reply && invite.state === 'pending';

  // Слева направо: что сможете вы, что сможет другая сторона. В режиме «ответ» вы смотрите глазами собеседника
  const you = reply ? shared.map((id) => CAP_BY_ID[id].theirs) : caps.map((id) => CAP_BY_ID[id].mine);
  const other = reply
    ? [...shared.map((id) => CAP_BY_ID[id].mine), ...(own.length ? ['Вести о вас заметки и сведения для себя, вам они не показываются'] : [])]
    : shared.map((id) => CAP_BY_ID[id].theirs);
  const otherName = reply ? me : peer;
  const roleName = role?.name ?? 'Роль';
  const mirror = role?.mirror ?? '';

  return (
    <Frame
      title={reply ? 'Ответ собеседника' : 'Что включится'}
      subtitle={reply ? `Так приглашение видит ${peer}. Пока нет сервера, отвечаете вы.` : `Роль «${roleName}»`}
      onClose={onClose}
      footer={
        answerable ? (
          <>
            <button
              type="button"
              className="sheet__button"
              onClick={() => {
                onClose();
                answerInvite(invite.id, false, onNote);
              }}
            >
              Отказаться
            </button>
            <button
              type="button"
              className="sheet__button sheet__button--primary"
              onClick={() => {
                onClose();
                answerInvite(invite.id, true, onNote);
              }}
            >
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
      {invite.kind === 'role' ? (
        <section className="sheet__card frame-card">
          <span className="frame-label">Роли</span>
          {reply ? (
            <p className="invite-text">
              {me} предлагает вам роль «{roleName}». Вы — {inSentence(roleName)}, {me} — {inSentence(mirror)}.
            </p>
          ) : (
            <p className="invite-text">
              {peer} — {inSentence(roleName)}. Вы — {inSentence(mirror)}.
            </p>
          )}
          {reply && role?.greeting && <p className="invite-quote">{role.greeting}</p>}
        </section>
      ) : (
        // Дополнение к работающей роли: в окне «Что включится» хватает подзаголовка с ролью, собеседнику нужно сказать, о чём просят
        reply && (
          <section className="sheet__card frame-card">
            <span className="frame-label">Новые функции</span>
            <p className="invite-text">
              {me} предлагает включить новые функции в роли «{roleName}».
            </p>
          </section>
        )
      )}
      {you.length > 0 && (
        <section className="sheet__card frame-card">
          <span className="frame-label">Вы сможете</span>
          <Points items={you} />
        </section>
      )}
      {other.length > 0 && (
        <section className="sheet__card frame-card">
          <span className="frame-label">{otherName} сможет</span>
          <Points items={other} />
        </section>
      )}
      <p className="invite-note">Закончить работу можно в любой момент.</p>
    </Frame>
  );
}
