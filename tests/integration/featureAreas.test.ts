import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ComplaintDepartment, ComplainantRole } from "@prisma/client";
import { ChatError, getRoomForAccess, listMessages, sendMessage } from "@/features/chat/server/chat.service";
import { reportChatMessage } from "@/features/chat/server/chatReport.service";
import {
  createComplaint,
  listComplaintsForAdmin,
  listComplaintsForDepartment,
  listComplaintsForRaiser,
  respondToComplaint,
} from "@/features/shared/server/complaint.service";
import { createClassRequest, cancelClassRequestByParent } from "@/features/shared/server/classRequest.service";
import { prisma } from "@/lib/prisma";
import { createSessionFixture, resetDb } from "../helpers/db";

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function room() {
  const f = await createSessionFixture({});
  const chat = await prisma.chatRoom.create({
    data: {
      enrollmentId: f.enrollment.id,
      parentId: f.parent.id,
      teacherId: f.teacher.id,
      courseId: f.course.id,
      studentId: f.student.id,
    },
  });
  return { ...f, chat };
}

describe("Chat: phone masking", () => {
  it("a phone number is masked in the saved message; the original is kept for Admin only", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "Call me on 9876543210 please" });
    expect(msg.body).not.toContain("9876543210");
    expect(msg.containsPhoneNumber).toBe(true);
    const row = await prisma.chatMessage.findUniqueOrThrow({ where: { id: msg.id } });
    expect(row.originalBody).toContain("9876543210");
    expect(row.body).not.toContain("9876543210");
    expect(await prisma.activityLog.count({ where: { action: "CHAT_PHONE_NUMBER_FLAGGED" } })).toBeGreaterThanOrEqual(1);
  });

  it("the other side's message list never contains the number or the original", async () => {
    const f = await room();
    await sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "my number is +91 98765 43210" });
    const list = await listMessages(f.chat.id); // what Parent/Teacher routes return (no includeOriginal)
    const text = JSON.stringify(list);
    expect(text).not.toContain("98765");
    expect(text).not.toContain("originalBody");
  });

  it("an ordinary message is stored as typed, with no flag", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "Please revise chapter 5 (pages 12-20)." });
    expect(msg.body).toBe("Please revise chapter 5 (pages 12-20).");
    expect(msg.containsPhoneNumber).toBe(false);
    const row = await prisma.chatMessage.findUniqueOrThrow({ where: { id: msg.id } });
    expect(row.originalBody).toBeNull();
  });

  it("empty, over-long and someone-else's-room messages are refused", async () => {
    const f = await room();
    const other = await createSessionFixture({});
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "   " })).rejects.toBeInstanceOf(ChatError);
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "x".repeat(4001) })).rejects.toBeInstanceOf(ChatError);
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: other.parent.id, body: "hi" })).rejects.toMatchObject({ status: 403 });
  });

  it("no message can be sent once the enrollment is cancelled/rejected", async () => {
    const f = await room();
    await prisma.enrollment.update({ where: { id: f.enrollment.id }, data: { status: "CANCELLED" } });
    await expect(sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "hello" })).rejects.toMatchObject({ status: 409 });
  });

  it("a parent cannot read another parent's room", async () => {
    const f = await room();
    const other = await createSessionFixture({});
    await expect(getRoomForAccess(f.chat.id, { role: "PARENT", actorId: other.parent.id })).rejects.toMatchObject({ status: 403 });
    await expect(getRoomForAccess(f.chat.id, { role: "PARENT", actorId: f.parent.id })).resolves.toBeTruthy();
  });
});

describe("Chat: reporting a message", () => {
  it("the other party can report once; a second report is refused", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "Pay me directly instead" });
    await reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id, reason: "asks for off-platform payment" });
    await expect(
      reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await prisma.chatMessageReport.count({ where: { chatMessageId: msg.id } })).toBe(1);
  });

  it("you cannot report your own message", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "PARENT", senderId: f.parent.id, body: "hello there" });
    await expect(
      reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id }),
    ).rejects.toBeInstanceOf(ChatError);
  });

  it("someone outside the room cannot report in it", async () => {
    const f = await room();
    const stranger = await createSessionFixture({});
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "hello there" });
    await expect(
      reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: stranger.parent.id }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("reporting still works after the enrollment ended (a safety action)", async () => {
    const f = await room();
    const msg = await sendMessage({ roomId: f.chat.id, senderRole: "TEACHER", senderId: f.teacher.id, body: "last message" });
    await prisma.enrollment.update({ where: { id: f.enrollment.id }, data: { status: "CANCELLED" } });
    const r = await reportChatMessage({ roomId: f.chat.id, messageId: msg.id, reporterRole: "PARENT", reporterId: f.parent.id });
    expect(r.id).toBeTruthy();
  });
});

