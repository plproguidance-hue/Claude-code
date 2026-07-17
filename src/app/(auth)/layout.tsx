import Image from "next/image";
import Link from "next/link";

import { brand } from "@/config/brand";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-graphite via-charcoal to-graphite">
      <a
        href="#auth-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(255,75,0,0.18),transparent_65%)]" />
      <main
        id="auth-content"
        className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10"
      >
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label={`${brand.brandName} home`}>
            <Image
              src={brand.logo.dark}
              alt={brand.logo.alt}
              width={220}
              height={48}
              priority
            />
          </Link>
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface p-6 shadow-xl sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-white/60">
          {brand.legalName} · {brand.tagline}
        </p>
      </main>
    </div>
  );
}
