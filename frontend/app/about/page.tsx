"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyAboutPage() {
  const router = useRouter();
  useEffect(() => {
    // Older bookmarks used a fragment to reach support on the combined page.
    router.replace(window.location.hash === "#support" ? "/support" : "/#about");
  }, [router]);
  return null;
}
