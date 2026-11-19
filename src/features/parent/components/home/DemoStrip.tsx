import Link from "next/link";
import { Video } from "lucide-react";

import DemoStripRow, { LockedDemoButton } from "@/features/shared/components/home/DemoStripRow";

import { BTN_PRI } from "./HomeBits";
import { countdown, inKid, isLive, whenLabel, type LearnerFilter } from "./homeLogic";
import type { HomeData, HomeSession } from "./homeTypes";

interface Props {
  data: HomeData;
  filter: LearnerFilter;
  now: Date;
  /** The session already shown in the hero (so we don't repeat it). */
  heroSession: HomeSession | undefined;
}

/** Compact line for the next demo when it isn't the hero. */
export default function DemoStrip({ data, filter, now, heroSession }: Props) {
  const demos = data.sessions
    .filter((s) => s.kind === "demo" && inKid(filter, s.kidId) && isLive(s, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const next = demos[0];
  if (!next || heroSession?.id === next.id) return null;

  const cd = countdown(next.start, now);
  const kid = data.kids.find((k) => k.id === next.kidId);
  const more = demos.length - 1;
  const canJoin = cd.open && next.hasLink;

  return (
    <DemoStripRow
      href="/parent/my-classes?tab=demos"
      title={`Demo: ${next.title}`}
      subtitle={
        <>
          {kid?.first} ·{" "}
          {cd.open ? (next.hasLink ? cd.text : "Link not ready yet") : whenLabel(next.start, now)}
          {more > 0 ? ` · +${more} more` : ""}
        </>
      }
      action={
        canJoin ? (
          <Link href={next.href} className={`${BTN_PRI} shrink-0`}>
            <Video size={16} />
            Join demo
          </Link>
        ) : (
          <LockedDemoButton label="Join demo" />
        )
      }
    />
  );
}
