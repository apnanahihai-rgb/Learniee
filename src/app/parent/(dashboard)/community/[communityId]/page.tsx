"use client";

import { useParams } from "next/navigation";

import ParentCommunityDetail from "@/features/community/components/ParentCommunityDetail";

export default function ParentCommunityDetailPage() {
  const { communityId } = useParams<{ communityId: string }>();

  return <ParentCommunityDetail communityId={communityId} />;
}
