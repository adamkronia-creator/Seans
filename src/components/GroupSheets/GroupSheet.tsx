import { useEffect, useMemo } from 'react';
import { Frame } from '../Frame/Frame';
import { EmblemTile } from '../Emblem/Emblem';
import { IconChevronMk } from '../ChatItem/ChatIcons';
import { useGroupsState } from '../../data/groupStore';
import { canRead, CHANNEL_LABEL, JOIN_LABEL, memberCount, whenLabel } from '../../data/groups';
import { ME } from '../../data/people';
import { afterSheetClose, navigate } from '../../router';
import { closeGroupSheet, groupPath } from './groupSheets';
import { JoinPanel } from './JoinPanel';
import { groupLine, MemberRows } from './parts';

/** Лист группы по нажатию на значок: что это за группа, как вступить, канал, участники. Подробное управление — на странице группы */
export function GroupSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const state = useGroupsState();
  const group = state.groups.find((g) => g.id === id);
  // Группу удалили, пока лист был открыт
  useEffect(() => {
    if (!group) onClose();
  }, [group, onClose]);

  const posts = useMemo(() => state.posts.filter((p) => p.groupId === id).sort((a, b) => b.at - a.at), [state.posts, id]);
  if (!group) return null;

  const readable = canRead(group, state.members, ME);
  const count = memberCount(state.members, id);

  /** Закрыть лист и открыть экран: переход после закрытия, иначе «назад» оставит лишнюю запись в истории */
  const go = (path: string) => {
    closeGroupSheet();
    afterSheetClose(() => navigate(path));
  };

  return (
    <Frame
      title={group.name}
      subtitle={groupLine(group, count)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
          {readable && (
            <button type="button" className="sheet__button sheet__button--primary" onClick={() => go(groupPath(id))}>
              Открыть группу
            </button>
          )}
        </>
      }
    >
      <section className="sheet__card frame-card">
        <div className="gs-hero">
          <EmblemTile emblem={group.emblem} size="lg" label={`Значок группы «${group.name}»`} />
          <div className="gs-hero__text">
            <p className={`gs-about${group.about ? '' : ' gs-about--empty'}`}>{group.about || 'Описания пока нет.'}</p>
          </div>
        </div>
        <div className="gs-facts">
          <span className="gs-fact">{JOIN_LABEL[group.join]}</span>
          <span className="gs-fact">{CHANNEL_LABEL[group.channel]}</span>
        </div>
        <p className="gs-note">Группа не проверена: создать группу может любой. Значок у человека значит, что его приняли в эту группу.</p>
      </section>

      <section className="sheet__card frame-card">
        <JoinPanel group={group} back onDone={onClose} />
      </section>

      <section className="sheet__card frame-card">
        {readable ? (
          <button type="button" className="gs-link" onClick={() => go(groupPath(id))}>
            <span className="gs-link__text">
              <span className="gs-row__title">Канал</span>
              <span className="gs-row__sub">{posts.length ? `${posts.length} ${posts.length === 1 ? 'запись' : posts.length < 5 ? 'записи' : 'записей'} · последняя ${whenLabel(posts[0].at)}` : 'Записей пока нет'}</span>
            </span>
            <IconChevronMk className="gs-row__chevron" />
          </button>
        ) : (
          <div className="gs-link gs-link--locked">
            <span className="gs-link__text">
              <span className="gs-row__title">Канал</span>
              <span className="gs-row__sub">Записи видят только участники. Вступите в группу, чтобы читать.</span>
            </span>
          </div>
        )}
      </section>

      <section className="sheet__card frame-card gs-people">
        <span className="frame-label">Участники · {count}</span>
        <MemberRows groupId={id} onOpen={(personId) => go(`/person/${personId}`)} />
      </section>
    </Frame>
  );
}
