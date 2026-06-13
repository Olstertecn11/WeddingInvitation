import { cookies } from "next/headers";
import AdminPanel from "./AdminPanel";
import { ADMIN_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export const metadata = {
  title: "Administración | Oliver & Analucía",
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authenticated = isValidAdminSession(
    cookieStore.get(ADMIN_COOKIE)?.value,
  );

  return <AdminPanel initialAuthenticated={authenticated} />;
}
