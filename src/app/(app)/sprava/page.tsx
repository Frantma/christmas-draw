import { redirect } from "next/navigation";
import { DrawPanel, ParticipantsPanel, SettingsPanel } from "@/components/admin-panels";
import { PageHead } from "@/components/page-head";
import { getDrawStatus, getMe, getMembers, getSettings } from "@/lib/data";

export default async function AdminPage() {
  const me = await getMe();
  if (!me.is_admin) redirect("/");

  const [members, status, settings] = await Promise.all([getMembers(), getDrawStatus(), getSettings()]);

  return (
    <div className="flex flex-col gap-7">
      <PageHead eyebrow="Jen pro správce" title="Správa skupiny">
        Přidej lidi, nastav pravidla a spusť losování. Dvojice zůstanou tajné i před tebou.
      </PageHead>
      <div className="flex flex-wrap items-start gap-6">
        <ParticipantsPanel members={members} drawn={status.drawn} />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
          <DrawPanel status={status} />
          <SettingsPanel settings={settings} />
        </div>
      </div>
    </div>
  );
}
