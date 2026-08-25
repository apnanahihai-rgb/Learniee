export type SignupRole = "parent" | "teacher";

export interface SignupFormData {
  role: SignupRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  otp: string;
  password: string;
  confirmPassword: string;
  confirmedTeacherRole: boolean;
  acceptedTerms: boolean;
}

export interface SignupFormErrors {
  [key: string]: string | undefined;
}