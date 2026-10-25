import { useCallback, useMemo } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { IconChevronMk } from '../ChatItem/ChatIcons';
import { Switch } from '../Switch/Switch';
import { useChats } from '../../data/chatStore';
import { useGroupsState } from '../../data/groupStore';
import { AUDIENCE_LABEL, listedMembers, memberCount, ROLE_LABEL, type Audience, type Flags, type Group } from '../../data/groups';
import { ME, personOf, type Person } from '../../data/people';
import { avatarSrcOf, useProfile } from '../../data/profile';
import { plural } from '../../data/taskValues';
import './GroupSheets.css';

/** «4 участника» */
export const membersLabel = (n: number): string => `${n} ${plural(n, ['участник', 'участника', 'участников'])}`;

/** Город и число участников одной строкой: «Новосибирск · 4 участника», у группы без города — «Онлайн · …» */
export const groupLine = (group: Group, count: number): string => `${group.city.trim() || 'Онлайн'} · ${membersLabel(count)}`;

/** Человек по идентификатору: вы — по своему профилю, остальные — из чатов и каталога. Неизвестный участник не ломает строку */
export function usePerson(): (id: string) => Person {
  const chats = useChats();
  const profile = useProfile();
  const avatar = avatarSrcOf(profile);
  return useCallback(
    (id: string) =>
      id === ME
        ? { id, name: profile.name.trim() || 'Вы', avatar, headline: profile.headline.trim(), city: profile.city.trim() }
        : (personOf(id, chats) ?? { id, name: 'Участник', headline: '', city: '' }),
    [chats, profile.name, profile.headline, profile.city, avatar],
  );
}

/**
 * Участники группы: те, кто согласился быть в списке (вы видите себя всегда). Владелец и администраторы первыми.
 * Нажатие на строку открывает человека; свою строку открывать некуда.
 */
export function MemberRows({ groupId, onOpen }: { groupId: string; onOpen: (personId: string) => void }) {
  const { members } = useGroupsState();
  const person = usePerson();
  const listed = useMemo(() => listedMembers(members, groupId), [members, groupId]);
  const hidden = memberCount(members, groupId) - listed.length;
  return (
    <>
      <ul className="gs-rows">
        {listed.map((m) => {
          const p = person(m.personId);
          const mine = m.personId === ME;
          const sub = [m.role === 'member' ? '' : ROLE_LABEL[m.role], p.headline].filter(Boolean).join(' · ');
          const body = (
            <>
              <Avatar src={p.avatar} name={p.name} size={40} />
              <span className="gs-row__text">
                <span className="gs-row__title">{mine ? `${p.name} (вы)` : p.name}</span>
                {sub && <span className="gs-row__sub">{sub}</span>}
              </span>
            </>
          );
          return (
            <li key={m.personId}>
              {mine ? (
                <div className="gs-row gs-row--plain">{body}</div>
              ) : (
                <button type="button" className="gs-row" onClick={() => onOpen(m.personId)}>
                  {body}
                  <IconChevronMk className="gs-row__chevron" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {hidden > 0 && <p className="gs-note gs-note--inset">Ещё {membersLabel(hidden)} не в списке: они сами так решили.</p>}
    </>
  );
}

const AUDIENCES: Audience[] = ['all', 'peers', 'clients'];

/**
 * Что другие видят о вас в группе. Значок рядом с именем (кому именно) и строка в списке участников — два отдельных выбора:
 * можно быть в списке без значка у имени и наоборот.
 */
export function FlagsFields({ value, onChange }: { value: Flags; onChange: (next: Flags) => void }) {
  return (
    <>
      <section className="sheet__card frame-card">
        <div className="gs-switch">
          <span className="gs-switch__text">
            <span className="gs-switch__name">Значок рядом с именем</span>
            <span className="gs-switch__hint">Другие увидят значок группы у вашего имени. Нажав на него, они откроют группу.</span>
          </span>
          <Switch checked={value.showEmblem} onChange={(showEmblem) => onChange({ ...value, showEmblem })} label="Значок рядом с именем" />
        </div>
        {value.showEmblem && (
          <>
            <span className="frame-label gs-label-gap">Кому виден значок</span>
            <div className="ct-chips gs-chips" role="group" aria-label="Кому виден значок">
              {AUDIENCES.map((a) => (
                <button key={a} type="button" className="ct-chip" aria-pressed={value.audience === a} onClick={() => onChange({ ...value, audience: a })}>
                  {AUDIENCE_LABEL[a]}
                </button>
              ))}
            </div>
            <span className="ct-hint">«Моим клиентам»: значок видят только люди, с которыми вы работаете как специалист; коллеги его не увидят.</span>
          </>
        )}
      </section>
      <section className="sheet__card frame-card">
        <div className="gs-switch">
          <span className="gs-switch__text">
            <span className="gs-switch__name">Показывать меня в списке участников</span>
            <span className="gs-switch__hint">Если выключить, вас не найдут по значку и названию группы. Вы останетесь участником.</span>
          </span>
          <Switch checked={value.listed} onChange={(listed) => onChange({ ...value, listed })} label="Показывать меня в списке участников" />
        </div>
      </section>
    </>
  );
}
