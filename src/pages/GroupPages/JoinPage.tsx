import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { Card, SubPage } from '../../components/GroupUi/GroupUi';
import { useToast } from '../../components/Toast/useToast';
import { countText, joinGroup, kindWord, publicUrl, useJoinTarget, type JoinStatus } from '../../data/groups';
import { goBack, navigateOver, useRoute } from '../../router';

/*
 * Вступление по ссылке-приглашению или адресу @имя (адрес /join/<код>): фото, название, число участников, описание и кнопка
 * «Вступить», «Подписаться» или «Отправить заявку». Недействующая ссылка объясняет, почему. Если заявку одобрили, пока страница открыта,
 * приложение само переходит в чат.
 */

const PROBLEMS: Record<Exclude<JoinStatus, 'ok'>, { title: string; text: string }> = {
  invalid: { title: 'Ссылка недействительна', text: 'Возможно, её отозвали или в адресе опечатка. Попросите администратора прислать новую.' },
  expired: { title: 'Срок ссылки истёк', text: 'По этой ссылке уже нельзя вступить. Попросите администратора прислать новую.' },
  full: { title: 'Лимит вступлений исчерпан', text: 'По этой ссылке уже вступило максимальное число людей. Попросите администратора прислать новую.' },
  banned: { title: 'Вступить нельзя', text: 'Администратор заблокировал вас в этой группе или канале.' },
};

export function JoinPage({ code }: { code: string }) {
  const t = useJoinTarget(code);
  const [toast, say] = useToast();
  const { prev } = useRoute();
  const group = t.group;
  const channel = group?.kind === 'channel';
  const sawPending = useRef(false);
  const [busy, setBusy] = useState(false);
  const back = () => goBack('/');

  // Страница заменяется чатом: «назад» из него ведёт туда, откуда пришли на приглашение, а не обратно на приглашение
  const toChat = (id: string) => navigateOver(`/chat/${id}`, 1, 'forward', prev ?? '/');

  // Заявку одобрили, пока страница открыта: открываем чат
  useEffect(() => {
    if (t.pending) sawPending.current = true;
    if (group && t.member && sawPending.current) {
      sawPending.current = false;
      toChat(group.chatId);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const action = () => {
    if (!group || busy) return;
    if (t.member) {
      toChat(group.chatId);
      return;
    }
    setBusy(true);
    const result = joinGroup(code);
    if (result === 'requested') {
      say('Заявка отправлена');
      setBusy(false);
    } else if (result === 'joined') toChat(group.chatId);
    else {
      say('Не удалось вступить: ссылка недействительна');
      setBusy(false);
    }
  };

  const problem = t.status === 'ok' ? null : PROBLEMS[t.status];
  let label = channel ? 'Подписаться' : 'Вступить';
  if (t.member) label = 'Открыть чат';
  else if (t.pending) label = 'Заявка отправлена';
  else if (t.needApproval) label = 'Отправить заявку';

  return (
    <SubPage
      title={group ? (channel ? 'Канал' : 'Группа') : 'Приглашение'}
      subtitle={group?.isPublic ? `@${group.username}` : 'Приглашение'}
      onBack={back}
      toast={toast}
      footer={problem ? null : { label, disabled: t.pending || busy, onClick: action }}
    >
      {group && (
        <div className="gu-join">
          <Avatar src={group.avatar} size={96} />
          <h2 className="gu-join__name">{group.name}</h2>
          <p className="gu-join__meta">{countText(group)}</p>
        </div>
      )}
      {problem && (
        <Card>
          <p className="gu-empty">
            <strong className="gu-empty__title">{problem.title}</strong>
            {problem.text}
          </p>
        </Card>
      )}
      {group && !problem && group.description && (
        <Card heading="Описание">
          <p className="gu-about gu-text">{group.description}</p>
        </Card>
      )}
      {group && !problem && t.pending && <p className="gu-hint gu-hint--alone">Заявка отправлена. Администратор рассмотрит её, и {kindWord(group.kind)} появится в списке чатов.</p>}
      {group && !problem && !t.pending && !t.member && t.needApproval && (
        <p className="gu-hint gu-hint--alone">{group.kind === 'channel' ? 'В этот канал' : 'В эту группу'} вступают по заявке: её рассмотрит администратор.</p>
      )}
      {group?.isPublic && !problem && <p className="gu-hint gu-hint--alone">Публичный адрес: {publicUrl(group.username).replace(/^https?:\/\//, '')}</p>}
    </SubPage>
  );
}
