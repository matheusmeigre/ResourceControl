import { getUsers, getRoles } from "@/lib/actions/users";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import UsersClient from "@/components/users-client";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!hasPermission(session?.user?.permissions ?? [], PERMISSIONS.USER_MANAGE)) {
    redirect("/dashboard");
  }

  const [users, roles] = await Promise.all([getUsers(), getRoles()]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gerencie os usuários e seus perfis de acesso
        </p>
      </div>
      <UsersClient
        users={users as Parameters<typeof UsersClient>[0]["users"]}
        roles={roles}
        currentUserId={session?.user?.id ?? ""}
      />
    </div>
  );
}
