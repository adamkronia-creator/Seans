import { useMemo, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconBackMk } from '../../components/ChatItem/ChatIcons';
import { Chip } from '../../components/Chip/Chip';
import { AutoTextarea } from '../../components/EditSheet/AutoTextarea';
import { EmblemTile } from '../../components/Emblem/Emblem';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { groupsPath, openGroupSheet, toastGroup } from '../../components/GroupSheets/groupSheets';
import { JoinPanel } from '../../components/GroupSheets/JoinPanel';
import { groupLine, MemberRows, usePerson } from '../../components/GroupSheets/parts';
import { IconPlusLine } from '../../components/Profile/ProfileIcons';
import { answerRequest, deletePost, publish, revokeGroupInvite, useGroupsState } from '../../data/groupStore';
import { canPost, canRead, CHANNEL_LABEL, JOIN_LABEL, membership, memberCount, POST_MAX, ROLE_LABEL, whenLabel, type Post } from '../../data/groups';
import { ME } from '../../data/people';
import { goBack, navigate } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import { IconPencilLine } from '../ContactPage/ContactIcons';
import '../FolderPage/FolderPage.css';
import './GroupPage.css';

const TABS = ['Канал', 'Участники', 'О группе'] as const;
type Tab = (typeof TABS)[number];

const dateLabel = (at: number) => new Date(at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/** Одна запись канала: автор, время, текст; удалить её может автор или владелец (в два шага, чтобы не удалить случайно) */
function PostCard({ post, canDelete }: { post: Post; canDelete: boolean }) {
  const person = usePerson();
  const [asking, setAsking] = useState(false);
  const { members } = useGroupsState();
  const author = person(post.author);
  const role = membership(members, post.groupId, post.author)?.role;
  return (
    <li className="gp-post">
      <div className="gp-post__head">
        <Avatar src={author.avatar} name={author.name} size={36} />
        <span className="gp-post__who">
          <span className="gp-post__name">{post.author === ME ? `${author.name} (вы)` : author.name}</span>
          <span className="gp-post__time">
            {role && role !== 'member' ? `${ROLE_LABEL[role]} · ` : ''}
            {whenLabel(post.at)}
          </span>
        </span>
      </div>
      <p className="gp-post__text">{post.text}</p>
      {canDelete &&
        (asking ? (
          <div className="gp-post__ask">
            <span>Удалить запись?</span>
            <button type="button" className="gp-post__link" onClick={() => setAsking(false)}>
              Отмена
            </button>
            <button
              type="button"
              className="gp-post__link gp-post__link--danger"
              onClick={() => {
                deletePost(post.id);
                toastGroup('Запись удалена');
              }}
            >
              Удалить
            </button>
          </div>
        ) : (
          <button type="button" className="gp-post__link" onClick={() => setAsking(true)}>
            Удалить
          </button>
        ))}
    </li>
  );
}

/** Канал: лента записей группы; писать могут владелец и администраторы, читать — все или только участники (решает создатель) */
function Channel({ groupId }: { groupId: string }) {
  const state = useGroupsState();
  const group = state.groups.find((g) => g.id === groupId);
  const [draft, setDraft] = useState('');
  const posts = useMemo(() => state.posts.filter((p) => p.groupId === groupId).sort((a, b) => b.at - a.at), [state.posts, groupId]);
  if (!group) return null;

  const writer = canPost(state.members, groupId, ME);
  const owner = group.owner === ME;

  if (!canRead(group, state.members, ME)) {
    return (
      <EmptyState icon={<span className="gp__lock">🔒</span>} title="Канал только для участников" text="Записи видят участники группы. Вступите в группу, чтобы читать их." />
    );
  }

  const send = () => {
    if (publish(groupId, draft) === 'ok') {
      setDraft('');
      toastGroup('Запись опубликована');
    }
  };

  return (
    <>
      {writer && (
        <section className="fp__card gp__compose" aria-label="Новая запись">
          <AutoTextarea
            className="frame-textarea gp__draft"
            rows={2}
            value={draft}
            maxLength={POST_MAX}
            placeholder="Новая запись для участников"
            name="group-post"
            autoComplete="off"
            onChange={setDraft}
          />
          <div className="gp__compose-row">
            <span className="gp__hint">{group.channel === 'public' ? 'Прочитают все' : 'Прочитают участники'}</span>
            <button type="button" className="gs-mini" disabled={!draft.trim()} onClick={send}>
              Опубликовать
            </button>
          </div>
        </section>
      )}
      {posts.length > 0 ? (
        <ul className="gp-posts">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} canDelete={post.author === ME || owner} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<span className="gp__lock">📣</span>} title="Записей пока нет" text={writer ? 'Напишите первую запись: её увидят читатели канала.' : 'Владелец или администратор группы ещё ничего не публиковал.'} />
      )}
    </>
  );
}

