import { getApplications } from "@/lib/actions/applications";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import ApplicationsClient from "@/components/applications-client";

export default async function ApplicationsPage() {
  const [session, apps] = await Promise.all([
    auth(),
    getApplications(),
  ]);

  const canEdit = hasPermission(
    session?.user?.permissions ?? [],
    PERMISSIONS.APP_EDIT
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Aplicações</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Catálogo de aplicações disponíveis para os jobs de ajuste de recursos
        </p>
      </div>
      <ApplicationsClient initial={apps} canEdit={canEdit} />
    </div>
  );
}
