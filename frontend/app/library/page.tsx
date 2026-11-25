import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RepositoryLibrary from "./RepositoryLibrary";

export default async function LibraryPage() {
  if (!(await cookies()).get("session_token")?.value) redirect("/login");
  return <RepositoryLibrary/>;
}
