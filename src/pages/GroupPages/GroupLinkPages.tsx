import { useState } from 'react';
import { Card, Field, Hint, Row, RadioDot, SubPage, SwitchRow } from '../../components/GroupUi/GroupUi';
import { IconCopyLine, IconLinkRound, IconQr, IconRestart, IconShareLine, IconTrashLine, IconPenNew, IconUserCheck, IconGlobal, IconCloseCircle } from '../../components/GroupUi/GroupIcons';
import { targetOfLink, targetOfPublic, useLinkTools, type LinkTarget } from '../../components/GroupUi/LinkTools';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { useToast } from '../../components/Toast/useToast';
import { nameOf } from '../../data/contacts';
import { LINK_LIMITS, LINK_TERMS, dayText, leftText, linkNote, linkTitle, whenText } from '../../data/groupFormat';
import { createLink, deleteLink, editLink, isLinkAlive, resetPrimaryLink, revokeLink, shortUrl, useGroup, type InviteLink } from '../../data/groups';
import { goBack, navigate, navigateOver } from '../../router';
import { gPath } from './shared';

/*
 * Ссылки-приглашения: список (основная, дополнительные, отозванные), страница одной ссылки (скопировать, отправить, QR-код, отозвать, удалить)
 * и создание или правка ссылки со сроком, лимитом вступлений и одобрением заявок.
 */

const NAME_MAX = 32;

type Tools = ReturnType<typeof useLinkTools>;

/** Три действия над любой ссылкой: копировать, отправить в чат, QR-код */
function LinkActions({ target, title, tools }: { target: LinkTarget; title: string; tools: Tools }) {
  return (
    <>
      <Row icon={<IconCopyLine />} title="Копировать ссылку" onClick={() => tools.copy(target.url)} />
      <Row icon={<IconShareLine />} title="Отправить ссылку" onClick={() => tools.share(target)} />
      <Row icon={<IconQr />} title="QR-код" onClick={() => tools.showQr(target.url, title)} />
    </>
  );
}

// ---------------------------------------------------------------- Список

