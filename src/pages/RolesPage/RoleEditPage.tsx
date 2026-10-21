import { useId, useRef, useState } from 'react';
import { AutoTextarea } from '../../components/EditSheet/AutoTextarea';
import { Switch } from '../../components/Switch/Switch';
import { IconBack } from '../../components/icons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { bindFolderRole, folderOfRole, useFolders } from '../../data/folders';
import { CAPS, capsLine, consentCaps, GREETING_MAX, orderCaps, ROLE_MAX, type CapId } from '../../data/roles';
import { deleteRole, getRole, isDefaultRole, isEditable, isNameFree, linksOfRole, resetRole, setRoleCaps, updateRole, useAllLinks, useRole, useRoles } from '../../data/roleStore';
import { plural } from '../../data/taskValues';
import { goBack } from '../../router';
import { plainText } from '../../utils/plainText';
import { useSwipeBack } from '../../utils/swipeBack';
import '../FolderPage/FolderPage.css';
import './RolesPage.css';

/**
 * Экран одной роли: как она называется для вас и для собеседника, приветствие в приглашении, какие функции включены у нового человека
 * и в какую папку чатов он попадает. Правки сохраняются сразу, как печатаешь.
 * «Менять и у тех, у кого роль уже есть» — переключатель режима: пока он включён, каждое изменение функций доходит и до людей с этой ролью
 * (их личные настройки не затираются, переносится только разница).
 */
