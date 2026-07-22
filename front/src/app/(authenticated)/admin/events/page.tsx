import { apiFetch } from "@/lib/api";
import type { InternalEvent } from "@/types/competition";
import EventManager from "./EventManager";

export default async function AdminEventsPage() {
  let events: InternalEvent[] = [];
  let error: string | null = null;
  try {
    events = await apiFetch("/api/competitions/internal-events");
  } catch {
    error = "イベントを取得できませんでした。";
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--brand-orange)",
            color: "var(--brand-orange)",
          }}
        >
          {error}
        </p>
      )}
      <EventManager events={events} />
    </div>
  );
}
