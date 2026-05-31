import { UilTrashAlt } from "@iconscout/react-unicons";

/** Form submit silme butonu — açık kırmızı çöp ikonu. */
export function DeleteButton({ label = "Delete" }: { label?: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-danger/70 transition-colors hover:bg-danger/12 hover:text-danger"
    >
      <UilTrashAlt size={18} />
    </button>
  );
}
