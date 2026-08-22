import SignupForm from "@/components/signup/SignupForm";
import SignupSidePanel from "@/components/signup/SignupSidePanel";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="flex flex-col md:flex-row w-full max-w-4xl">
        <SignupSidePanel />
        <SignupForm />
      </div>
    </div>
  );
}