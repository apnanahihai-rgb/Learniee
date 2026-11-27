"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Megaphone, MessageCircle, UsersRound } from "lucide-react";

import { PD_BTN_PRI, PD_INPUT, PdEmpty, pillFilter } from "@/features/parent/components/courses/pdUi";
import PdErrorState from "@/features/shared/components/PdErrorState";
import TeacherHomeworkPanel from "@/features/teacher/components/homework/TeacherHomeworkPanel";
import { useGroupClass } from "@/features/teacher/hooks/useGroupClass";
import { TD_CARD } from "./TeacherUi";

type Tab = "homework" | "announcements" | "students";

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "homework", label: "Homework", icon: BookOpen },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "students", label: "Students & chat", icon: UsersRound },
];

/**
 * My classes > Group classes > one group: homework for everyone, announcements
 * to the whole group, and a private 1:1 chat per student.
 */
export default function GroupWorkspace({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const { title, students, announcements, loading, error, broadcast, reload } = useGroupClass(courseId);

  const [tab, setTab] = useState<Tab>("homework");
  const [viewing, setViewing] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const activeEnrollmentId = viewing || students[0]?.enrollmentId || "";

  async function handleSend() {
    const body = draft.trim();

    if (!body || sending) return;

    setSending(true);
    setSendError("");

    const err = await broadcast(body);

    if (err) setSendError(err);
    else setDraft("");

    setSending(false);
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-semibold text-pd-brand"
      >
        <ArrowLeft size={14} /> All group classes
      </button>

      <h2 className="mt-2 font-heading text-[22px] font-semibold text-pd-ink">{title || "Group class"}</h2>
      <p className="text-sm text-pd-ink3">
        {loading ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"} enrolled`}
      </p>

      {error && !loading ? (
        <div className="mt-4">
          <PdErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`${pillFilter(tab === id)} inline-flex items-center gap-1.5`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className={`${TD_CARD} mt-4 p-4 sm:p-5`}>
            {tab === "homework" &&
              (students.length === 0 ? (
                <PdEmpty
                  icon={BookOpen}
                  title="No students yet"
                  text="Homework can be assigned once at least one student's enrollment is active."
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-pd-ink3">
                    Homework you assign here goes to every student in this group. Each student
                    submits their own work — pick a student to see their submission.
                  </p>
                  <select
                    value={activeEnrollmentId}
                    onChange={(e) => setViewing(e.target.value)}
                    className={PD_INPUT}
                    aria-label="Student"
                  >
                    {students.map((s) => (
                      <option key={s.enrollmentId} value={s.enrollmentId}>
                        {s.studentName}
                      </option>
                    ))}
                  </select>
                  <TeacherHomeworkPanel key={activeEnrollmentId} enrollmentId={activeEnrollmentId} />
                </div>
              ))}

            {tab === "announcements" && (
              <div className="space-y-4">
                <p className="text-sm text-pd-ink3">
                  An announcement reaches every parent in this group. Their replies come to you as
                  private one-on-one chats.
                </p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  placeholder="Write an announcement for the whole group…"
                  className={`${PD_INPUT} h-auto py-2`}
                />
                {sendError && <p className="text-xs font-bold text-pd-red">{sendError}</p>}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || !draft.trim() || students.length === 0}
                  className={`${PD_BTN_PRI} disabled:opacity-50`}
                >
                  <Megaphone size={16} />
                  {sending ? "Sending…" : "Send to everyone"}
                </button>

                <div className="space-y-2 border-t border-pd-line pt-4">
                  {announcements.length === 0 ? (
                    <p className="text-sm text-pd-ink3">No announcements sent yet.</p>
                  ) : (
                    announcements.map((a) => (
                      <div key={a.id} className="rounded-xl bg-pd-b50 px-3 py-2">
                        <p className="whitespace-pre-wrap break-words text-sm text-pd-ink">{a.body}</p>
                        <p className="mt-1 text-[11px] text-pd-ink3">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === "students" &&
              (students.length === 0 ? (
                <PdEmpty icon={UsersRound} title="No students yet" text="Enrolled students appear here." />
              ) : (
                <ul className="divide-y divide-pd-line">
                  {students.map((s) => (
                    <li key={s.enrollmentId} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm font-semibold text-pd-ink">{s.studentName}</span>
                      {s.chatRoomId && (
                        <Link
                          href={`/teacher/chat/${s.chatRoomId}`}
                          className="inline-flex items-center gap-1 rounded-full bg-pd-b50 px-3 py-1.5 text-xs font-bold text-pd-brand-d hover:bg-pd-b100"
                        >
                          <MessageCircle size={13} /> Chat privately
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
