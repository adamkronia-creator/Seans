import { useState } from 'react';
import { PhotoTabs, PHOTO_PATHS, PHOTO_VIEWS, type PhotoView } from '../../components/Profile/PhotoTabs';
import { SwipePager } from '../../components/SwipePager/SwipePager';
import { useProfile } from '../../data/profile';
import { useOwnStories } from '../../data/stories';
import { goBack, replace, useRoute } from '../../router';
import { PhotosPage } from './PhotosPage';
import { StoryArchive } from './StoryArchive';

export function PhotoGallery() {
  const { path, prev } = useRoute();
  const { photos, albums } = useProfile();
  const stories = useOwnStories();
  const [chrome, setChrome] = useState<HTMLDivElement | null>(null);
  const view = PHOTO_VIEWS.find((id) => PHOTO_PATHS[id] === path.replace(/\/$/, ''))
    ?? PHOTO_VIEWS.find((id) => PHOTO_PATHS[id] === prev)
    ?? 'photos';
  const switchView = (next: PhotoView) => replace(PHOTO_PATHS[next]);

  return (
    <section className="fp ph ph-gallery">
      <div ref={setChrome} className="ph-gallery__chrome" />
      <div className="fp__scroll ph__scroll ph-gallery__scroll">
        <PhotoTabs value={view} onChange={switchView} photos={photos.length} albums={albums.length} stories={stories.length} />
        <SwipePager
          autoHeight
          animateHeight
          className="ph-gallery__pager"
          index={PHOTO_VIEWS.indexOf(view)}
          onIndexChange={(index) => switchView(PHOTO_VIEWS[index])}
          onEdgeSwipe={(direction) => { if (direction === -1) goBack('/'); }}
          pages={PHOTO_VIEWS.map((id) => {
            const gallery = { chromeHost: view === id ? chrome : null };
            return {
              key: id,
              node: id === 'stories' ? <StoryArchive gallery={gallery} /> : <PhotosPage view={id} gallery={gallery} />,
            };
          })}
        />
      </div>
    </section>
  );
}
