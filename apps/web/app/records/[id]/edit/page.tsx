"use client";

import { RecordForm } from "@/components/record-form";
import { useApp } from "@/lib/app-context";
import { useParams } from "next/navigation";

export default function EditRecordPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale } = useApp();
  const record = data.records.find((item) => item.id === id);
  const ja = locale === "ja";
  if (!record) return <div className="empty-state"><h1>{ja ? "記録が見つかりません" : "Record not found"}</h1></div>;
  return <div className="page-stack narrow-page"><header className="page-header"><div><span className="eyebrow">EDIT RECORD</span><h1>{ja ? "整備記録を編集" : "Edit maintenance record"}</h1><p>{ja ? "公開候補を変更しても、自動で再公開されません。" : "Changes to a shared candidate are never republished automatically."}</p></div></header><RecordForm record={record} /></div>;
}
