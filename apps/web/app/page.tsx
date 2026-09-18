"use client";

import HomePage from "@/app/home/page";
import { PassportExperience } from "@/components/passport-experience";
import { useApp } from "@/lib/app-context";

export default function RootPage() {
  const { hydrated, signedIn } = useApp();
  if (!hydrated || !signedIn) return <HomePage />;
  return <PassportExperience />;
}
