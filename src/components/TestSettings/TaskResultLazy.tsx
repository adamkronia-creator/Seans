import { lazy, Suspense, type ComponentProps } from 'react';
import { ScreenSkeleton } from '../Skeleton/Skeleton';

const Loaded = lazy(() => import('./TaskResult').then((m) => ({ default: m.TaskResult })));

/** Результат задания грузится отдельным файлом при первом открытии; пока он идет — заготовка экрана */
export function TaskResult(props: ComponentProps<typeof Loaded>) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Loaded {...props} />
    </Suspense>
  );
}
