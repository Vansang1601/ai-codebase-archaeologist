import { redirect } from "next/navigation";

// The Support tab was merged into the bottom of the home page.
export default function LegacySupportPage() {
  redirect("/#support");
}
