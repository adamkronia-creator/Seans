import { Badge } from '../Badge/Badge';
import './CollectionCaption.css';

export function CollectionCaption({ name, count }: { name: string; count: number }) {
  return (
    <span className="collection-caption">
      <span className="collection-caption__name">{name}</span>
      <Badge count={count} showZero />
    </span>
  );
}
