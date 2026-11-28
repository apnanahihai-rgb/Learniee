"use client";

import Link from "next/link";
import { useState } from "react";
import { UsersRound } from "lucide-react";

import { GridSkeleton, PdEmpty, pillFilter } from "@/features/parent/components/courses/pdUi";

import { useParentCommunities } from "../hooks/useParentCommunities";
import { formatPrice } from "../utils/format";
import ParentCommunityActions from "./ParentCommunityActions";

type Filter = "all" | "joined";

/**
 * Parent → Community: every visible community, join free ones, leave, open.
 * Data: GET /api/parent/communities (verified Parent auth).
 */
export default function ParentCommunityList() {
  const { communities, loading, error, join, leave, pay } = useParentCommunities();
  const [filter, setFilter] = useState<Filter>("all");

  const joinedCount = communities.filter((c) => c.isMember).length;
  const shown = filter === "joined" ? communities.filter((c) => c.isMember) : communities;

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <header>
        <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink sm:text-[32px]">
          Community
        </h1>
        <p className="text-sm text-pd-ink3">
          Join a community to get free ebooks, notes and study material shared by Learniee.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={pillFilter(filter === "all")} onClick={() => setFilter("all")}>
          All ({communities.length})
        </button>
        <button type="button" className={pillFilter(filter === "joined")} onClick={() => setFilter("joined")}>
          Joined ({joinedCount})
        </button>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-pd-red">{error}</p>}

      <div className="mt-5">
        {loading ? (
          <GridSkeleton count={6} height={190} />
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty
              icon={UsersRound}
              title={filter === "joined" ? "You have not joined any community yet" : "No communities yet"}
              text={
                filter === "joined"
                  ? "Join one from the All tab to see its files here."
                  : "New communities will show up here as soon as they are created."
              }
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3">
            {shown.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-2xl border border-pd-line bg-white p-5 shadow-[0_1px_2px_rgba(23,23,43,0.04)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/parent/community/${c.id}`}
                    className="font-heading text-[18px] font-semibold text-pd-ink hover:text-pd-brand"
                  >
                    {c.title}
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      c.isPaid ? "bg-[#fff4d6] text-[#8a5a00]" : "bg-[#e7f6ee] text-[#1b7a4b]"
                    }`}
                  >
                    {c.isPaid ? `Paid · ${formatPrice(c.price)}` : "Free"}
                  </span>
                </div>

                <p className="line-clamp-3 text-sm text-pd-ink2">{c.description}</p>

                <p className="mt-auto text-[13px] font-semibold text-pd-ink3">
                  {c.fileCount} {c.fileCount === 1 ? "file" : "files"} · {c.memberCount}{" "}
                  {c.memberCount === 1 ? "member" : "members"}
                </p>

                <ParentCommunityActions
                  community={c}
                  onJoin={() => join(c.id)}
                  onLeave={() => leave(c.id)}
                  onPay={() => pay(c)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
