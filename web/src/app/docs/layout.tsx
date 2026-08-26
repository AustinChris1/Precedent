import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getAllDocMeta } from "@/lib/docs";
import { DocsNav } from "@/components/DocsNav";

export default async function DocsLayout({ children }: LayoutProps<"/docs">) {
  const docs = await getAllDocMeta();

  return (
    <div className="ambient relative flex min-h-screen flex-col">
      <span className="ambient-accent" aria-hidden />

      <header className="glass-thin sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 transition hover:text-brand-soft">
            <Logo className="h-6 w-6" />
            <span className="font-display text-lg leading-none">Precedent</span>
            <span className="ml-1 text-xs text-fg-faint">docs</span>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/console" className="text-fg-muted transition hover:text-fg">
              Console
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1 text-xs text-fg-faint transition hover:text-fg"
            >
              <ArrowLeft size={12} /> home
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-6 py-10">
        <DocsNav docs={docs} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
