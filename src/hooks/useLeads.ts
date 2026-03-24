"use client";

import { useState, useCallback } from "react";
import type { Lead, CreateLeadInput, UpdateLeadInput } from "@/types";

export function useLeads(initial: Lead[]) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Create a new lead */
  const createLead = useCallback(async (input: CreateLeadInput): Promise<Lead | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create lead");
        return null;
      }
      const newLead: Lead = json.data;
      setLeads((prev) => [newLead, ...prev]);
      return newLead;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Update a lead */
  const updateLead = useCallback(async (id: string, input: UpdateLeadInput): Promise<boolean> => {
    setError(null);
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...input } : l))
    );
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update lead");
        // Revert optimistic update by refetching
        await refetch();
        return false;
      }
      // Update with server response (has updated_at etc.)
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? json.data : l))
      );
      return true;
    } catch {
      setError("Network error");
      await refetch();
      return false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Soft-delete a lead */
  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    // Optimistic remove
    setLeads((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to delete lead");
        await refetch();
        return false;
      }
      return true;
    } catch {
      setError("Network error");
      await refetch();
      return false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Re-fetch all leads from server */
  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  return { leads, loading, error, createLead, updateLead, deleteLead, refetch };
}
