import SupportContacts from "./SupportContacts";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return <SupportContacts email={process.env.SUPPORT_EMAIL?.trim()} phone={process.env.SUPPORT_PHONE?.trim()}/>;
}
