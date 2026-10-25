import type { ReactNode } from "react";
import PageTop from "@/components/ui/PageTop";

// Common frame for the content pages: full-height background, one centred column, and the
// top bar. Pages render their own header and sections as children.
export default function PageShell({ current, gap = "gap-8", children }: { current?: "/ransomware" | "/actors"; gap?: "gap-8" | "gap-10"; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className={`mx-auto flex w-full flex-col ${gap} px-4 py-6 sm:px-8 sm:py-10`} style={{ maxWidth: 1180 }}>
        <PageTop current={current} />
        {children}
      </main>
    </div>
  );
}
