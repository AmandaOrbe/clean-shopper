import type { FC, ReactNode } from 'react';
import Button from './Button';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
  heading: string;
  message: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

const EmptyState: FC<EmptyStateProps> = ({ heading, message, action, icon }) => {
  return (
    <div className="flex flex-col items-center text-center gap-space-lg py-space-4xl px-space-2xl">
      {icon && <div className="mb-space-sm">{icon}</div>}
      <p className="text-h3 text-neutral-900">{heading}</p>
      <p className="text-body text-neutral-600 max-w-sm">{message}</p>
      {action && (
        <Button variant="primary" label={action.label} onClick={action.onClick} />
      )}
    </div>
  );
};

export default EmptyState;
