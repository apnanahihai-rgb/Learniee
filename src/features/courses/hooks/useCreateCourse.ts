"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { LANGUAGE_OPTIONS, SUBJECT_OPTIONS } from "@/features/courses/constants/courseOptions";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { frequencyForDays, timeSlotForTime } from "@/features/shared/utils/classRequestStatus";
import { initialCourseFormData, type CourseFormData } from "@/features/courses/types/course";
import { useTeacherAvailability } from "@/features/teacher/hooks/useAvailability";
import { checkCourseAgainstAvailability } from "@/features/courses/utils/courseAvailability";
import { GROUP_CLASS_TYPE, isGroupType, parseGroupMaxStudents, parseGroupSchedule } from "@/features/courses/utils/groupClass";

export function useCreateCourse() {
  const router = useRouter();
  const availability = useTeacherAvailability();

  const [formData, setFormData] = useState<CourseFormData>(initialCourseFormData);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Set when arriving from an accepted vacancy (/teacher/vacancy):
  // `?classRequestId=…` links the new course to it and prefills the form.
  const [classRequestId, setClassRequestId] = useState<string | null>(null);
  // True when the vacancy fixes the price/grade (course form then locks them).
  const [pricingLocked, setPricingLocked] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<CourseFormData> | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("classRequestId");

    // "Create group class" links here with ?type=group: start with Class type = Group.
    if (!id) {
      if (params.get("type")?.toLowerCase() === "group") {
        setInitialValues({ type: GROUP_CLASS_TYPE });
      }

      return;
    }

    let cancelled = false;

    async function loadVacancy(requestId: string) {
      try {
        const res = await fetch(`/api/teacher/class-requests/${encodeURIComponent(requestId)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load the vacancy.");
        }

        if (cancelled) return;

        const v = data.vacancy;
        const days: number[] = Array.isArray(v.preferredDays) ? v.preferredDays : [];
        const scheduleText = days.length
          ? formatSchedule(days, v.preferredTime)
          : v.preferredSchedule ?? "";
        const details = [
          v.description,
          scheduleText ? `Preferred schedule (IST): ${scheduleText}` : "",
        ].filter(Boolean);

        setClassRequestId(requestId);
        setInitialValues({
          courseTitle: v.title,
          // The form's Subject/Grade/Board are fixed lists, so a custom
          // subject is carried in the title/tags instead of a blank select.
          // A custom subject goes in via "Other" + the written name.
          ...((SUBJECT_OPTIONS as readonly string[]).includes(v.subject)
            ? { subject: v.subject }
            : { subject: "Other", subjectOther: v.subject ?? "" }),
          gradeMode: "single",
          gradeFrom: v.grade ?? "",
          grade: v.grade ?? "",
          board: v.board ?? "",
          // A requested language outside the list goes in via "Other" + the written name.
          ...((LANGUAGE_OPTIONS as readonly string[]).includes(v.language ?? "") || !v.language
            ? { language: v.language ?? "" }
            : { language: "Other", languageOther: v.language }),
          courseTags: v.subject ?? "",
          description: details.join("\n\n"),
          // From the parent's requested days/time.
          frequency: frequencyForDays(days.length) ?? "",
          timeSlot: timeSlotForTime(v.preferredTime) ?? "",
          // A request is for one child.
          type: "Individual",
          // Fixed by grade for vacancy listings; the server enforces it too.
          ...(typeof v.pricePerSession === "number" ? { price: String(v.pricePerSession) } : {}),
        });
        setPricingLocked(typeof v.pricePerSession === "number");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load the vacancy.");
        }
      }
    }

    loadVacancy(id);

    return () => {
      cancelled = true;
    };
  }, []);

  function goToCourseManagement() {
    router.push("/teacher/course-management");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Availability first: the server enforces this too.
    if (availability.loading) {
      setError("Still loading your availability — try again in a moment.");
      return;
    }

    if (availability.loadFailed) {
      setError("We couldn't load your availability. Refresh the page and try again.");
      return;
    }

    if (availability.slots.length === 0) {
      setError("Set your weekly availability in Calendar before creating a course.");
      return;
    }

    if (!formData.courseTitle.trim()) {
      setError("Course title is required.");
      return;
    }

    if (isGroupType(formData.type)) {
      const group = parseGroupMaxStudents(formData.groupMaxStudents);

      if (!group.ok) {
        setError(group.error);
        return;
      }

      const schedule = parseGroupSchedule(formData);

      if (!schedule.ok) {
        setError(schedule.error);
        return;
      }
    }

    const fit = checkCourseAgainstAvailability(availability.slots, {
      type: formData.type,
      duration: formData.duration,
      frequency:
        formData.frequency === "Custom" ? formData.frequencyCustom : formData.frequency,
      timeSlot: formData.timeSlot,
      groupDays: formData.groupDays,
      groupTime: formData.groupTime,
    });

    if (!fit.ok) {
      setError(fit.error);
      return;
    }

    if (!thumbnail) {
      setError("Course thumbnail is required.");
      return;
    }

    if (!introVideo) {
      setError("Course intro video is required.");
      return;
    }

    try {
      setSaving(true);

      // 1. Upload thumbnail to S3.
      const thumbnailKey = await uploadFileToS3({ file: thumbnail, folder: "course-media" });

      // 2. Upload intro video to S3.
      const introVideoKey = await uploadFileToS3({ file: introVideo, folder: "course-media" });

      // 3. Save course data + S3 keys.
      const res = await fetch("/api/teacher/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          thumbnailKey,
          introVideoKey,
          ...(classRequestId ? { classRequestId } : {}),
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create course.");
      }

      // 4. Success.
      goToCourseManagement();
    } catch (err) {
      console.error("Create course error:", err);
      setError(err instanceof Error ? err.message : "Failed to create course.");
    } finally {
      setSaving(false);
    }
  }

  return {
    formData,
    setFormData,
    thumbnail,
    setThumbnail,
    introVideo,
    setIntroVideo,
    saving,
    error,
    handleSubmit,
    goToCourseManagement,
    initialValues,
    classRequestId,
    pricingLocked,
    availabilitySlots: availability.slots,
    availabilityLoading: availability.loading,
    availabilityLoadFailed: availability.loadFailed,
    canCreate:
      !availability.loading && !availability.loadFailed && availability.slots.length > 0,
  };
}
