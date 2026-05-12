import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Logo pinned to the true top-left of the entire viewport. On desktop
          it sits over the navy aside (so it gets the cream filter); on mobile
          it sits over the cream form section (so no filter). */}
      <Link
        href="/"
        aria-label="Apadore — home"
        className="absolute top-8 left-6 md:left-10 z-20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apadore-logo.svg"
          alt="Apadore"
          className="h-[20px] w-auto md:hidden"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/apadore-logo.svg"
          alt=""
          aria-hidden
          className="h-[20px] w-auto hidden md:block"
          // Logo is filled navy; invert + brighten to cream on the dark aside.
          style={{ filter: "brightness(0) invert(1) brightness(0.97) sepia(0.08)" }}
        />
      </Link>

      {/* Left: navy editorial panel */}
      <aside className="hidden md:flex relative bg-ink text-paper flex-col justify-end p-12">
        <h2 className="display-1">
          An archive of things
          <br />
          worth remembering.
        </h2>
        <div className="eyebrow mt-8 text-paper/60">
          For Apadore only · est. 2026
        </div>
      </aside>

      {/* Right: form on cream */}
      <section className="flex items-center justify-center page-px py-16 md:py-0">
        <LoginForm />
      </section>
    </main>
  );
}
