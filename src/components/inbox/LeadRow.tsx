import { getInitials, getAvatarColor, relativeTime, STATUS_LABELS, STATUS_CLASSES, daysSince } from "@/lib/utils";
import type { Lead } from "@/types";

interface Props {
  lead: Lead & { days_since_contact?: number };
  selected: boolean;
  animDelay: number;
  onClick: () => void;
}

const BORDER_MAP: Record<string, string> = {
  urgent: "border-l-2 border-l-nudge-red",
  warm:   "border-l-2 border-l-nudge-amber",
  active: "border-l-2 border-l-accent",
  new:    "border-l-2 border-l-nudge-blue",
  won:    "border-l-2 border-l-accent",
  paused: "",
  lost:   "",
};

export function LeadRow({ lead, selected, animDelay, onClick }: Props) {
  const color = getAvatarColor(lead.id);
  const days  = lead.days_since_contact ?? daysSince(lead.last_contact_at);
  const stale = days >= 7;

  return (
    <div
      onClick={onClick}
      className={`
        group grid items-center gap-3.5 rounded-xl px-4 py-3.5 cursor-pointer
        transition-all duration-200
        ${BORDER_MAP[lead.status] ?? ""}
        ${selected ? "ring-1 ring-accent/30" : ""}
      `}
      style={{
        gridTemplateColumns: "40px 1fr auto",
        background: selected ? "rgba(168,240,122,0.05)" : "var(--bg2)",
        border: selected ? "1px solid rgba(168,240,122,0.3)" : "1px solid rgba(255,255,255,0.07)",
        opacity: 0,
        animation: `fadeUp 0.3s ease ${animDelay}s forwards`,
        transform: "translateX(0)",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
      }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold font-display flex-shrink-0"
        style={{
          background: color.bg,
          border: `1px solid ${color.border}`,
          color: color.text,
        }}
      >
        {getInitials(lead.name)}
      </div>

      {/* Meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[14px] font-semibold" style={{ color: "var(--bright)" }}>
            {lead.name}
          </span>
          {stale && (
            <span
              className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
              style={{ background: "var(--accent)", boxShadow: "0 0 5px var(--accent)", animation: "pulseDot 2s infinite" }}
            />
          )}
        </div>
        <p
          className="text-[12px] truncate max-w-[380px]"
          style={{ color: "var(--muted)" }}
        >
          {lead.note ?? "No note yet."}
        </p>
      </div>

      {/* Right col */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          {lead.last_contact_at ? relativeTime(lead.last_contact_at) : "Never contacted"}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_CLASSES[lead.status] ?? STATUS_CLASSES.new}`}>
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
      </div>
    </div>
  );
}
