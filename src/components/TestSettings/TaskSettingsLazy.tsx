import { lazy, Suspense, type ComponentProps } from 'react';
import { ScreenSkeleton } from '../Skeleton/Skeleton';

const Loaded = lazy(() => import('./TaskSettings').then((m) => ({ default: m.TaskSettings })));

/** Настройки задания грузятся отдельным файлом при первом открытии; пока он идет — заготовка экрана */
export function TaskSettings(props: ComponentProps<typeof Loaded>) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Loaded {...props} />
    </Suspense>
  );
}