describe("Complaints: department routing", () => {
  it("a complaint goes to the chosen department and only that department's staff (and Admin) see it", async () => {
    const f = await createSessionFixture({});
    const c = await createComplaint({
      raiserId: f.parent.id, raiserRole: ComplainantRole.PARENT,
      subject: "Charged twice", description: "I was charged twice for the same class.", department: "ACCOUNTS",
    });
    expect(c.department).toBe("ACCOUNTS");
    expect(c.status).toBe("OPEN");
    expect((await listComplaintsForDepartment(ComplaintDepartment.ACCOUNTS)).map((x) => x.id)).toContain(c.id);
    expect((await listComplaintsForDepartment(ComplaintDepartment.HR)).map((x) => x.id)).not.toContain(c.id);
    expect((await listComplaintsForDepartment(ComplaintDepartment.IT)).map((x) => x.id)).not.toContain(c.id);
    expect((await listComplaintsForAdmin()).map((x) => x.id)).toContain(c.id);
  });

  it("a raiser only sees their own complaints", async () => {
    const a = await createSessionFixture({});
    const b = await createSessionFixture({});
    const ca = await createComplaint({ raiserId: a.parent.id, raiserRole: ComplainantRole.PARENT, subject: "A's issue", description: "details", department: "IT" });
    const mine = await listComplaintsForRaiser(b.parent.id, ComplainantRole.PARENT);
    expect(mine.map((x) => x.id)).not.toContain(ca.id);
  });

  it("validation: missing subject, missing description, unknown department, over-long subject", async () => {
    const f = await createSessionFixture({});
    const base = { raiserId: f.parent.id, raiserRole: ComplainantRole.PARENT, subject: "s", description: "d", department: "HR" };
    await expect(createComplaint({ ...base, subject: "  " })).rejects.toThrow();
    await expect(createComplaint({ ...base, description: "" })).rejects.toThrow();
    await expect(createComplaint({ ...base, department: "SALES" })).rejects.toThrow();
    await expect(createComplaint({ ...base, subject: "x".repeat(151) })).rejects.toThrow();
  });

  it("staff of another department cannot move a complaint; Admin and its own department can; resolved is final", async () => {
    const f = await createSessionFixture({});
    const c = await createComplaint({ raiserId: f.parent.id, raiserRole: ComplainantRole.PARENT, subject: "Tech issue", description: "app crashes", department: "IT" });
    await expect(respondToComplaint({ complaintId: c.id, scopeDepartment: ComplaintDepartment.HR, status: "RESOLVED" })).rejects.toMatchObject({ status: 404 });
    expect((await prisma.complaint.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("OPEN");

    await respondToComplaint({ complaintId: c.id, scopeDepartment: ComplaintDepartment.IT, status: "IN_PROGRESS" });
    const done = await respondToComplaint({ complaintId: c.id, status: "RESOLVED", adminNote: "Fixed in the next release" });
    expect(done.status).toBe("RESOLVED");
    expect(done.resolvedAt).not.toBeNull();
    await expect(respondToComplaint({ complaintId: c.id, status: "CLOSED" })).rejects.toMatchObject({ status: 409 });
  });
});

describe("Class requests", () => {
  const base = (studentId?: string) => ({
    studentId,
    title: "Need a French tutor",
    subject: "French",
    grade: "Grade 5",
    preferredDays: [1, 3],
    preferredTime: "17:00",
    description: "Beginner level, conversational.",
  });

  it("a valid request starts as PENDING_REVIEW", async () => {
    const f = await createSessionFixture({});
    const r = await createClassRequest(f.parent.id, base(f.student.id));
    expect(r.status).toBe("PENDING_REVIEW");
  });

  it("grade, days and a valid time are required", async () => {
    const f = await createSessionFixture({});
    await expect(createClassRequest(f.parent.id, { ...base(f.student.id), grade: null })).rejects.toThrow();
    await expect(createClassRequest(f.parent.id, { ...base(f.student.id), preferredDays: [] })).rejects.toThrow();
    await expect(createClassRequest(f.parent.id, { ...base(f.student.id), preferredTime: "25:99" })).rejects.toThrow();
  });

  it("another parent's child cannot be attached", async () => {
    const f = await createSessionFixture({});
    const other = await createSessionFixture({});
    await expect(createClassRequest(f.parent.id, base(other.student.id))).rejects.toMatchObject({ status: 404 });
  });

  it("at most 5 requests can wait for review at once", async () => {
    const f = await createSessionFixture({});
    for (let i = 0; i < 5; i++) await createClassRequest(f.parent.id, base(f.student.id));
    await expect(createClassRequest(f.parent.id, base(f.student.id))).rejects.toThrow();
  });

  it("a parent can cancel their own pending request but not someone else's", async () => {
    const f = await createSessionFixture({});
    const other = await createSessionFixture({});
    const r = await createClassRequest(f.parent.id, base(f.student.id));
    await expect(cancelClassRequestByParent(other.parent.id, r.id)).rejects.toThrow();
    await cancelClassRequestByParent(f.parent.id, r.id);
    expect((await prisma.classRequest.findUniqueOrThrow({ where: { id: r.id } })).status).not.toBe("PENDING_REVIEW");
  });
});