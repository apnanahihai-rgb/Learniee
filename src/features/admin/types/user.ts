export interface AdminUser {
  firstName: string;
  lastName: string;
  email: string;
  role: "parent" | "teacher";
}
