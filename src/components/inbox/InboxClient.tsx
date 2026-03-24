"use client";

import { useState, useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useToast } from "@/hooks/useToast";
import { LeadRow } from "@/components/inbox/LeadRow";
import { DetailPanel } from "@/components/inbox/DetailPanel";
import { AddLeadModal } from "@/components/inbox/AddLeadModal";
import { Toast } from "@/components/ui/Toast";
import {
  daysSince,
  STATUS_LABELS,
} from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types";

type FilterTab = "all" | "urgent" | "active" | "new";

interface Props {
  initialLeads: Lead[];
}

export function InboxClient({ initialLeads }: Props) {
  const { leads, loading, error, createLead, updateLead, deleteLead } =
    useLeads(initialLeads);
  const { toast, show: showToast } = useToast();

  const [filter, setFilter]           = useState<FilterTab>("all");
  const [search, setSearch]           = useState("");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Derived: leads enriched with days_since_contact
  const enriched = useMemo(
    () =>
      leads.map((l) => ({
        ...l,
        days_since_contact: daysSince(l.last_contact_at),
      })),
    [leads]
  );

  // Filtered + searched list
  const visible = useMemo(() => {
    let list = enriched;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.note ?? "").toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case "urgent":
        return list.filter((l) => l.days_since_contact >= 14 || l.status === "urgent");
      case "active":
        return list.filter((l) => l.status === "active" || l.status === "warm");
      case "new":
        return list.filter((l) => l.status === "new");
      default:
        return list;
    }
  }, [enriched, filter, search]);

  // Tab counts
  const counts = useMemo(() => ({
    all:    leads.length,
    urgent: enriched.filter((l) => l.days_since_contact >= 14 || l.status === "urgent").length,
    active: enriched.filter((l) => l.status === "active" || l.status === "warm").length,
    new:    enriched.filter((l) => l.status === "new").length,
  }), [enriched, leads.length]);

  const selectedLead = enriched.find((l) => l.id === selectedId) ?? null;

  // ── Handlers ────────────────────────────────────────────────

  async function handleCreate(input: { name: string; email: string; note: string }) {
    const lead = await createLead(input);
    if (lead) {
      setShowModal(false);
      setSelectedId(lead.id);
      showToast("✅", `${lead.name} added to your inbox`);
    }
  }

  async function handleUpdate(id: string, patch: Partial<Lead>) {
    const ok = await updateLead(id, patch);
    if (ok) showToast("💾", "Saved");
  }

  async function handleDelete(id: string) {
    await deleteLead(id);
    setSelectedId(null);
    showToast("🗑️", "Lead removed");
  }

  async function handleStatusChange(id: string, status: LeadStatus) {
    await updateLead(id, { status });
    showToast("✅", `Status: ${STATUS_LABELS[status] ?? status}`);
  }

  // Nudge banner — first stale lead
  const staleLead = useMemo(
    () => enriched.find((l) => l.days_since_contact >= 7 && l.status !== "won" && l.status !== "paused"),
    [enriched]
  );

  const tierPct = Math.min((leads.length / 10) * 100, 100);

  return (
    <>
      {/* ── INBOX HEADER (sticky) ── */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(12,12,10,0.92)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}
      >
        {/* Title row */}
        <div className="flex items-center gap-3 px-8 pt-6 pb-0">
          <h1 className="font-display text-2xl font-black tracking-tight" style={{ color: "var(--bright)" }}>
            Lead Inbox
          </h1>
          <span
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            {leads.length} {leads.length === 1 ? "lead" : "leads"}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => {
              if (leads.length >= 10) {
                showToast("⭐", "Free tier full — upgrade to Starter for unlimited leads");
                return;
              }
              setShowModal(true);
            }}
            className="btn-primary text-[13px] py-2 px-4"
          >
            + Add lead
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-8 mt-4">
          {(["all", "urgent", "active", "new"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium transition-all duration-150 border-b-2"
              style={{
                color: filter === tab ? "var(--bright)" : "var(--muted)",
                borderBottomColor: filter === tab ? "var(--accent)" : "transparent",
                background: "transparent",
                border: "none",
                borderBottom: filter === tab ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {tab === "all" ? "All" : tab === "urgent" ? "Follow-up needed" : tab === "active" ? "Active" : "New"}
              <span
                className="px-1.5 py-px rounded-lg text-[10px] font-bold"
                style={{
                  background: filter === tab ? "rgba(168,240,122,0.15)" : "rgba(255,255,255,0.06)",
                  color: filter === tab ? "var(--accent)" : "var(--muted)",
                }}
              >
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SEARCH ROW ── */}
      <div className="flex items-center gap-3 px-8 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex-1 flex items-center gap-2.5 rounded-lg px-3.5 py-2"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--muted)", fontSize: 14 }}>🔍</span>
          <input
            className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder:text-nudge-muted"
            style={{ color: "var(--text)", fontFamily: "DM Sans, sans-serif" }}
            placeholder="Search leads by name or note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-nudge-muted hover:text-text text-[13px]"
              style={{ color: "var(--muted)" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── NUDGE BANNER ── */}
      {staleLead && !bannerDismissed && (
        <div
          className="flex items-start gap-3 mx-8 mt-3.5 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(168,240,122,0.06)",
            border: "1px solid rgba(168,240,122,0.18)",
          }}
        >
          <span className="text-lg flex-shrink-0">🔔</span>
          <p className="text-[13px] flex-1 leading-relaxed" style={{ color: "var(--text)" }}>
            <strong style={{ color: "var(--bright)" }}>Today&apos;s nudge:</strong>{" "}
            <span style={{ color: "var(--accent)" }}>{staleLead.name}</span> —{" "}
            {staleLead.note ? staleLead.note.slice(0, 80) + (staleLead.note.length > 80 ? "…" : "") : "No note yet."}{" "}
            Last contact: {staleLead.last_contact_at ?? "unknown"}.
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-nudge-muted hover:text-text flex-shrink-0 text-base"
            style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── FREE TIER BAR ── */}
      <div
        className="flex items-center gap-3 mx-8 mt-2.5 px-3.5 py-2.5 rounded-lg"
        style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
      >
        <span className="text-[11px] flex-shrink-0" style={{ color: "var(--muted)" }}>Free tier</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg3)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${tierPct}%`, background: tierPct >= 100 ? "var(--amber)" : "var(--accent)" }}
          />
        </div>
        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--text)" }}>
          {leads.length} / 10
        </span>
        <button
          onClick={() => showToast("⭐", "Upgrade to Starter — €19/month · unlimited leads")}
          className="text-[11px] font-semibold underline underline-offset-2 flex-shrink-0"
          style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          Upgrade →
        </button>
      </div>

      {/* ── LEAD LIST ── */}
      <div className="flex flex-col gap-0.5 px-8 py-3.5">
        {error && (
          <div className="text-sm py-2 px-4 rounded-lg mb-2" style={{ background: "rgba(240,122,122,0.1)", color: "var(--red)" }}>
            {error}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4 opacity-40">{search ? "🔍" : "📋"}</div>
            <h3 className="font-display text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
              {search ? "No leads found" : "Your inbox is empty"}
            </h3>
            <p className="text-[13px] max-w-[260px] leading-relaxed" style={{ color: "var(--muted)" }}>
              {search
                ? "Try a different search term."
                : "Add your first lead to get started."}
            </p>
            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary mt-6 text-[13px] py-2.5 px-5"
              >
                + Add your first lead
              </button>
            )}
          </div>
        ) : (
          visible.map((lead, i) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              selected={selectedId === lead.id}
              animDelay={i * 0.04}
              onClick={() => setSelectedId(lead.id === selectedId ? null : lead.id)}
            />
          ))
        )}
      </div>

      {/* ── DETAIL PANEL (slide-in) ── */}
      <DetailPanel
        lead={selectedLead}
        onClose={() => setSelectedId(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onToast={showToast}
      />

      {/* ── ADD MODAL ── */}
      {showModal && (
        <AddLeadModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
          loading={loading}
        />
      )}

      {/* ── TOAST ── */}
      <Toast icon={toast.icon} message={toast.message} visible={toast.visible} />
    </>
  );
}
