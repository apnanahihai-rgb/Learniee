"use client";

import { useParams } from "next/navigation";

import AdminCommunityDetail from "@/features/community/components/AdminCommunityDetail";

export default function AdminCommunityPage() {
  const { communityId } = useParams<{ communityId: string }>();

  return <AdminCommunityDetail communityId={communityId} />;
}
