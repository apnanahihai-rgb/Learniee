export interface ParentCourse {
  id: string;
  teacherId: string;

  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
    // Optional: only GET /api/parent/courses fills these (for the Teachers
    // tab); other endpoints that reuse this type don't send them.
    city?: string | null;
    country?: string | null;
    isIITian?: boolean;
    /** Presigned profile-photo URL, null if the teacher has none. */
    photoUrl?: string | null;
    qualifications?: string | null;
    /** Free text from onboarding, normally a number of years. */
    experience?: string | null;
    /**
     * The teacher's own overall average rating, averaged across every
     * review they've received on any of their courses (see
     * getTeacherRatingsByIds in review.service.ts) — null when they
     * have none yet. Never teacher-entered; Course.rating (the old
     * free-typed field) is deprecated and no longer used for display.
     */
    averageRating: number | null;
    reviewCount: number;
  };

  subject: string | null;
  grade: string | null;
  board: string | null;
  type: string | null;
  /** Group classes only (type "Group"). */
  groupMaxStudents?: number | null;
  groupPricePerCycle?: string | null;
  groupDays?: number[] | null;
  groupTime?: string | null;
  groupMode?: string | null;
  groupJoinMode?: string | null;
  groupStartDate?: string | null;
  groupEndDate?: string | null;
  groupKind?: string | null;
  groupRecurrence?: string | null;
  groupAgeMin?: number | null;
  groupAgeMax?: number | null;
  groupRegStartDate?: string | null;
  groupRegEndDate?: string | null;
  /** Seats already taken (group classes; added by the list API). */
  groupSeatsTaken?: number;

  courseTitle: string | null;
  price: string | null;

  thumbnailUrl: string | null;

  status: "APPROVED";

  createdAt: string;
}
