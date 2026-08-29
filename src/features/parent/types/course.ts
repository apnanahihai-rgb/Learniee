export interface ParentCourse {
  id: string;
  teacherId: string;

  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };

  subject: string | null;
  grade: string | null;
  board: string | null;
  type: string | null;

  courseTitle: string | null;
  rating: number | null;
  price: string | null;

  thumbnailUrl: string | null;

  status: "APPROVED";

  createdAt: string;
}
