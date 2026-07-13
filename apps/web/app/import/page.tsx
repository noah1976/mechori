"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import { ArrowRight, Camera, FileJson, FileText, Mic, ScanLine } from "lucide-react";
import Link from "next/link";

const methods = [
  { icon: Camera, ja: "紙の整備記録簿を撮影", en: "Scan a paper service record" },
  { icon: FileText, ja: "PDFを読み込む", en: "Import a PDF" },
  { icon: ScanLine, ja: "整備明細を撮影", en: "Scan a service invoice" },
  { icon: Mic, ja: "音声で記録", en: "Record by voice" },
  { icon: FileJson, ja: "CSVから取り込む", en: "Import from CSV" },
];

export default function ImportPage() {
  const { locale } = useApp();
  const ja = locale === "ja";
  return <div className="page-stack"><DemoNotice /><header className="page-header"><div><span className="eyebrow">IMPORT PIPELINE</span><h1>{ja ? "記録の取り込み" : "Import records"}</h1><p>{ja ? "手入力を減らすための将来機能です。現在はファイルを選択・送信しません。" : "A future workflow to reduce manual entry. This prototype does not select or send files."}</p></div></header>
    <div className="import-grid">{methods.map((method) => { const Icon = method.icon; return <article key={method.en}><Icon size={25} /><div><h2>{ja ? method.ja : method.en}</h2><p>{ja ? "準備中 · 外部送信なし" : "Coming later · No external transfer"}</p></div><span className="badge badge-outline">{ja ? "準備中" : "COMING LATER"}</span></article>; })}</div>
    <section className="pipeline-band"><span>01</span><div><strong>{ja ? "原本取得" : "Source capture"}</strong><small>{ja ? "一時処理" : "Temporary"}</small></div><span>02</span><div><strong>OCR</strong><small>{ja ? "差し替え可能" : "Replaceable"}</small></div><span>03</span><div><strong>{ja ? "個人情報候補の除去" : "PII candidate removal"}</strong><small>{ja ? "保存前" : "Before storage"}</small></div><span>04</span><div><strong>{ja ? "ユーザー確認" : "User review"}</strong><small>{ja ? "確定前" : "Before confirmation"}</small></div></section>
    <section className="privacy-review-link"><div><span className="eyebrow">INTERACTIVE DEMO</span><h2>{ja ? "画像の公開前チェック" : "Pre-publish image review"}</h2><p>{ja ? "ナンバープレート候補のマスクと、人による最終確認の流れを試せます。実画像の検出やアップロードは行いません。" : "Try the plate-redaction and human confirmation flow. No real image detection or upload occurs."}</p></div><Link href="/privacy-review" className="primary-action">{ja ? "確認フローを試す" : "Try review flow"}<ArrowRight size={18} /></Link></section>
    <section className="privacy-review-link"><div><span className="eyebrow">EXTRACTION REVIEW DEMO</span><h2>{ja ? "OCR・AI候補を確認する" : "Review OCR and AI candidates"}</h2><p>{ja ? "実PDFがなくても、読めない文字や推測された値だけを人が直す流れを試せます。実データは保存しません。" : "Try correcting unreadable or inferred values without a real PDF. No real data is saved."}</p></div><Link href="/import/review-demo" className="primary-action">{ja ? "抽出確認を試す" : "Try extraction review"}<ArrowRight size={18} /></Link></section>
    <p className="legal-note">{ja ? "原本画像・PDFは標準で恒久保存せず、OCRやAIの候補を確認済み事実として自動確定しません。" : "Original images and PDFs are not retained by default, and OCR or AI candidates are never auto-confirmed as facts."}</p>
  </div>;
}