/** Участники: список, заявки на вступление и приглашения (для тех, кто управляет), строка «Позвать людей» */
function People({ groupId }: { groupId: string }) {
  const { members, requests, invites } = useGroupsState();
  const person = usePerson();
  const manager = canPost(members, groupId, ME);
  const waiting = requests.filter((r) => r.groupId === groupId);
  const sent = invites.filter((i) => i.groupId === groupId && i.dir === 'out' && i.state === 'pending');
  return (
    <>
      {manager && (
        <section className="fp__card">
          <button type="button" className="fp__add" onClick={() => openGroupSheet({ kind: 'people', id: groupId })}>
            <span className="fp__add-icon" aria-hidden="true">
              <IconPlusLine />
            </span>
            Позвать людей
          </button>
        </section>
      )}

      {manager && waiting.length > 0 && (
        <section className="fp__card gp__pad" aria-label="Заявки на вступление">
          <h2 className="gp__heading">Заявки · {waiting.length}</h2>
          <ul className="gs-rows">
            {waiting.map((r) => {
              const p = person(r.personId);
              return (
                <li key={r.id}>
                  <div className="gs-row gs-row--plain gp__request">
                    <Avatar src={p.avatar} name={p.name} size={40} />
                    <span className="gs-row__text">
                      <span className="gs-row__title">{p.name}</span>
                      <span className="gs-row__sub">{[p.headline, whenLabel(r.at)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <button
                      type="button"
                      className="gp__round"
                      aria-label={`Отклонить заявку: ${p.name}`}
                      onClick={() => {
                        answerRequest(r.id, false);
                        toastGroup('Заявка отклонена');
                      }}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      className="gs-mini"
                      aria-label={`Принять заявку: ${p.name}`}
                      onClick={() => {
                        answerRequest(r.id, true);
                        toastGroup(`${p.name.split(' ')[0]} принят(а) в группу`);
                      }}
                    >
                      Принять
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {manager && sent.length > 0 && (
        <section className="fp__card gp__pad" aria-label="Приглашения">
          <h2 className="gp__heading">Приглашены · {sent.length}</h2>
          <ul className="gs-rows">
            {sent.map((i) => {
              const p = person(i.personId);
              return (
                <li key={i.id}>
                  <div className="gs-row gs-row--plain">
                    <Avatar src={p.avatar} name={p.name} size={40} />
                    <span className="gs-row__text">
                      <span className="gs-row__title">{p.name}</span>
                      <span className="gs-row__sub">Ждём ответа · {whenLabel(i.at)}</span>
                    </span>
                    <button type="button" className="gp__text-button" onClick={() => revokeGroupInvite(i.id)}>
                      Отозвать
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="fp__card gp__pad" aria-label="Участники">
        <h2 className="gp__heading">Участники · {memberCount(members, groupId)}</h2>
        <MemberRows groupId={groupId} onOpen={(personId) => navigate(`/person/${personId}`)} />
      </section>
    </>
  );
}

/** «О группе»: описание и правила, ваши настройки, выход (участнику) или правка и удаление (владельцу) */
function About({ groupId }: { groupId: string }) {
  const { groups, members } = useGroupsState();
  const person = usePerson();
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  const mine = membership(members, groupId, ME);
  const owner = person(group.owner);
  const facts: [string, string][] = [
    ['Город', group.city.trim() || 'Онлайн'],
    ['Вступление', JOIN_LABEL[group.join]],
    ['Канал', CHANNEL_LABEL[group.channel]],
    ['Владелец', group.owner === ME ? `${owner.name} (вы)` : owner.name],
    ['Создана', dateLabel(group.createdAt)],
  ];
  return (
    <>
      <section className="fp__card gp__pad" aria-label="О группе">
        <p className={`gs-about${group.about ? '' : ' gs-about--empty'}`}>{group.about || 'Описания пока нет.'}</p>
        <dl className="gp-facts">
          {facts.map(([label, value]) => (
            <div key={label} className="gp-facts__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="gs-note">Группа не проверена: создать группу может любой. Значок у человека значит, что его приняли в эту группу.</p>
      </section>

      {mine && (
        <section className="fp__card gp__actions" aria-label="Ваше участие">
          <button type="button" className="gp__action" onClick={() => openGroupSheet({ kind: 'join', id: groupId })}>
            Настройки в группе
          </button>
          {group.owner === ME ? (
            <>
              <button type="button" className="gp__action" onClick={() => openGroupSheet({ kind: 'edit', id: groupId })}>
                Изменить группу
              </button>
              <button type="button" className="gp__action gp__action--danger" onClick={() => openGroupSheet({ kind: 'delete', id: groupId })}>
                Удалить группу
              </button>
            </>
          ) : (
            <button type="button" className="gp__action gp__action--danger" onClick={() => openGroupSheet({ kind: 'leave', id: groupId })}>
              Выйти из группы
            </button>
          )}
        </section>
      )}
    </>
  );
}

/**
 * Страница группы (адрес /group/<группа>): значок, описание, ваше положение и три раздела — «Канал», «Участники», «О группе».
 * Открывается из листа группы по нажатию на значок и из списка групп. Управляет группой владелец: правка, заявки, приглашения, записи.
 */
export function GroupPage({ id }: { id: string }) {
  const { groups, members } = useGroupsState();
  const group = groups.find((g) => g.id === id);
  const [tab, setTab] = useState<Tab>('Канал');
  const back = () => goBack(groupsPath);
  useSwipeBack('.gp', true, back);
  if (!group) return <section className="fp gp" />;

  const count = memberCount(members, id);
  const owner = group.owner === ME;

  return (
    <section className="fp gp">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={back}>
          <IconBackMk />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">{group.name}</h1>
          <p className="fp__subtitle">{groupLine(group, count)}</p>
        </div>
        {owner && (
          <button type="button" className="fp__back" aria-label="Изменить группу" onClick={() => openGroupSheet({ kind: 'edit', id })}>
            <IconPencilLine />
          </button>
        )}
      </header>

      <div className="fp__scroll gp__scroll">
        <section className="fp__card gp__hero" aria-label="Группа">
          <div className="gs-hero">
            <EmblemTile emblem={group.emblem} size="lg" label={`Значок группы «${group.name}»`} />
            <div className="gs-hero__text">
              <p className={`gs-about${group.about ? '' : ' gs-about--empty'}`}>{group.about || 'Описания пока нет.'}</p>
            </div>
          </div>
          <div className="gp__join">
            <JoinPanel group={group} />
          </div>
        </section>

        <div className="gp__tabs">
          <div className="gp__chips" role="group" aria-label="Разделы группы">
            {TABS.map((name) => (
              <Chip key={name} follow tone="chat" active={tab === name} onClick={() => setTab(name)}>
                {name}
              </Chip>
            ))}
          </div>
        </div>

        <div key={tab} className="gp__panel" role="region" aria-label={tab}>
          {tab === 'Канал' && <Channel groupId={id} />}
          {tab === 'Участники' && <People groupId={id} />}
          {tab === 'О группе' && <About groupId={id} />}
        </div>
      </div>
    </section>
  );
}
