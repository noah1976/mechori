import type { Metadata } from "next";
import { HumanQaExperience } from "@/components/human-qa-experience";

export const metadata: Metadata = { title: "画面の動作確認 | MECHORI", robots: { index: false, follow: false } };

export default function QaPage() { return <HumanQaExperience />; }
