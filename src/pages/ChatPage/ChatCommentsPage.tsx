import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconBackMk } from '../../components/ChatItem/ChatIcons';
import { Frame } from '../../components/Frame/Frame';
import { Card, Hint, PersonAvatar, RadioDot, Row, usePersonName } from '../../components/GroupUi/GroupUi';
import { MessageBubble } from '../../components/MessageBubble/MessageBubble';
import { MessageInput } from '../../components/MessageInput/MessageInput';
import { addComment, asChannel, channelOf, commentsWord, useComments, type Comment } from '../../data/comments';
import { ME, authorColor, nameOf } from '../../data/contacts';
import { countText, myRole, useAllGroups, useGroup } from '../../data/groups';
import { useChat, useMessages } from '../../data/chatStore';
import { goBack } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import './ChatPage.css';
import './ChatCommentsPage.css';

/** Лицо автора комментария: контакт, вы сами или сообщество, от имени которого вы написали */
function useAuthor(author: string): { name: string; face: React.ReactNode; color: string } {
  const groups = useAllGroups();
  const mine = usePersonName(ME);
  const chatId = channelOf(author);
  if (chatId) {
    const g = groups.find((x) => x.chatId === chatId);
    return { name: g?.name ?? 'Сообщество', face: <Avatar src={g?.avatar} size={40} />, color: 'var(--color-accent)' };
  }
  return { name: author === ME ? mine : nameOf(author), face: <PersonAvatar id={author} size={40} presence={false} />, color: author === ME ? 'var(--color-accent)' : `var(--author-${authorColor(author)})` };
}

function CommentRow({ comment }: { comment: Comment }) {
  const { name, face, color } = useAuthor(comment.author);
  return (
    <li className="bubble bubble--in bubble--last ccm__comment">
      <span className="bubble__avatar ccm__face">{face}</span>
      <span className="bubble__author" style={{ '--author': color } as React.CSSProperties}>
        <span className="bubble__author-name">{name}</span>
      </span>
      {comment.text}
      <span className="bubble__meta bubble__meta--ghost" aria-hidden="true">
        <span className="bubble__time">{comment.time}</span>
      </span>
      <span className="bubble__meta">
        <span className="bubble__time">{comment.time}</span>
      </span>
    </li>
  );
}

/**
 * Комментарии под постом канала: пост, под ним комментарии как сообщения и поле ввода. Слева в поле — фото того, от чьего имени пишете
 * (вы или сообщество, где вы владелец или администратор); нажатие открывает выбор «Написать от имени…».
 */
export function ChatCommentsPage({ chatId, postId }: { chatId: string; postId: string }) {
  const chat = useChat(chatId);
  const info = useGroup(chatId);
  const groups = useMessages(chatId);
  const comments = useComments(chatId, postId);
  const all = useAllGroups();
  const post = useMemo(() => groups.flatMap((g) => g.messages).find((m) => m.id === postId), [groups, postId]);
  const [as, setAs] = useState(ME);
  const [picking, setPicking] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const back = () => goBack(`/chat/${chatId}`);
  useSwipeBack('.chat', !picking, back);

  // Сообщества, от имени которых можно писать: каналы, где вы владелец или администратор
  const communities = useMemo(() => all.filter((g) => g.kind === 'channel' && (myRole(g) === 'owner' || myRole(g) === 'admin')), [all]);
  const asName = useAuthor(as);

  // Новый комментарий: лента доезжает до конца
  const prev = useRef(comments.length);
  useEffect(() => {
    const el = list.current;
    if (el && comments.length > prev.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    prev.current = comments.length;
  }, [comments.length]);

  if (!chat || !info) return null;
  const mineAvatar = asName.face;

  return (
    <section className="chat ccm">
      <header className="chat__header">
        <div className="chat__top">
          <button type="button" className="chat__action" aria-label="Назад" onClick={back}>
            <IconBackMk />
          </button>
          <div className="chat__peer">
            <Avatar src={chat.avatar} alt="" />
            <div className="chat__who">
              <h1 className="chat__name">Комментарии</h1>
              <p className="chat__status">{chat.name}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="swipe-pager__page ccm__page">
        <div className="chat__feed">
          <div className="chat__messages" ref={list}>
            <ul className="chat__group chat__group--chan">
              {post && <MessageBubble message={post} peerName={chat.name} peerAvatar={chat.avatar} showMeta joinPrev={false} chatKind="channel" onReply={() => {}} onReact={() => {}} onMenu={() => {}} onQuoteClick={() => {}} onOpenTest={() => {}} onOpenTask={() => {}} onTestSettings={() => {}} onOpenLink={() => {}} onOpenAuthor={() => {}} />}
            </ul>
            <ul className="chat__group chat__group--grp ccm__list">
              <li className="chat__day">
                <span>{comments.length ? commentsWord(comments.length) : 'Комментариев пока нет…'}</span>
              </li>
              {comments.map((c) => (
                <CommentRow key={c.id} comment={c} />
              ))}
            </ul>
          </div>
        </div>
        <MessageInput
          placeholder="Комментарий"
          extras={false}
          active
          lead={
            <button type="button" className="ccm__as" aria-label={`Написать от имени: ${asName.name}`} aria-haspopup="dialog" onClick={() => setPicking(true)}>
              {mineAvatar}
            </button>
          }
          onSend={(text) => addComment(chatId, postId, as, text)}
        />
      </div>

      {picking && (
        <Frame title="Написать от имени…" onClose={() => setPicking(false)}>
          <Card>
            <Row
              role="radio"
              checked={as === ME}
              lead={<PersonAvatar id={ME} size={40} presence={false} />}
              title={<MyName />}
              note="Личный аккаунт"
              end={<RadioDot on={as === ME} />}
              onClick={() => {
                setAs(ME);
                setPicking(false);
              }}
            />
            {communities.map((g) => (
              <Row
                key={g.chatId}
                role="radio"
                checked={as === asChannel(g.chatId)}
                lead={<Avatar src={g.avatar} size={40} />}
                title={g.name}
                note={countText(g)}
                end={<RadioDot on={as === asChannel(g.chatId)} />}
                onClick={() => {
                  setAs(asChannel(g.chatId));
                  setPicking(false);
                }}
              />
            ))}
          </Card>
          {communities.length === 0 && <Hint>Сообщества, где вы владелец или администратор, появятся здесь: от их имени можно будет комментировать.</Hint>}
        </Frame>
      )}
    </section>
  );
}

function MyName() {
  return <>{usePersonName(ME)}</>;
}
