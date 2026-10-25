import { useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { EmblemChip, EmblemMarks, EmblemTile } from '../../components/Emblem/Emblem';
import { openGroup } from '../../components/GroupSheets/groupSheets';
import { groupLine } from '../../components/GroupSheets/parts';
import { useGroupsState, type PersonHit } from '../../data/groupStore';
import { memberCount, type Group } from '../../data/groups';
import { navigate } from '../../router';
import './PeopleResults.css';

/** Что нашлось кроме чатов: люди (по имени, городу, названию группы, значку) и сами группы */
export interface Found {
  people: PersonHit[];
  groups: Group[];
}

/** Сколько людей показано сразу */
const PEOPLE_SHOWN = 5;

interface PeopleResultsProps {
  /** Результаты поиска; без запроса их нет */
  found: Found | null;
  /** Открыто поле поиска, запрос пуст: ряд самых многолюдных групп, чтобы было с чего начать */
  popular: Group[] | null;
  /** Ниже идут найденные чаты: им нужен свой заголовок, иначе два списка слипаются */
  chatsFollow: boolean;
}

function PersonRow({ hit }: { hit: PersonHit }) {
  const { person } = hit;
  return (
    <li className="chat-item">
      <button type="button" className="chat-item__button" onClick={() => navigate(`/person/${person.id}`)}>
        <Avatar src={person.avatar} name={person.name} alt="" />
        <span className="chat-item__body">
          <span className="chat-item__row chat-item__row--top">
            <span className="chat-item__title">
              <span className="chat-item__name">{person.name}</span>
              <EmblemMarks personId={person.id} />
            </span>
          </span>
          <span className="chat-item__row chat-item__row--bottom">
            <span className="chat-item__line">
              <span className="chat-item__preview">{[person.headline, person.city].filter(Boolean).join(' · ') || 'Специалист'}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

function GroupRow({ group }: { group: Group }) {
  const { members } = useGroupsState();
  return (
    <li className="chat-item">
      <button type="button" className="chat-item__button" onClick={() => openGroup(group.id)}>
        <EmblemTile emblem={group.emblem} size="row" />
        <span className="chat-item__body">
          <span className="chat-item__row chat-item__row--top">
            <span className="chat-item__title">
              <span className="chat-item__name">{group.name}</span>
            </span>
          </span>
          <span className="chat-item__row chat-item__row--bottom">
            <span className="chat-item__line">
              <span className="chat-item__preview">{groupLine(group, memberCount(members, group.id))}</span>
            </span>
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Строки поиска по чатам, которые стоят в одном списке с чатами: найденные люди и группы, а при пустом запросе в открытом поиске —
 * ряд популярных групп. Нажатие на человека открывает его профиль, на группу — лист группы (кто в ней, канал, вступление).
 * Возвращает строки списка (li), а не свой список: так они лежат в общем ul вместе с чатами.
 */
export function PeopleResults({ found, popular, chatsFollow }: PeopleResultsProps) {
  // Людей по короткому запросу много: сначала первые, остальные по нажатию. Новый запрос (новый found) снова сворачивает список
  const [expanded, setExpanded] = useState<Found | null>(null);
  if (popular && popular.length > 0) {
    return (
      <>
        <li className="messages__heading">
          <h2>Группы</h2>
        </li>
        <li className="messages__groups">
          <div className="messages__groups-row" role="group" aria-label="Популярные группы" data-hscroll>
            {popular.map((group) => (
              <EmblemChip key={group.id} group={group} />
            ))}
          </div>
        </li>
      </>
    );
  }
  if (!found) return null;
  const all = expanded === found;
  const people = all ? found.people : found.people.slice(0, PEOPLE_SHOWN);
  const hidden = found.people.length - people.length;
  return (
    <>
      {found.groups.length > 0 && (
        <>
          <li className="messages__heading">
            <h2>Группы</h2>
          </li>
          {found.groups.map((group) => (
            <GroupRow key={group.id} group={group} />
          ))}
        </>
      )}
      {found.people.length > 0 && (
        <>
          <li className="messages__heading">
            <h2>Люди</h2>
          </li>
          {people.map((hit) => (
            <PersonRow key={hit.person.id} hit={hit} />
          ))}
          {hidden > 0 && (
            <li>
              <button type="button" className="messages__more" onClick={() => setExpanded(found)}>
                Показать всех · {found.people.length}
              </button>
            </li>
          )}
        </>
      )}
      {chatsFollow && (
        <li className="messages__heading">
          <h2>Чаты</h2>
        </li>
      )}
    </>
  );
}
