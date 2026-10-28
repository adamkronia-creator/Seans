import { useEffect, useRef, useState } from 'react';
import { Card, Field, Hint, Pill, RadioDot, Row, SubPage, SwitchRow } from '../../components/GroupUi/GroupUi';
import { IconInfo, IconPlusLine, IconRestart, IconTrashLine, IconWarning } from '../../components/GroupUi/GroupIcons';
import { NetworkTile } from '../../components/CrossPost/CrossPost';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { useToast } from '../../components/Toast/useToast';
import { NETWORKS, NETWORK_META, checkSecret, failureText, parseTarget, type FailureCode, type Network } from '../../data/crosspost';
import { useGroup } from '../../data/groups';
import { INTEGRATIONS_MOCK, disconnect, saveConnection, setByDefault, setMockReply, useConnections, useMockReply, verifyConnection, type Connection } from '../../data/integrations';
import { goBack, navigate } from '../../router';
import { gPath } from './shared';
import './GroupIntegrations.css';

/*
 * Подключения канала к Telegram и ВКонтакте (макет, data/integrations.ts): список сетей с состоянием подключения и порядок подключения
 * с проверкой. Страницы видит только владелец канала; публиковать через подключения могут и администраторы, которым разрешены публикации.
 */

/** Номер сети в адресе (integrations/telegram) */
export const networkOf = (part: string | undefined): Network | null => NETWORKS.find((n) => n === part) ?? null;

/** Как подключить: три шага для каждой сети (тексты по интерфейсам сетей на момент написания, перед выпуском сверить) */
const STEPS: Record<Network, string[]> = {
  telegram: [
    'Создайте бота: напишите @BotFather команду /newbot и скопируйте выданный токен.',
    'Добавьте бота в свой канал администратором с правом «Публикация сообщений».',
    'Укажите адрес канала и вставьте токен ниже.',
  ],
  vk: [
    'Откройте сообщество: «Управление» → «Настройки» → «Работа с API».',
    'Создайте ключ доступа с правами «Стена» и «Фотографии».',
    'Укажите адрес сообщества и вставьте ключ ниже.',
  ],
};

// ---------------------------------------------------------------- список

/** Одна сеть: состояние, кем публикуем, «по умолчанию», переподключить и отключить */
function NetworkCard({ chatId, network, conn, onDrop, say }: { chatId: string; network: Network; conn?: Connection; onDrop: () => void; say: (text: string) => void }) {
  const meta = NETWORK_META[network];
  const broken = conn?.status === 'error';
  const open = () => navigate(gPath(chatId, `integrations/${network}`));
  return (
    <Card label={meta.name}>
      <Row
        lead={<NetworkTile network={network} size={40} />}
        title={meta.name}
        note={conn ? `${conn.title} · ${conn.target}` : `Публикуйте посты и в ${meta.noun === 'канал' ? 'свой канал' : 'сообщество'}`}
        end={conn ? <Pill tone={broken ? 'warn' : 'ok'}>{broken ? 'Ошибка' : 'Подключено'}</Pill> : undefined}
      />
      {conn && broken && <Row top icon={<IconWarning />} tone="danger" title="Публикация не работает" note={failureText(network, conn.problem ?? 'unknown')} />}
      {conn && !broken && <Row title="Публикует" note={conn.account} />}
      {conn && !broken && (
        <SwitchRow
          title="Публиковать по умолчанию"
          note="В поле ввода это можно отключить для одного поста"
          checked={conn.byDefault}
          onChange={(v) => {
            setByDefault(chatId, network, v);
            say(v ? `Новые посты уходят и в ${meta.chip}` : `В ${meta.chip} — только по выбору`);
          }}
        />
      )}
      {!conn && <Row tone="link" icon={<IconPlusLine />} title="Подключить" onClick={open} />}
      {conn && <Row tone="link" icon={<IconRestart />} title="Переподключить" onClick={open} />}
      {conn && <Row tone="danger" icon={<IconTrashLine />} title="Отключить" onClick={onDrop} />}
    </Card>
  );
}

/** Подключения канала: Telegram и ВКонтакте */
export function GroupIntegrationsPage({ chatId }: { chatId: string }) {
  const info = useGroup(chatId);
  const connections = useConnections(chatId);
  const reply = useMockReply();
  const [toast, say] = useToast();
  const [dropping, setDropping] = useState<Network | null>(null);
  const back = () => goBack(gPath(chatId, 'edit'));
  if (!info) return <SubPage title="Подключения" onBack={back}>{null}</SubPage>;
  const dropConn = dropping ? connections.find((c) => c.network === dropping) : undefined;
  return (
    <SubPage title="Подключения" subtitle={info.name} onBack={back} toast={toast} swipe={dropping === null}>
      <Hint>Посты канала можно отправлять в Telegram и во ВКонтакте. Личные и общие чаты никуда не отправляются — только публикации этого канала.</Hint>
      {NETWORKS.map((network) => (
        <NetworkCard key={network} chatId={chatId} network={network} conn={connections.find((c) => c.network === network)} onDrop={() => setDropping(network)} say={say} />
      ))}
      <Hint>Правка и удаление поста в приложении действуют и в сетях. Ключи доступа приложение не хранит: они остаются на сервере.</Hint>
      {INTEGRATIONS_MOCK && (
        <Card heading="Макет" hint="Сервера пока нет: проверка и публикация отвечают заглушкой, ничего не отправляется. Переключатель показывает, как приложение ведёт себя при каждом ответе.">
          <Row top role="radio" checked={reply === 'ok'} title="Сервер отвечает: успешно" end={<RadioDot on={reply === 'ok'} />} onClick={() => setMockReply('ok')} />
          <Row top role="radio" checked={reply === 'fail'} title="Сервер отвечает: ошибка" note="Подключение не пройдёт проверку, посты не уйдут" end={<RadioDot on={reply === 'fail'} />} onClick={() => setMockReply('fail')} />
        </Card>
      )}
      {dropping && dropConn && (
        <RemoveSheet
          title={`Отключить ${NETWORK_META[dropping].name}?`}
          text={`Новые посты перестанут уходить в ${dropConn.target}. Уже опубликованные останутся в ${NETWORK_META[dropping].name}, но правка и удаление в приложении на них больше не повлияют.`}
          confirm="Отключить"
          onClose={() => setDropping(null)}
          onConfirm={() => {
            disconnect(chatId, dropping);
            setDropping(null);
            say(`${NETWORK_META[dropping].name} отключён`);
          }}
        />
      )}
    </SubPage>
  );
}

