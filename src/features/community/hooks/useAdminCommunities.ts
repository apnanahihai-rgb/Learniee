"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

import type {
  AdminCommunityDetail,
  AdminCommunityMember,
  AdminCommunityPoll,
  AdminCommunityPayment,
  AdminCommunityPaymentsSummary,
  AdminCommunityRow,
  CommunityFormValues,
  CommunityStatus,
  PollFormValues,
} from "../types/community";

export type ActionResult = { ok: true } | { ok: false; error: string };

const BASE = "/api/admin/communities";

async function send(url: string, method: string, body?: unknown): Promise<ActionResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || "Something went wrong. Please try again." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Community request error:", err);

    return { ok: false, error: "Network error. Please try again." };
  }
}

function formBody(values: CommunityFormValues) {
  return {
    title: values.title,
    description: values.description,
    isPaid: values.isPaid,
    price: values.isPaid ? Number(values.price) : null,
  };
}

function pollBody(values: PollFormValues) {
  return {
    question: values.question,
    options: values.options,
    allowMultiple: values.allowMultiple,
    // The picker gives browser-local time; send an absolute instant so the server's timezone never matters.
    closesAt: values.closesAt ? new Date(values.closesAt).toISOString() : null,
  };
}

/** Admin's communities list. Data: GET /api/admin/communities. Refreshes live. */
export function useAdminCommunities() {
  const [communities, setCommunities] = useState<AdminCommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");

      const res = await fetch(BASE, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Failed to load communities.");

      setCommunities(data.communities ?? []);
    } catch (err) {
      console.error("Load communities error:", err);
      setError(err instanceof Error ? err.message : "Failed to load communities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [BASE] });

  const create = useCallback(
    async (values: CommunityFormValues) => {
      const result = await send(BASE, "POST", formBody(values));

      if (result.ok) await load();

      return result;
    },
    [load],
  );

  return { communities, loading, error, reload: load, create };
}

/** One community: details + files, and its members. Refreshes live. */
export function useAdminCommunity(communityId: string) {
  const [community, setCommunity] = useState<AdminCommunityDetail | null>(null);
  const [members, setMembers] = useState<AdminCommunityMember[]>([]);
  const [payments, setPayments] = useState<AdminCommunityPayment[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState<AdminCommunityPaymentsSummary | null>(null);
  const [polls, setPolls] = useState<AdminCommunityPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");

      const [detailRes, membersRes, paymentsRes, pollsRes] = await Promise.all([
        fetch(`${BASE}/${communityId}`, { cache: "no-store" }),
        fetch(`${BASE}/${communityId}/members`, { cache: "no-store" }),
        fetch(`${BASE}/${communityId}/payments`, { cache: "no-store" }),
        fetch(`${BASE}/${communityId}/polls`, { cache: "no-store" }),
      ]);
      const detail = await detailRes.json().catch(() => ({}));
      const membersData = await membersRes.json().catch(() => ({}));
      const paymentsData = await paymentsRes.json().catch(() => ({}));
      const pollsData = await pollsRes.json().catch(() => ({}));

      if (!detailRes.ok) throw new Error(detail.error || "Failed to load the community.");
      if (!membersRes.ok) throw new Error(membersData.error || "Failed to load members.");
      if (!paymentsRes.ok) throw new Error(paymentsData.error || "Failed to load payments.");
      if (!pollsRes.ok) throw new Error(pollsData.error || "Failed to load polls.");

      setCommunity(detail.community);
      setMembers(membersData.members ?? []);
      setPayments(paymentsData.payments ?? []);
      setPaymentsSummary(paymentsData.summary ?? null);
      setPolls(pollsData.polls ?? []);
    } catch (err) {
      console.error("Load community error:", err);
      setError(err instanceof Error ? err.message : "Failed to load the community.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [BASE] });

  const edit = useCallback(
    async (values: CommunityFormValues) => {
      const result = await send(`${BASE}/${communityId}`, "PATCH", formBody(values));

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const setStatus = useCallback(
    async (status: CommunityStatus) => {
      const result = await send(`${BASE}/${communityId}`, "PATCH", { status });

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const addFile = useCallback(
    async (file: { title: string; fileKey: string; fileName: string; contentType: string; sizeBytes: number }) => {
      const result = await send(`${BASE}/${communityId}/files`, "POST", file);

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      const result = await send(`${BASE}/${communityId}/files/${fileId}`, "DELETE");

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const result = await send(`${BASE}/${communityId}/members/${memberId}`, "DELETE");

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const createPoll = useCallback(
    async (values: PollFormValues) => {
      const result = await send(`${BASE}/${communityId}/polls`, "POST", pollBody(values));

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const closePoll = useCallback(
    async (pollId: string) => {
      const result = await send(`${BASE}/${communityId}/polls/${pollId}`, "PATCH", { status: "CLOSED" });

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  const deletePoll = useCallback(
    async (pollId: string) => {
      const result = await send(`${BASE}/${communityId}/polls/${pollId}`, "DELETE");

      if (result.ok) await load();

      return result;
    },
    [communityId, load],
  );

  return {
    community,
    members,
    payments,
    polls,
    createPoll,
    closePoll,
    deletePoll,
    paymentsSummary,
    loading,
    error,
    edit,
    setStatus,
    addFile,
    deleteFile,
    removeMember,
  };
}