export function RoleEditPage({ id }: { id: string }) {
  const uid = useId();
  const stored = useRole(id);
  // Роль удалили на этом экране, а он ещё уезжает: показываем её последний вид
  const last = useRef(stored);
  if (stored) last.current = stored;
  const role = stored ?? last.current;

  const everyone = useAllLinks();
  const roles = useRoles();
  const folders = useFolders('chats');
  const [name, setName] = useState(role?.name ?? '');
  const [mirror, setMirror] = useState(role?.mirror ?? '');
  const [greeting, setGreeting] = useState(role?.greeting ?? '');
  const [all, setAll] = useState(false);
  const [asking, setAsking] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useSwipeBack('.rp', !asking, () => goBack('/roles'));

  if (!role) return null;
  const taken = name.trim() !== '' && !isNameFree(name.trim(), id);
  /** Люди, у которых роль можно изменить: работающие и ждущие ответа, но не завершённые */
  const holders = Object.values(everyone).flat().filter((l) => l.roleId === id && isEditable(l)).length;
  const bound = folderOfRole(id);
  const total = linksOfRole(id).length;
  // Папка, которую уже заняла другая роль: молча отнять её нельзя, сначала связь снимают на экране той роли
  const takenBy = (folderRole?: string) => (folderRole && folderRole !== id ? roles.find((r) => r.id === folderRole)?.name : undefined);
  const busyFolders = folders.flatMap((f) => {
    const owner = takenBy(f.roleId);
    return owner ? [`«${f.name}» — «${owner}»`] : [];
  });

  const rename = (value: string) => {
    setName(value);
    // Пустое и занятое название не сохраняется: поле возвращает последнее сохранённое при выходе из него
    if (value.trim() && isNameFree(value.trim(), id)) updateRole(id, { name: value });
  };
  const toggle = (cap: CapId) => {
    const next = role.caps.includes(cap) ? role.caps.filter((c) => c !== cap) : orderCaps([...role.caps, cap]);
    setRoleCaps(id, next, all);
  };
  const shared = consentCaps(role.caps);

  return (
    <section className="fp rp">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={() => goBack('/roles')}>
          <IconBack />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">{role.name}</h1>
          <p className="fp__subtitle">{role.builtIn ? 'Встроенная роль' : 'Своя роль'}</p>
        </div>
      </header>
      <div className="fp__scroll">
        <section className="fp__card" aria-label="Названия">
          <label className="fp__field" htmlFor={`${uid}-name`}>
            <span className="fp__heading">Кем он для вас</span>
            <span className="fp__input-row">
              <input
                id={`${uid}-name`}
                className="fp__input"
                value={name}
                maxLength={ROLE_MAX}
                name="role-name"
                {...plainText}
                enterKeyHint="done"
                onChange={(e) => rename(e.target.value)}
                onBlur={() => setName(role.name)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <span className="fp__counter" aria-label={`Можно ввести ещё ${ROLE_MAX - name.length}`}>
                {ROLE_MAX - name.length}
              </span>
            </span>
            {taken && <span className="rp-error">Роль с таким названием уже есть</span>}
          </label>
          <label className="fp__field rp__sep" htmlFor={`${uid}-mirror`}>
            <span className="fp__heading">Кем вы для него</span>
            <span className="fp__input-row">
              <input
                id={`${uid}-mirror`}
                className="fp__input"
                value={mirror}
                maxLength={ROLE_MAX}
                name="role-mirror"
                {...plainText}
                enterKeyHint="done"
                onChange={(e) => {
                  setMirror(e.target.value);
                  updateRole(id, { mirror: e.target.value });
                }}
                onBlur={() => setMirror(role.mirror)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <span className="fp__counter">{ROLE_MAX - mirror.length}</span>
            </span>
          </label>
        </section>

        <section className="fp__card" aria-label="Приветствие">
          <label className="fp__field" htmlFor={`${uid}-greeting`}>
            <span className="fp__heading">Приветствие в приглашении</span>
            <AutoTextarea
              id={`${uid}-greeting`}
              className="rp__textarea"
              rows={2}
              value={greeting}
              maxLength={GREETING_MAX}
              placeholder="Пусто — приглашение без слов от вас"
              onChange={(value) => {
                setGreeting(value);
                updateRole(id, { greeting: value });
              }}
            />
          </label>
          <p className="fp__hint rp__hint">Эти слова собеседник увидит на карточке приглашения.</p>
        </section>

        <section className="fp__card" aria-label="Функции">
          <h2 className="fp__heading fp__heading--pad">Функции у нового человека</h2>
          <ul className="rp__caps">
            {CAPS.map((cap) => (
              <li key={cap.id} className={`rp-cap${cap.soon ? ' rp-cap--soon' : ''}`}>
                <span className="rp-cap__text">
                  <span className="rp-cap__name">
                    {cap.label}
                    {cap.soon && <span className="rp-cap__tag">скоро</span>}
                    {cap.shared && !cap.soon && <span className="rp-cap__tag">нужно согласие</span>}
                  </span>
                  <span className="rp-cap__hint">{cap.mine}</span>
                </span>
                {!cap.soon && <Switch checked={role.caps.includes(cap.id)} onChange={() => toggle(cap.id)} label={cap.label} />}
              </li>
            ))}
          </ul>
          <p className="fp__hint rp__hint">
            {shared.length ? `${capsLine(shared)}: включатся у человека после его согласия на приглашение.` : 'Общих функций нет: роль начинается сразу, приглашение не нужно.'}
          </p>
          {holders > 0 && (
            <div className="rp__all">
              <span className="rp__all-text">
                <span className="rp__all-name">Менять и у тех, у кого роль уже есть ({holders})</span>
                <span className="rp__all-hint">Новые общие функции уйдут им приглашениями. Их личные настройки не затрутся.</span>
              </span>
              <Switch checked={all} onChange={setAll} label="Менять и у тех, у кого роль уже есть" />
            </div>
          )}
        </section>

        <section className="fp__card" aria-label="Папка">
          <h2 className="fp__heading fp__heading--pad">Папка чатов</h2>
          <div className="rp__chips" role="group" aria-label="Папка роли">
            <button type="button" className="rp-chip" aria-pressed={!bound} onClick={() => bound && bindFolderRole(bound.id, undefined)}>
              Нет
            </button>
            {folders.map((folder) => (
              <button key={folder.id} type="button" className="rp-chip" aria-pressed={bound?.id === folder.id} disabled={!!takenBy(folder.roleId)} onClick={() => bindFolderRole(folder.id, id)}>
                {folder.name}
              </button>
            ))}
          </div>
          <p className="fp__hint rp__hint">
            Человек с этой ролью сам ложится в выбранную папку. А чат, который вы положили в папку вручную, получит предложение этой роли.
            {busyFolders.length > 0 && ` Серые папки заняты другими ролями: ${busyFolders.join(', ')}.`}
          </p>
        </section>

        {role.builtIn && !isDefaultRole(role) && (
          <button
            type="button"
            className="fp__card rp__action"
            onClick={() => {
              if (!resetRole(id)) return;
              // Поля показывают восстановленные значения
              const fresh = getRole(id);
              if (fresh) {
                setName(fresh.name);
                setMirror(fresh.mirror);
                setGreeting(fresh.greeting);
              }
            }}
          >
            Вернуть исходные настройки
          </button>
        )}
        {!role.builtIn && (
          <>
            <button type="button" className="fp__card fp__delete" onClick={() => (total > 0 ? setBlocked(true) : setAsking(true))}>
              Удалить роль
            </button>
            {blocked && (
              <p className="fp__hint rp__hint rp__hint--pad">
                Сначала снимите роль у людей: сейчас она у {total} {plural(total, ['человека', 'людей', 'людей'])}. Это делается в карточке контакта.
              </p>
            )}
          </>
        )}
      </div>
      <div className="fp__footer">
        <button type="button" className="fp__done" onClick={() => goBack('/roles')}>
          Готово
        </button>
      </div>
      {asking && (
        <RemoveSheet
          title="Удалить роль?"
          text={`Роль «${role.name}» будет удалена. Сейчас она ни у кого не назначена, поэтому ничьи вкладки не изменятся.`}
          confirm="Удалить"
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            if (deleteRole(id) === 'ok') goBack('/roles');
          }}
        />
      )}
    </section>
  );
}
