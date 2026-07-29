import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/components/privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy | MECHORI",
  description:
    "MECHORIの少人数α版における個人情報、外部サービス、アクセス解析、AI利用、削除依頼の取扱い",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
