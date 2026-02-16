"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const Nav = dynamic(
  () => import("~/app/_components/nav").then((m) => ({ default: m.Nav })),
  { ssr: false },
);

const HIDE_MOBILE_BAR = ["/drive"];

export function ClientNav() {
  const pathname = usePathname();
  const hideMobileBar = HIDE_MOBILE_BAR.includes(pathname);

  return (
    <>
      <Nav />
      {!hideMobileBar && (
        <div className="h-[calc(env(safe-area-inset-top)+3.5rem)] lg:hidden" aria-hidden="true" />
      )}
    </>
  );
}
