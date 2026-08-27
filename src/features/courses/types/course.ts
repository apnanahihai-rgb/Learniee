export interface CourseFormData {
  category: string;
  timeSlot: string;

  subject: string;
  grade: string;
  board: string;
  experience: string;

  duration: string;
  type: string;
  language: string;
  frequency: string;

  courseTitle: string;
  rating: string;
  objective: string;
  description: string;

  modules: string;
  courseTags: string;
  price: string;
}

export const initialCourseFormData: CourseFormData = {
  category: "",
  timeSlot: "",

  subject: "",
  grade: "",
  board: "",
  experience: "",

  duration: "",
  type: "",
  language: "",
  frequency: "",

  courseTitle: "",
  rating: "",
  objective: "",
  description: "",

  modules: "",
  courseTags: "",
  price: "",
};