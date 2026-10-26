import AdminDashboard from "@/components/AdminDashboard";
import AdminLogin from "@/components/AdminLogin";
import { isAdmin } from "@/lib/auth";
import { listGalleries } from "@/lib/galleries";
import { isMockMode } from "@/lib/mock-db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio · Love Lens Wedding", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  let initialGalleries: Awaited<ReturnType<typeof listGalleries>> = [];
  let dbError: string | null = null;
  try {
    initialGalleries = await listGalleries();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Failed to connect to database";
  }

  return <AdminDashboard initialGalleries={initialGalleries} dbError={dbError} isMock={isMockMode()} />;
}

