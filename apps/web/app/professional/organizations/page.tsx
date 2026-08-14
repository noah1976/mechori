import { ProfessionalOrganizationList } from "@/components/professional-organization-list";

export default function ProfessionalOrganizationsPage() {
  return <div className="page-stack professional-workspace-page"><header className="page-header"><div><span className="eyebrow">PROFESSIONAL</span><h1>事業者スペース</h1><p>所属する整備工場・ショップとメンバーを確認します。</p></div></header><ProfessionalOrganizationList /></div>;
}
