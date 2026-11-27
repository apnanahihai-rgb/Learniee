export const CATEGORY_OPTIONS = [
  "Extra Academic",
  "Extra Curricular",
] as const;

export const SUBJECT_OPTIONS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Other",
] as const;

export const GRADE_OPTIONS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const BOARD_OPTIONS = [
  "CBSE",
  "ICSE",
  "State Board",
  "IB",
  "IGCSE",
] as const;

/** Course form only: "All Boards" is for subjects that don't follow one board (craft, music, ...). */
export const ALL_BOARDS = "All Boards";
export const COURSE_BOARD_OPTIONS = [...BOARD_OPTIONS, ALL_BOARDS] as const;

export const EXPERIENCE_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const DURATION_OPTIONS = [
  "30 Minutes",
  "45 Minutes",
  "1 Hour",
  "1.5 Hours",
  "2 Hours",
] as const;

export const TYPE_OPTIONS = [
  "Individual",
  "Group",
] as const;

export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Marathi",
] as const;

/** Course form only: "Other" reveals a field to write the language. */
export const OTHER_LANGUAGE = "Other";
export const COURSE_LANGUAGE_OPTIONS = [...LANGUAGE_OPTIONS, OTHER_LANGUAGE] as const;

export const FREQUENCY_OPTIONS = [
  "Daily",
  "3 Days a Week",
  "5 Days a Week",
  "Weekly",
  "Custom",
] as const;

export const MODULE_OPTIONS = [
  "1 Module",
  "2 Modules",
  "3 Modules",
  "4 Modules",
  "5 Modules",
  "All",
  "No Modules",
  "Custom",
] as const;



/** Value of the Subject / Frequency / Modules selects that reveals a free-entry field. */
export const OTHER_SUBJECT = "Other";
export const CUSTOM_OPTION = "Custom";
export const ALL_MODULES = "All";
/** The subject has no modules, so nothing is stored. */
export const NO_MODULES = "No Modules";
