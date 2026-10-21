import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Frame } from '../Frame/Frame';
import { Switch } from '../Switch/Switch';
import { IconChevronMk } from '../ChatItem/ChatIcons';
import { CAP_BY_ID, CAPS, capsDiff, capsLine, consentCaps, inSentence, orderCaps, ROLE_MAX, shortDate, type CapId, type RoleLink } from '../../data/roles';
import {
  assignRole,
  canRemoveLink,
  createRole,
  endRole,
  isEditable,
  isNameFree,
  removeLink,
  respondInvite,
  revokeInvite,
  setLinkCaps,
  setRoleCaps,
  useAllLinks,
  useInvites,
  useLinks,
  useRoles,
} from '../../data/roleStore';
import { folderOfRole, useFolders } from '../../data/folders';
import type { Chat } from '../../data/chats';
import { plainText } from '../../utils/plainText';
import './ContactSheets.css';
import './RoleSheet.css';

/*
 * Окно «Роли» в карточке контакта. На чат бывает несколько ролей: первый уровень — список ролей чата и чипсы «Добавить роль»,
 * второй — одна роль: какие функции в ней включены (переключатели), «для всех с этой ролью» и завершение работы.
 * Правило согласия: свои функции включаются сразу, общие (тесты, задания) — после согласия собеседника, ему уходит приглашение.
 */

/** Черновик второго уровня: роль, её связь с этим чатом (если уже назначена) и то, что человек выбрал, пока ничего не сохранено */
interface Draft {
  roleId: string;
  linkId?: string;
  caps: CapId[];
  forAll: boolean;
  /** Ждём подтверждения опасного действия под кнопкой */
  confirm?: 'end';
}

const STATUS: Record<RoleLink['status'], (link: RoleLink) => string> = {
  active: (link) => `Работа идёт · с ${shortDate(link.since)}`,
  pending: (link) => (link.dir === 'in' ? 'Ждёт вашего ответа' : 'Ждём ответа на приглашение'),
  ended: () => 'Работа завершена',
};

interface RoleSheetProps {
  chat: Chat;
  onClose: () => void;
  /** Короткая подсказка экрану: окно закрывается сразу, подсказку показывает экран */
  say: (text: string) => void;
}

