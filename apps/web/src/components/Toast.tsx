import { Icon } from './Icons';

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <div className="toast-inner">
        <Icon name="check" size={14} />
        <span>{message}</span>
      </div>
    </div>
  );
}
