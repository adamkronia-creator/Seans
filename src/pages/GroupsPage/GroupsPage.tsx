import { useMemo, useState } from 'react';
import { EmblemTile } from '../../components/Emblem/Emblem';
import { IconBackMk, IconChevronMk } from '../../components/ChatItem/ChatIcons';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { groupPath, openGroup, openGroupSheet } from '../../components/GroupSheets/groupSheets';
import { groupLine, usePerson } from '../../components/GroupSheets/parts';
import { IconSearch } from '../../components/icons';
import { SearchField } from '../../components/SearchField/SearchField';
import { useGroupsState } from '../../data/groupStore';
import { membership, memberCount, ROLE_LABEL, searchGroups, type Group } from '../../data/groups';
import { ME } from '../../data/people';
import { goBack, navigate } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import '../FolderPage/FolderPage.css';
import '../GroupPage/GroupPage.css';

function GroupRow({ group, sub, onClick }: { group: Group; sub: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className="gs-row" onClick={onClick}>
        <EmblemTile emblem={group.emblem} size="md" />
        <span className="gs-row__text">
          <span className="gs-row__title">{group.name}</span>
          <span className="gs-row__sub">{sub}</span>
        </span>
        <IconChevronMk className="gs-row__chevron" />
      </button>
    </li>
  );
}

/**
 * «Группы» (открывается из профиля): ваши группы, приглашения и все остальные, которые можно найти и вступить. Значок группы
 * у людей нажимается так же, как строка здесь: открывается лист группы. Создать группу может любой.
 */
export function GroupsPage() {
  const state = useGroupsState();
  const person = usePerson();
  const [query, setQuery] = useState('');
  useSwipeBack('.gl', true, () => goBack('/'));

  const { mine, others, invited } = useMemo(() => {
    const found = searchGroups(state.groups, query);
    const own = found.filter((g) => membership(state.members, g.id, ME));
    const rest = found
      .filter((g) => !membership(state.members, g.id, ME))
      .sort((a, b) => memberCount(state.members, b.id) - memberCount(state.members, a.id));
    const pending = state.invites.filter((i) => i.dir === 'in' && i.state === 'pending' && i.personId === ME);
    return { mine: own, others: rest, invited: pending.flatMap((i) => state.groups.filter((g) => g.id === i.groupId).map((group) => ({ group, by: i.by }))) };
  }, [state, query]);

  const asking = query.trim() !== '';
  const nothing = mine.length === 0 && others.length === 0;

  return (
    <section className="fp gl">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBackMk />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">Группы</h1>
          <p className="fp__subtitle">Значки, участники и каналы</p>
        </div>
      </header>

      <div className="fp__scroll gl__scroll">
        <SearchField value={query} onChange={setQuery} placeholder="Название, город или эмодзи" onClear={() => setQuery('')} />

        {!asking && invited.length > 0 && (
          <section className="fp__card gp__pad" aria-label="Приглашения">
            <h2 className="gp__heading">Приглашения · {invited.length}</h2>
            <ul className="gs-rows">
              {invited.map(({ group, by }) => (
                <GroupRow key={group.id} group={group} sub={`Зовёт ${person(by).name}`} onClick={() => openGroup(group.id)} />
              ))}
            </ul>
          </section>
        )}

        {mine.length > 0 && (
          <section className="fp__card gp__pad" aria-label="Мои группы">
            <h2 className="gp__heading">Мои группы · {mine.length}</h2>
            <ul className="gs-rows">
              {mine.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  sub={`${ROLE_LABEL[membership(state.members, group.id, ME)!.role]} · ${groupLine(group, memberCount(state.members, group.id))}`}
                  onClick={() => navigate(groupPath(group.id))}
                />
              ))}
            </ul>
          </section>
        )}

        {others.length > 0 && (
          <section className="fp__card gp__pad" aria-label="Найти группу">
            <h2 className="gp__heading">{asking ? 'Найдено' : 'Найти группу'}</h2>
            <ul className="gs-rows">
              {others.map((group) => {
                const requested = state.requests.some((r) => r.groupId === group.id && r.personId === ME);
                return <GroupRow key={group.id} group={group} sub={`${requested ? 'Заявка отправлена · ' : ''}${groupLine(group, memberCount(state.members, group.id))}`} onClick={() => openGroup(group.id)} />;
              })}
            </ul>
          </section>
        )}

        {nothing && (
          <EmptyState icon={<IconSearch />} title="Групп не нашлось" text="Попробуйте другое название или город. Группу можно создать самому: кнопка внизу." />
        )}
      </div>

      <div className="fp__footer">
        <button type="button" className="fp__done" onClick={() => openGroupSheet({ kind: 'edit' })}>
          Создать группу
        </button>
      </div>
    </section>
  );
}
