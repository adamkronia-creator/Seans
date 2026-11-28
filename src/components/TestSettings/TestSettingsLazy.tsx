import { lazy, Suspense, type ComponentProps } from 'react';
import { ScreenSkeleton } from '../Skeleton/Skeleton';

/*
 * Настройки теста, бланк, пример заключения и прохождение — самая тяжелая часть кода, и нужна она не сразу.
 * Поэтому грузится отдельным файлом при первом открытии теста, а пока он идет — заготовка экрана.
 */
const Loaded = lazy(() => import('./TestSettings').then((m) => ({ default: m.TestSettings })));

export function TestSettings(props: ComponentProps<typeof Loaded>) {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Loaded {...props} />
    </Suspense>
  );
}
