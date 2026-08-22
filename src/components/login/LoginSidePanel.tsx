export default function LoginSidePanel() {
  return (
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-violet-300 to-violet-400 rounded-[32px] min-h-[575px] items-center justify-center">
      <div className="text-center">
        <p className="text-xl mb-6">
          Don&apos;t have an Account?
        </p>

        <a
          href="/signup"
          className="inline-block border-2 border-violet-600 text-violet-600 px-7 py-2 rounded-full text-lg font-medium hover:bg-violet-600 hover:text-white transition"
        >
          SignUp
        </a>
      </div>
    </div>
  );
}