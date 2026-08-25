import Link from "next/link";

const PRIMARY = "#7E2BF1";
const PRIMARY_LIGHT = "#912EFF";

export default function SignupSidePanel() {
  return (
    <div
      className="hidden md:flex flex-col items-center justify-center rounded-[32px] w-full md:w-1/2 p-10 text-center shadow-xl"
      style={{
        background: `linear-gradient(
          135deg,
          ${PRIMARY_LIGHT}33,
          ${PRIMARY_LIGHT}99
        )`,
      }}
    >
      <p className="text-lg font-medium text-gray-800 mb-6">
        Have an Account?
      </p>

      <Link
        href="/login"
        className="rounded-full border-2 px-8 py-2 font-semibold"
        style={{
          borderColor: PRIMARY,
          color: PRIMARY,
        }}
      >
        LogIn
      </Link>
    </div>
  );
}