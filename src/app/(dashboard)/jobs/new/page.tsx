import { getApplications } from "@/lib/actions/applications";
import { JobWizardClient } from "@/components/job-wizard-client";

export const metadata = { title: "Novo Job — Controle de Ajuste de Recurso" };

export default async function NewJobPage() {
  const apps = await getApplications();
  return <JobWizardClient apps={apps} />;
}