export function RoleSheet({ chat, onClose, say }: RoleSheetProps) {
  const uid = useId();
  const roles = useRoles();
  const links = useLinks(chat.id);
  const invites = useInvites();
  const everyone = useAllLinks();
  const folders = useFolders('chats');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [custom, setCustom] = useState('');
  const [taken, setTaken] = useState(false);
  const danger = useRef<HTMLElement>(null);

  // Вопрос «Завершить работу?» появляется внизу прокручиваемого окна: подводим к нему, чтобы кнопки не прятались за нижней панелью
  const asking = draft?.confirm;
  useEffect(() => {
    if (!asking) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    danger.current?.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
  }, [asking]);

  const role = draft ? roles.find((r) => r.id === draft.roleId) : undefined;
  const link = draft?.linkId ? links.find((l) => l.id === draft.linkId) : undefined;
  // Связь могла исчезнуть (отказ, снятие роли): тогда возвращаемся к списку
  const detail = draft && role && (!draft.linkId || link) ? { draft, role, link } : null;

  /** Сколько других людей с этой ролью получат то же изменение, если включить «для всех» */
  const others = useMemo(() => {
    if (!detail) return 0;
    return Object.values(everyone)
      .flat()
      .filter((l) => l.roleId === detail.role.id && l.id !== detail.link?.id && isEditable(l)).length;
  }, [everyone, detail]);

  // Роль, которую подсказывает папка: чат уже лежит в папке, связанной с ролью, но этой роли у него нет
  const suggested = useMemo(() => {
    const folder = folders.find((f) => f.roleId && f.ids.includes(chat.id) && !links.some((l) => l.roleId === f.roleId && l.status !== 'ended'));
    const hit = folder && roles.find((r) => r.id === folder.roleId);
    return folder && hit ? { folder: folder.name, roleId: hit.id } : null;
  }, [folders, links, roles, chat.id]);

  const held = (roleId: string) => links.some((l) => l.roleId === roleId && l.status !== 'ended');
  const open = (next: Draft) => {
    setDraft(next);
    setTaken(false);
  };
  const openNew = (roleId: string) => {
    const def = roles.find((r) => r.id === roleId);
    if (def) open({ roleId, caps: [...def.caps], forAll: false });
  };
  const openLink = (l: RoleLink) => open({ roleId: l.roleId, linkId: l.id, caps: [...l.caps], forAll: false });

  const addCustom = () => {
    const name = custom.trim();
    if (!name) return;
    if (!isNameFree(name)) {
      setTaken(true);
      return;
    }
    const created = createRole({ name });
    if (created) {
      setCustom('');
      openNew(created.id);
    }
  };

  const toggle = (cap: CapId) =>
    setDraft((d) => (d ? { ...d, caps: d.caps.includes(cap) ? d.caps.filter((c) => c !== cap) : orderCaps([...d.caps, cap]) } : d));

  /** Приглашение этой связи, которое ещё ждёт ответа */
  const pendingInvite = (linkId: string) => invites.find((i) => i.linkId === linkId && i.state === 'pending');

  const finish = (text: string) => {
    onClose();
    say(text);
  };

  const save = () => {
    if (!detail) return;
    const { draft: d, role: def, link: current } = detail;
    const caps = orderCaps(d.caps);
    if (!current) {
      const result = assignRole(chat.id, def.id, caps);
      if (!result) return finish(`Роль «${def.name}» у этого человека уже есть`);
      const wide = d.forAll ? setRoleCaps(def.id, caps, true) : null;
      const base = result.invite ? `Приглашение отправлено: роль «${def.name}»` : `Роль «${def.name}» назначена`;
      const extra = [wide?.others ? `обновлено у других: ${wide.others}` : '', result.folder ? `папка «${result.folder}»` : ''].filter(Boolean);
      return finish([base, ...extra].join(' · '));
    }
    const diff = capsDiff(current.caps, caps);
    const result = setLinkCaps(chat.id, current.id, caps, d.forAll);
    if (!result) return finish('Не удалось сохранить');
    const fresh = current.status === 'active' ? consentCaps(diff.added).filter((c) => !current.agreed.includes(c)) : [];
    const base = fresh.length ? `Приглашение отправлено: ${capsLine(fresh)}` : diff.added.length || diff.removed.length ? 'Функции сохранены' : 'Без изменений';
    finish(result.others ? `${base} · обновлено у других: ${result.others}` : base);
  };

  // ——— Первый уровень: роли чата ———
  const list = (
    <>
      {links.length > 0 && (
        <section className="sheet__card frame-card">
          <span className="frame-label">Сейчас</span>
          <ul className="role-rows">
            {links.map((l) => (
              <li key={l.id}>
                <button type="button" className="role-row" onClick={() => openLink(l)}>
                  <span className="role-row__text">
                    <span className="role-row__title">{roles.find((r) => r.id === l.roleId)?.name ?? 'Роль'}</span>
                    <span className="role-row__sub">{STATUS[l.status](l)}</span>
                  </span>
                  <IconChevronMk className="role-row__chevron" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="sheet__card frame-card">
        <span className="frame-label">{links.length ? 'Добавить роль' : 'Выберите роль'}</span>
        <div className="ct-chips" role="group" aria-label="Роли">
          {roles
            .filter((r) => !held(r.id))
            .map((r) => (
              <button key={r.id} type="button" className="ct-chip" data-suggested={suggested?.roleId === r.id ? '' : undefined} onClick={() => openNew(r.id)}>
                {r.name}
              </button>
            ))}
        </div>
        {suggested && <span className="ct-hint">Чат лежит в папке «{suggested.folder}»: подойдёт выделенная роль.</span>}
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-custom`}>
          Или создайте свою
        </label>
        <div className="role-new">
          <input
            id={`${uid}-custom`}
            className="frame-textarea"
            value={custom}
            maxLength={ROLE_MAX}
            name="role-name"
            placeholder="Например, наставник"
            {...plainText}
            onChange={(e) => {
              setCustom(e.target.value);
              setTaken(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <button type="button" className="role-new__button" disabled={!custom.trim()} onClick={addCustom}>
            Далее
          </button>
        </div>
        {taken && <span className="ct-hint ct-hint--error">Роль с таким названием уже есть. Выберите её выше.</span>}
        <span className="ct-hint">У своей роли сначала включены только заметки, остальное вы выбираете сами.</span>
      </section>
    </>
  );

  // ——— Второй уровень: одна роль ———
  let body = list;
  let footer = (
    <button type="button" className="sheet__button sheet__button--primary" onClick={onClose}>
      Готово
    </button>
  );
  let title = 'Роли';
  let subtitle: string | undefined = chat.name;

  if (detail) {
    const { draft: d, role: def, link: current } = detail;
    const editable = !current || isEditable(current);
    const incoming = current?.status === 'pending' && current.dir === 'in';
    const waiting = current?.status === 'pending' && current.dir === 'out';
    const ended = current?.status === 'ended';
    const invite = current ? pendingInvite(current.id) : undefined;
    const caps = orderCaps(d.caps);
    const live = caps.filter((c) => !CAP_BY_ID[c].soon);
    // Что уйдёт приглашением: у новой роли все общие функции, у работающей — только добавленные и ещё не согласованные
    const asked = !current ? consentCaps(caps) : current.status === 'active' ? consentCaps(capsDiff(current.caps, caps).added).filter((c) => !current.agreed.includes(c)) : [];
    const folder = folderOfRole(def.id);
    const dirty = current ? caps.join() !== current.caps.join() : true;

    title = def.name;
    subtitle = current ? STATUS[current.status](current) : `Новая роль · ${def.mirror === def.name ? 'вы и он одинаково' : `вы — ${inSentence(def.mirror)}`}`;

    body = (
      <>
        {incoming && (
          <section className="sheet__card frame-card">
            <p className="role-text">Это приглашение от собеседника: он предлагает роль «{def.name}». Функции появятся после вашего согласия.</p>
            {invite && (
              <div className="role-actions">
                <button
                  type="button"
                  className="role-button"
                  onClick={() => {
                    const result = respondInvite(invite.id, false);
                    finish(result ? 'Приглашение отклонено' : 'Не удалось ответить');
                  }}
                >
                  Отказаться
                </button>
                <button
                  type="button"
                  className="role-button role-button--primary"
                  onClick={() => {
                    const result = respondInvite(invite.id, true);
                    finish(result ? `Приглашение принято: роль «${def.name}»${result.folder ? ` · папка «${result.folder}»` : ''}` : 'Не удалось ответить');
                  }}
                >
                  Согласиться
                </button>
              </div>
            )}
          </section>
        )}

        <section className="sheet__card frame-card">
          <span className="frame-label">Функции</span>
          {editable ? (
            <ul className="role-caps">
              {CAPS.map((cap) => (
                <li key={cap.id} className={`role-cap${cap.soon ? ' role-cap--soon' : ''}`}>
                  <span className="role-cap__text">
                    <span className="role-cap__name">
                      {cap.label}
                      {cap.soon && <span className="role-cap__tag">скоро</span>}
                      {cap.shared && !cap.soon && <span className="role-cap__tag">нужно согласие</span>}
                    </span>
                    <span className="role-cap__hint">{cap.mine}</span>
                  </span>
                  {!cap.soon && <Switch checked={caps.includes(cap.id)} onChange={() => toggle(cap.id)} label={cap.label} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="role-text">{live.length ? `Включено: ${capsLine(live)}.` : 'Ничего не включено.'}</p>
          )}
          {ended && <p className="role-text">Работа завершена: общие функции выключены, история и ответы остаются.</p>}
        </section>

        {editable && others > 0 && (
          <section className="sheet__card frame-card">
            <div className="role-all">
              <span className="role-all__text">
                <span className="role-all__name" id={`${uid}-all`}>
                  Для всех с этой ролью ({others})
                </span>
                <span className="role-all__hint">Изменения получат и другие люди с ролью «{def.name}», а также новые. Их личные настройки не затрёт.</span>
              </span>
              <Switch checked={d.forAll} onChange={(v) => setDraft({ ...d, forAll: v })} label="Для всех с этой ролью" />
            </div>
          </section>
        )}

        {editable && (
          <p className="role-note">
            {asked.length
              ? `${capsLine(asked)} включатся после согласия собеседника: ему уйдёт приглашение. Остальное работает сразу.`
              : !current
                ? 'Общих функций нет: роль начнётся сразу.'
                : 'Изменения сохранятся сразу.'}
            {!current && folder && !folder.ids.includes(chat.id) ? ` Чат ляжет в папку «${folder.name}»${asked.length ? ' после согласия' : ''}.` : ''}
          </p>
        )}

        {current && (current.status !== 'pending' || waiting) && (
          <section className="sheet__card frame-card" ref={danger}>
            {d.confirm === 'end' ? (
              <>
                <p className="role-text">Завершить работу? Общие функции выключатся, история и ответы останутся. Собеседнику придёт короткая строка в диалоге.</p>
                <div className="role-actions">
                  <button type="button" className="role-button" onClick={() => setDraft({ ...d, confirm: undefined })}>
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="role-button role-button--danger"
                    onClick={() => finish(endRole(chat.id, current.id) ? `Работа завершена: роль «${def.name}»` : 'Не удалось завершить')}
                  >
                    Завершить
                  </button>
                </div>
              </>
            ) : waiting && invite ? (
              <button type="button" className="role-link role-link--danger" onClick={() => finish(revokeInvite(invite.id) ? `Приглашение отозвано: роль «${def.name}»` : 'Не удалось отозвать')}>
                Отозвать приглашение
              </button>
            ) : current.status === 'active' && !canRemoveLink(current) ? (
              <button type="button" className="role-link role-link--danger" onClick={() => setDraft({ ...d, confirm: 'end' })}>
                Завершить работу
              </button>
            ) : canRemoveLink(current) ? (
              <button type="button" className="role-link role-link--danger" onClick={() => finish(removeLink(chat.id, current.id) ? `Роль «${def.name}» снята` : 'Не удалось снять')}>
                Снять роль
              </button>
            ) : null}
          </section>
        )}
      </>
    );

    footer = (
      <>
        <button type="button" className="sheet__button" onClick={() => setDraft(null)}>
          Назад
        </button>
        {editable && (
          <button type="button" className="sheet__button sheet__button--primary" disabled={!dirty} onClick={save}>
            {!current ? (asked.length ? 'Пригласить' : 'Назначить') : asked.length ? 'Предложить' : 'Сохранить'}
          </button>
        )}
      </>
    );
  }

  return (
    <Frame title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
      {body}
    </Frame>
  );
}
