"use client";

import dynamic from "next/dynamic";

const Nav = dynamic(
  () => import("~/app/_components/nav").then((m) => ({ default: m.Nav })),
  { ssr: false },
);

export function ClientNav() {
  return <Nav />;
}
