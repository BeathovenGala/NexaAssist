export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
      role="alert"
    >
      {message}
    </p>
  );
}
