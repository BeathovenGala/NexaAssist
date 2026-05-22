"use client";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
};

export function ConfirmActionBar({ onConfirm, onCancel, disabled }: Props) {
  return (
    <div className="flex gap-2 border-t border-[var(--na-border)] bg-[var(--na-surface-elevated)] px-4 py-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className="na-btn-primary flex-1 text-sm"
      >
        Confirm
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onCancel}
        className="na-btn-secondary flex-1 text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
