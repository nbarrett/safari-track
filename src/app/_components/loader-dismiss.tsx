"use client";

import { useEffect } from "react";

export function LoaderDismiss() {
  useEffect(() => {
    const el = document.getElementById("app-loader");
    if (el) el.style.display = "none";
  }, []);

  return null;
}
