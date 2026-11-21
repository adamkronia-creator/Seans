import { useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { CURRENT_USER } from '../../data/chats';
import { STORY_BACKGROUNDS, type Story } from '../../data/stories';
import { useLayer } from '../../utils/layer';
import { StoryComposer, StoryViewer } from '../Stories/Stories';
import { IconCheck } from './ProfileIcons';
import './StoryMedia.css';

export function StoryTile({ story, onClick, selected }: {
  story: Story;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      className="story-tile"
      onClick={onClick}
      aria-label={story.text}
      aria-pressed={selected}
      style={{ background: STORY_BACKGROUNDS[story.bg] }}
    >
      <span className="story-tile__text">{story.text}</span>
      {selected && <span className="pf-check" aria-hidden="true"><IconCheck /></span>}
    </button>
  );
}

export function useOwnStoryMedia(stories: Story[]) {
  const { element } = useLayer();
  const [composing, setComposing] = useState(false);
  const [viewing, setViewing] = useState<{ index: number; origin: { x: number; y: number } } | null>(null);

  const open = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    const index = stories.findIndex((story) => story.id === id);
    if (index < 0 || !element) return;
    const from = event.currentTarget.getBoundingClientRect();
    const to = element.getBoundingClientRect();
    setViewing({ index, origin: { x: from.left + from.width / 2 - to.left, y: from.top + from.height / 2 - to.top } });
  };
  const closeComposer = () => setComposing(false);
  const overlay = element && (
    composing ? createPortal(<StoryComposer onClose={closeComposer} onDone={closeComposer} />, element) :
    viewing && stories.length > 0 && createPortal(
      <StoryViewer
        queue={[{ id: 'me', name: CURRENT_USER.name, stories }]}
        startId="me"
        startStory={viewing.index}
        origin={viewing.origin}
        onClose={() => setViewing(null)}
      />,
      element,
    )
  );

  return { open, compose: () => setComposing(true), overlay };
}
