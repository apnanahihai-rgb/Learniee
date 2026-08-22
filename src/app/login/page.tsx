import LoginForm from "@/components/login/LoginForm";
import LoginSidePanel from "@/components/login/LoginSidePanel";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="flex w-full max-w-[940px] items-center">
        
        {/* Login form on LEFT */}
        <LoginForm />

        {/* Purple panel on RIGHT */}
        <LoginSidePanel />

      </div>
    </main>
  );
}