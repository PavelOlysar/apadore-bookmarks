import Link from "next/link";

export function TopNav() {
  return (
    <header className="hairline-bot bg-paper sticky top-0 z-30">
      <div className="page-px flex h-20 items-center">
        <Link href="/" aria-label="Apadore — home" className="text-ink shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/apadore-logo.svg"
            alt="Apadore"
            className="h-[20px] w-auto"
          />
        </Link>

        <nav className="ml-14 hidden md:flex items-center gap-12">
          <NavLink href="/">All</NavLink>
          <NavLink href="/?sort=recent">Recent</NavLink>
          <NavLink href="/?scope=mine">Mine</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-10">
          <NavLink href="/account">Account</NavLink>
          <Link href="/new" className="btn-primary">+ Add</Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-ink hover:underline underline-offset-4"
    >
      {children}
    </Link>
  );
}