// ---------------------------------------------------------------- подключение

/** Подключение сети: инструкция, адрес и ключ, проверка. Ключ уходит на проверку один раз и в приложении не остаётся */
export function GroupConnectPage({ chatId, network }: { chatId: string; network: Network }) {
  const info = useGroup(chatId);
  const old = useConnections(chatId).find((c) => c.network === network);
  const meta = NETWORK_META[network];
  const [target, setTarget] = useState(old?.target ?? '');
  const [secret, setSecret] = useState('');
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<FailureCode | null>(null);
  const [tried, setTried] = useState(false);
  const [toast, say] = useToast();
  const mounted = useRef(true);
  const timer = useRef(0);
  const failRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(timer.current);
    };
  }, []);
  // Сообщение об ошибке подключения появляется под полями; кнопка внизу парит над страницей и закрыла бы его край, поэтому его ставят по центру экрана
  useEffect(() => {
    if (!failure) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    failRef.current?.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  }, [failure]);
  const back = () => goBack(gPath(chatId, 'integrations'));
  if (!info) return <SubPage title="Подключение" onBack={back}>{null}</SubPage>;

  const parsed = target.trim() ? parseTarget(network, target) : null;
  const secretError = secret.trim() ? checkSecret(network, secret) : null;
  // Ошибку формата не показываем, пока человек только начал печатать: сначала после нажатия кнопки или когда введено заметно больше
  const targetStatus = !parsed
    ? null
    : parsed.ok
      ? { tone: 'ok' as const, text: `Адрес: ${parsed.value}` }
      : tried || target.trim().length >= 8
        ? { tone: 'error' as const, text: parsed.reason }
        : null;
  const secretStatus = !secret.trim() ? null : secretError ? (tried || secret.trim().length >= 12 ? { tone: 'error' as const, text: secretError } : null) : { tone: 'ok' as const, text: 'Формат верный' };
  const ready = Boolean(parsed?.ok) && !checkSecret(network, secret);

  const submit = async () => {
    setTried(true);
    if (checking || done || !parsed?.ok || checkSecret(network, secret)) return;
    setChecking(true);
    setFailure(null);
    const res = await verifyConnection({ chatId, network, target: parsed.value, secret: secret.trim() });
    // Сервер ответил «подключено» — подключение записывается, даже если экран уже закрыли: ключ у сервера есть
    if (res.ok) saveConnection(chatId, { network, target: parsed.value, title: res.title, account: res.account });
    if (!mounted.current) return;
    setChecking(false);
    if (res.ok) {
      setSecret('');
      setDone(true);
      say(`${meta.name} подключён`);
      timer.current = window.setTimeout(back, 900);
    } else {
      setFailure(res.failure.code);
    }
  };

  return (
    <SubPage
      title={`${old ? 'Переподключение' : 'Подключение'}: ${meta.name}`}
      subtitle={info.name}
      onBack={back}
      toast={toast}
      swipe={!checking}
      footer={{ label: checking ? 'Проверяем…' : done ? 'Подключено' : old ? 'Проверить и переподключить' : 'Проверить и подключить', disabled: !ready || checking || done, onClick: () => void submit() }}
    >
      {INTEGRATIONS_MOCK && (
        <Card>
          <Row top icon={<IconInfo />} title="Макет" note="Ничего не отправляется: проверку отыгрывает заглушка. Ответ сервера выбирается на экране «Подключения»." />
          {network === 'vk' && (
            <Row top icon={<IconWarning />} title="Порядок для ВК предварительный" note="По документации ВК публиковать на стену можно с токеном пользователя, а не сообщества. Как именно подключать, решится вместе с сервером." />
          )}
        </Card>
      )}
      <Card heading="Как подключить">
        <ol className="gi-steps">
          {STEPS[network].map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      </Card>
      <Field label={meta.targetLabel} value={target} onChange={setTarget} placeholder={meta.targetPlaceholder} inputMode="url" status={targetStatus} />
      <Field
        label={meta.secretLabel}
        value={secret}
        onChange={(v) => {
          setSecret(v);
          setFailure(null);
        }}
        placeholder={network === 'telegram' ? '123456789:AAH…' : 'Длинная строка из латиницы и цифр'}
        secret
        status={secretStatus}
        hint="Ключ уйдёт на сервер и останется только у него. В приложении он не сохраняется и после проверки стирается."
      />
      {failure && (
        <div ref={failRef}>
          <Card>
            <Row top icon={<IconWarning />} tone="danger" title="Не удалось подключить" note={failureText(network, failure)} />
          </Card>
        </div>
      )}
    </SubPage>
  );
}
