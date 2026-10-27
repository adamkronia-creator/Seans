import { useMemo, useState, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import { sendMessage } from '../../data/chatStore';
import { inviteUrl, publicUrl, shortUrl, type GroupInfo, type InviteLink } from '../../data/groups';
import { copyText } from '../../utils/clipboard';
import { ForwardSheet } from '../ForwardSheet/ForwardSheet';
import { Frame } from '../Frame/Frame';

/*
 * Что делают со ссылкой-приглашением: скопировать, отправить в чат, показать QR-код. Одно место для экрана «О группе» и страниц ссылок:
 * хук отдаёт действия и готовую разметку окон (их нужно один раз положить в страницу).
 */

/** QR-код ссылки: чёрные модули на белом, поле в два модуля (по стандарту — четыре, но на телефоне и два читаются) */
export function QrCode({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const margin = 2;
    let d = '';
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (qr.isDark(row, col)) d += `M${col + margin} ${row + margin}h1v1h-1z`;
      }
    }
    return { size: n + margin * 2, path: d };
  }, [text]);
  return (
    <svg className="gu-qr__code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR-код ссылки" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

export function QrSheet({ title, url, onCopy, onClose }: { title: string; url: string; onCopy: () => void; onClose: () => void }) {
  return (
    <Frame
      title="QR-код"
      subtitle={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onCopy}>
            Копировать ссылку
          </button>
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
        </>
      }
    >
      <div className="gu-qr">
        <div className="gu-qr__box">
          <QrCode text={url} />
        </div>
        <p className="gu-qr__url">{shortUrl(url)}</p>
      </div>
    </Frame>
  );
}

/** Ссылка на вход: адрес и код, по которому её откроет страница вступления */
export interface LinkTarget {
  url: string;
  code: string;
}

export const targetOfLink = (l: InviteLink): LinkTarget => ({ url: inviteUrl(l.code), code: l.code });
/** Публичный адрес группы или канала: @имя вместо кода */
export const targetOfPublic = (g: GroupInfo): LinkTarget => ({ url: publicUrl(g.username), code: `@${g.username}` });

/** Действия над ссылкой для страницы: копировать, отправить в чат (окно выбора чатов), показать QR-код */
export function useLinkTools(group: GroupInfo | undefined, say: (text: string) => void) {
  const [sharing, setSharing] = useState<LinkTarget | null>(null);
  const [qr, setQr] = useState<{ title: string; url: string } | null>(null);
  const channel = group?.kind === 'channel';

  const copy = (url: string) => void copyText(url).then((ok) => say(ok ? 'Ссылка скопирована' : 'Не удалось скопировать'));

  const node: ReactNode = (
    <>
      {sharing && group && (
        <ForwardSheet
          onClose={() => setSharing(null)}
          onSend={(ids) => {
            const text = `Приглашение в ${channel ? 'канал' : 'общий чат'} «${group.name}»\n${sharing.url}`;
            ids.forEach((id) => sendMessage(id, text, undefined, { buttons: [{ label: channel ? 'Подписаться' : 'Вступить', href: `/join/${sharing.code}` }] }));
            setSharing(null);
            say(ids.length === 1 ? 'Ссылка отправлена' : `Ссылка отправлена: ${ids.length}`);
          }}
        />
      )}
      {qr && <QrSheet title={qr.title} url={qr.url} onCopy={() => copy(qr.url)} onClose={() => setQr(null)} />}
    </>
  );

  return {
    copy,
    share: (target: LinkTarget) => setSharing(target),
    showQr: (url: string, title: string) => setQr({ url, title }),
    /** Окно открыто: свайп «назад» на странице в это время выключен */
    open: sharing !== null || qr !== null,
    node,
  };
}
