import { LoginForm } from "@/components/onboarding/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
         style={{ background: "var(--bg)" }}>

      {/* Mesh background blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full"
             style={{
               width: 600, height: 600,
               background: "radial-gradient(circle, #a8f07a, transparent 70%)",
               filter: "blur(130px)",
               opacity: 0.08,
               top: -200, left: -150,
             }} />
        <div className="absolute rounded-full"
             style={{
               width: 450, height: 450,
               background: "radial-gradient(circle, #7ab8f0, transparent 70%)",
               filter: "blur(130px)",
               opacity: 0.07,
               bottom: 0, right: -100,
             }} />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <span
            className="font-display text-5xl font-black tracking-tight"
            style={{ color: "var(--bright)" }}
          >
            nudge<span style={{ color: "var(--accent)" }}>.</span>
          </span>
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            Your AI client memory
          </p>
        </div>

        <LoginForm />

        <p className="text-center mt-6 text-xs" style={{ color: "var(--muted)" }}>
          Free for up to 10 leads · No credit card required
        </p>
      </div>
    </div>
  );
}
