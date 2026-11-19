import type { ReactNode } from "react";
import { Locale } from "../../lib/translations";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div data-locale={locale} className="locale-wrapper">
      {children}
    </div>
  );
}
