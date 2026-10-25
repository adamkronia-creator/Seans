import { useMemo, useState } from 'react';
import { Frame } from '../Frame/Frame';
import { Avatar } from '../Avatar/Avatar';
import { SearchField } from '../SearchField/SearchField';
import { useChats } from '../../data/chatStore';
import { inviteToGroup, useGroupsState } from '../../data/groupStore';
import { membership } from '../../data/groups';
import { DIRECTORY, personOf, type Person } from '../../data/people';
import { useAllLinks } from '../../data/roleStore';

/** Работа с человеком как с клиентом (любая роль «Клиент» или «Пациент», кроме завершённой): таких в группы специалистов не зовут */
const CLIENT_ROLES = ['client', 'patient'];

/**
 * Позвать в группу. Список: люди из ваших чатов и специалисты из каталога, которых ещё нет в группе. Клиентов здесь нет: группа —
 * профессиональное объединение. Приглашение приходит человеку карточкой в его чате (если чата нет, он заводится).
 */
export function PeopleSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const state = useGroupsState();
  const chats = useChats();
  const links = useAllLinks();
  const [query, setQuery] = useState('');
  const group = state.groups.find((g) => g.id === id);

  const people = useMemo(() => {
    const ids = new Set<string>();
    for (const c of chats) {
      if (c.favorites || c.blocked) continue;
      if ((links[c.id] ?? []).some((l) => l.status !== 'ended' && CLIENT_ROLES.includes(l.roleId))) continue;
      ids.add(c.id);
    }
    for (const key of Object.keys(DIRECTORY)) ids.add(key);
    const list: Person[] = [];
    for (const personId of ids) {
      if (membership(state.members, id, personId)) continue;
      const person = personOf(personId, chats);
      if (person) list.push(person);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [chats, links, state.members, id]);

  if (!group) return null;
  const q = query.trim().toLocaleLowerCase('ru-RU');
  const shown = q ? people.filter((p) => `${p.name} ${p.headline} ${p.city}`.toLocaleLowerCase('ru-RU').includes(q)) : people;
  const invited = (personId: string) => state.invites.some((i) => i.groupId === id && i.personId === personId && i.state === 'pending');

  return (
    <Frame
      title="Позвать в группу"
      subtitle={group.name}
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button sheet__button--primary" onClick={onClose}>
          Готово
        </button>
      }
    >
      <SearchField value={query} onChange={setQuery} placeholder="Имя, подход или город" onClear={() => setQuery('')} />
      <section className="sheet__card frame-card gs-people">
        {shown.length > 0 ? (
          <ul className="gs-rows">
            {shown.map((p) => {
              const sent = invited(p.id);
              return (
                <li key={p.id}>
                  <div className="gs-row gs-row--plain">
                    <Avatar src={p.avatar} name={p.name} size={40} />
                    <span className="gs-row__text">
                      <span className="gs-row__title">{p.name}</span>
                      <span className="gs-row__sub">{[p.headline, p.city].filter(Boolean).join(' · ')}</span>
                    </span>
                    {sent ? (
                      <span className="gs-sent">Приглашён</span>
                    ) : (
                      <button type="button" className="gs-mini" aria-label={`Позвать: ${p.name}`} onClick={() => inviteToGroup(id, p.id)}>
                        Позвать
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="gs-note">Никого не нашлось. Клиентов в группы специалистов не зовут, их в списке нет.</p>
        )}
      </section>
      <p className="gs-note gs-note--inset">Приглашение придёт человеку карточкой в личном чате. Он сам решит, показывать ли значок рядом с именем.</p>
    </Frame>
  );
}