/** Ссылки-приглашения группы или канала */
export function GroupLinksPage({ chatId }: { chatId: string }) {
  const info = useGroup(chatId);
  const [toast, say] = useToast();
  const tools = useLinkTools(info, say);
  const [resetting, setResetting] = useState(false);
  const back = () => goBack(gPath(chatId, 'edit'));
  if (!info) return <SubPage title="Ссылки" onBack={back}>{null}</SubPage>;
  const channel = info.kind === 'channel';
  const primary = info.links.find((l) => l.primary && !l.revoked);
  const extra = info.links.filter((l) => !l.primary && isLinkAlive(l));
  const spent = info.links.filter((l) => !l.primary && !isLinkAlive(l));
  const open = (l: InviteLink) => navigate(gPath(chatId, `link/${l.id}`));
  return (
    <SubPage title="Ссылки-приглашения" subtitle={info.name} onBack={back} toast={toast} swipe={!tools.open && !resetting}>
      {info.isPublic && (
        <Card heading="Публичный адрес" hint="Адрес не меняется: по нему канал или общий чат находит поиск.">
          <Row icon={<IconGlobal />} title={`@${info.username}`} note={shortUrl(targetOfPublic(info).url)} end={<IconCopyLine />} onClick={() => tools.copy(targetOfPublic(info).url)} />
          <LinkActions target={targetOfPublic(info)} title={info.name} tools={tools} />
        </Card>
      )}
      {primary && (
        <Card heading="Основная ссылка" hint={`Любой, у кого есть эта ссылка, сможет ${channel ? 'подписаться на канал' : 'вступить в общий чат'}. Если сбросить её, прежняя перестанет работать.`}>
          <Row icon={<IconLinkRound />} title={shortUrl(targetOfLink(primary).url)} note={linkNote(primary)} onClick={() => tools.copy(targetOfLink(primary).url)} />
          <LinkActions target={targetOfLink(primary)} title={info.name} tools={tools} />
          <Row tone="danger" icon={<IconRestart />} title="Сбросить ссылку" onClick={() => setResetting(true)} />
        </Card>
      )}
      <Card heading="Дополнительные ссылки" hint="Можно сделать отдельную ссылку со сроком, лимитом вступлений или одобрением заявок: например, для семинара.">
        <Row tone="link" icon={<IconLinkRound />} title="Создать ссылку" onClick={() => navigate(gPath(chatId, 'link/new'))} />
        {extra.map((l) => (
          <Row key={l.id} tall icon={<IconLinkRound />} title={linkTitle(l)} note={linkNote(l)} chevron onClick={() => open(l)} />
        ))}
      </Card>
      {spent.length > 0 && (
        <Card heading="Недействующие ссылки">
          {spent.map((l) => (
            <Row key={l.id} tall icon={<IconCloseCircle />} title={linkTitle(l)} note={l.revoked ? 'Отозвана' : l.expiresAt && l.expiresAt <= Date.now() ? 'Срок истёк' : 'Лимит исчерпан'} chevron onClick={() => open(l)} />
          ))}
        </Card>
      )}
      {resetting && (
        <RemoveSheet
          title="Сбросить ссылку?"
          text={`Прежняя ссылка перестанет работать, а вместо неё появится новая. Те, кто уже ${channel ? 'подписан' : 'в общем чате'}, останутся.`}
          confirm="Сбросить"
          onClose={() => setResetting(false)}
          onConfirm={() => {
            setResetting(false);
            resetPrimaryLink(chatId);
            say('Ссылка сброшена, создана новая');
          }}
        />
      )}
      {tools.node}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Одна ссылка

/** Страница ссылки: адрес и действия, сведения о ней, правка, отзыв и удаление */
export function GroupLinkPage({ chatId, linkId }: { chatId: string; linkId: string }) {
  const info = useGroup(chatId);
  const [toast, say] = useToast();
  const tools = useLinkTools(info, say);
  const [asking, setAsking] = useState<'revoke' | 'delete' | null>(null);
  const back = () => goBack(gPath(chatId, 'links'));
  const link = info?.links.find((l) => l.id === linkId);
  if (!info || !link) return <SubPage title="Ссылка" onBack={back}>{null}</SubPage>;
  const target = targetOfLink(link);
  const alive = isLinkAlive(link);
  return (
    <SubPage title={linkTitle(link)} subtitle={alive ? 'Ссылка-приглашение' : 'Недействующая ссылка'} onBack={back} toast={toast} swipe={!tools.open && asking === null}>
      <Card heading="Ссылка" hint={alive ? undefined : 'Эта ссылка больше не работает: по ней нельзя вступить.'}>
        <Row icon={<IconLinkRound />} title={shortUrl(target.url)} onClick={() => tools.copy(target.url)} />
        {alive && <LinkActions target={target} title={linkTitle(link)} tools={tools} />}
      </Card>
      <Card heading="О ссылке">
        <Row title="Создана" value={whenText(link.createdAt)} note={nameOf(link.createdBy)} />
        <Row title="Вступило" value={String(link.joined)} />
        <Row title="Срок действия" value={link.expiresAt ? `${dayText(link.expiresAt)}, ${leftText(link.expiresAt)}` : 'Без срока'} />
        <Row title="Лимит вступлений" value={link.limit ? String(link.limit) : 'Без ограничений'} />
        <Row title="Одобрение заявок" value={link.needApproval ? 'Да' : 'Нет'} />
      </Card>
      {alive && !link.primary && (
        <Card>
          <Row icon={<IconPenNew />} title="Изменить" onClick={() => navigate(gPath(chatId, `link/${linkId}/edit`))} />
          <Row tone="danger" icon={<IconCloseCircle />} title="Отозвать ссылку" onClick={() => setAsking('revoke')} />
        </Card>
      )}
      {!alive && (
        <Card>
          <Row tone="danger" icon={<IconTrashLine />} title="Удалить ссылку" onClick={() => setAsking('delete')} />
        </Card>
      )}
      {asking && (
        <RemoveSheet
          title={asking === 'revoke' ? 'Отозвать ссылку?' : 'Удалить ссылку?'}
          text={asking === 'revoke' ? 'Ссылка перестанет работать. Те, кто уже вступил, останутся.' : 'Ссылка исчезнет из списка.'}
          confirm={asking === 'revoke' ? 'Отозвать' : 'Удалить'}
          onClose={() => setAsking(null)}
          onConfirm={() => {
            const what = asking;
            setAsking(null);
            if (what === 'revoke') {
              revokeLink(chatId, linkId);
              say('Ссылка отозвана');
            } else {
              deleteLink(chatId, linkId);
              back();
            }
          }}
        />
      )}
      {tools.node}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Создание и правка

/** Новая ссылка (linkId нет) или правка существующей: название, срок, лимит и одобрение заявок */
export function GroupLinkEditPage({ chatId, linkId }: { chatId: string; linkId?: string }) {
  const info = useGroup(chatId);
  const link = linkId ? info?.links.find((l) => l.id === linkId) : undefined;
  const [name, setName] = useState(link?.name ?? '');
  // 'keep' — оставить срок, как был (при правке ссылки со сроком); число — часы от сейчас, 0 — без срока
  const [term, setTerm] = useState<number | 'keep'>(link?.expiresAt ? 'keep' : 0);
  const [limit, setLimit] = useState(link?.limit ?? 0);
  const [approval, setApproval] = useState(link?.needApproval ?? false);
  const back = () => goBack(linkId ? gPath(chatId, `link/${linkId}`) : gPath(chatId, 'links'));
  if (!info || (linkId && !link)) return <SubPage title="Ссылка" onBack={back}>{null}</SubPage>;
  const save = () => {
    const expiresAt = term === 'keep' ? link?.expiresAt : term === 0 ? undefined : Date.now() + term * 3_600_000;
    const options = { name, expiresAt, limit: approval || limit === 0 ? undefined : limit, needApproval: approval };
    if (link) {
      editLink(chatId, link.id, options);
      back();
      return;
    }
    const made = createLink(chatId, options);
    // Экран создания уходит из истории: «назад» со страницы новой ссылки ведёт в их список
    if (made) navigateOver(gPath(chatId, `link/${made.id}`), 1, 'forward', gPath(chatId, 'links'));
  };
  return (
    <SubPage title={link ? 'Изменить ссылку' : 'Новая ссылка'} subtitle={info.name} onBack={back} footer={{ label: link ? 'Сохранить' : 'Создать', onClick: save }}>
      <Field label="Название" value={name} onChange={setName} max={NAME_MAX} placeholder="Например, Для семинара" hint="Название видно только администраторам: по нему ссылки легче различать." />
      <Card heading="Срок действия">
        {link?.expiresAt && (
          <Row title={`Оставить: ${dayText(link.expiresAt)}`} note={leftText(link.expiresAt)} role="radio" checked={term === 'keep'} end={<RadioDot on={term === 'keep'} />} onClick={() => setTerm('keep')} />
        )}
        {LINK_TERMS.map((t) => (
          <Row key={t.hours} title={t.label} role="radio" checked={term === t.hours} end={<RadioDot on={term === t.hours} />} onClick={() => setTerm(t.hours)} />
        ))}
      </Card>
      <Card hint={approval ? 'Новые люди вступят после вашего одобрения. Лимит вступлений при этом не используется.' : 'Новые люди будут вступать сразу. Включите одобрение, чтобы принимать каждого вручную.'}>
        <SwitchRow icon={<IconUserCheck />} title="Одобрение заявок" note="Вступить можно после вашего одобрения" checked={approval} onChange={setApproval} />
      </Card>
      {!approval && (
        <Card heading="Лимит вступлений" hint="Когда лимит исчерпан, ссылка перестаёт работать. Отозвать ссылку можно в любой момент.">
          {LINK_LIMITS.map((l) => (
            <Row key={l.value} title={l.label} role="radio" checked={limit === l.value} end={<RadioDot on={limit === l.value} />} onClick={() => setLimit(l.value)} />
          ))}
        </Card>
      )}
      {approval && <Hint>Отозвать ссылку можно в любой момент.</Hint>}
    </SubPage>
  );
}
