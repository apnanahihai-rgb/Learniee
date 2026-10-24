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

  courseTitle: string | null;
  price: string | null;

  thumbnailUrl: string | null;

  status: "APPROVED";

  createdAt: string;
}
