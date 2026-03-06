import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Orbitron } from "next/font/google";

const futuristicFont = Orbitron({
  subsets: ["latin"],
  weight: ["700"],
});

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full relative">
      <div className="flex flex-col items-center gap-8 z-10">
        <h1
          className={`${futuristicFont.className} text-xl text-white tracking-widest uppercase drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]`}
        >
          ELO<span className="text-zinc-600">NODE</span>
        </h1>

        <div className="transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(16,185,129,0.25)]">
          <SignUp
            appearance={{
              baseTheme: dark,
              elements: {
                card: "bg-zinc-950 border border-zinc-800 shadow-2xl",
              },
            }}
          />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)]" />
    </div>
  );
}
