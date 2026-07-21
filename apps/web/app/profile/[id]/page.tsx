"use client";

import { JournalCard } from "@/components/journal-card";
import { useApp } from "@/lib/app-context";
import {
  canCurrentProfileViewJournal,
  canProfileViewProfile,
  formatOwnershipDuration,
  formatOwnershipPeriod,
  groupVehiclesByOwnership,
  isProfileBlocked,
  isProfileMuted,
  summarizeVehicleRelationship,
} from "@mechori/core";
import { ArrowLeft, Bike, BookOpenText, CarFront, History, LockKeyhole, Settings2, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale, signedIn, toggleBlockProfile, toggleMuteProfile } = useApp();
  const ja = locale === "ja";
  const profile = data.profiles.find((item) => item.id === id);
  const ownProfile = signedIn && id === data.currentProfileId;
  const canView = profile && canProfileViewProfile(data, id, signedIn ? data.currentProfileId : undefined);

  if (!profile || !canView) {
    return (
      <div className="empty-state">
        <LockKeyhole size={30} aria-hidden="true" />
        <h1>{ja ? "このプロフィールは表示できません" : "This profile is unavailable"}</h1>
        <p>{ja ? "プロフィールの公開範囲、フォロー、ブロック状態を確認してください。公開した愛車記録の公開範囲とは別の設定です。" : "Check profile visibility, follows, and block status. This setting is separate from vehicle-record visibility."}</p>
        <Link href={signedIn ? "/feed" : "/"} className="secondary-action">{ja ? "戻る" : "Go back"}</Link>
      </div>
    );
  }

  const fields = new Set(profile.displayFields);
  const vehicles = data.vehicles.filter((vehicle) => vehicle.ownerProfileId === profile.id);
  const groupedVehicles = groupVehiclesByOwnership(vehicles);
  const journals = data.journals.filter((journal) => {
    if (journal.authorProfileId !== profile.id) return false;
    if (signedIn) return canCurrentProfileViewJournal(data, journal);
    return journal.visibility === "public" && journal.moderationState === "visible";
  });
  const publicJournalCount = data.journals.filter(
    (journal) => journal.authorProfileId === profile.id && journal.visibility === "public" && journal.moderationState === "visible",
  ).length;

  return (
    <div className="page-stack profile-page">
      <Link href={signedIn ? "/feed" : "/"} className="back-link"><ArrowLeft size={17} />{ja ? "戻る" : "Back"}</Link>
      <header className="profile-header">
        <span className="profile-avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toLocaleUpperCase()}</span>
        <div><span className="eyebrow">PROFILE</span><h1>{profile.displayName}</h1>{fields.has("role") && <p>{profile.role === "mechanic" ? (ja ? "メカニック" : "Mechanic") : (ja ? "オーナー" : "Owner")}{profile.isProfessional ? " · Professional DEMO" : ""}</p>}</div>
        {ownProfile && <Link href="/settings/privacy" className="secondary-action"><Settings2 size={17} />{ja ? "公開設定" : "Visibility settings"}</Link>}
      </header>

      {fields.has("bio") && <section className="profile-bio"><UserRound size={21} aria-hidden="true" /><p>{profile.bio}</p></section>}

      <section className="profile-facts" aria-label={ja ? "公開プロフィール情報" : "Public profile information"}>
        {fields.has("vehicles") && <div><CarFront size={20} /><span>{ja ? "愛車歴" : "Vehicle history"}</span><strong>{vehicles.length ? `${vehicles.length}${ja ? "台" : " vehicles"}` : (ja ? "公開車両なし" : "No visible vehicles")}</strong></div>}
        {fields.has("ownership_duration") && <div><UserRound size={20} /><span>{ja ? "所有期間" : "Ownership"}</span><strong>{vehicles.map((vehicle) => formatOwnershipDuration(locale, summarizeVehicleRelationship(vehicle))).filter(Boolean).join(" / ") || (ja ? "未登録" : "Not set")}</strong></div>}
        {fields.has("journal_count") && <div><BookOpenText size={20} /><span>{ja ? "公開中の愛車記録" : "Public vehicle records"}</span><strong>{publicJournalCount}</strong></div>}
      </section>

      {fields.has("vehicles") && vehicles.length > 0 && (
        <section className="profile-vehicle-history">
          <div className="profile-vehicle-group">
            <div className="section-heading compact"><div><span className="eyebrow">CURRENT</span><h2>{ja ? "現在のガレージ" : "Current Garage"}</h2></div><CarFront size={21} aria-hidden="true" /></div>
            {groupedVehicles.current.length ? <div className="profile-vehicle-lines">{groupedVehicles.current.map((vehicle) => <ProfileVehicleLine key={vehicle.id} vehicle={vehicle} period={formatOwnershipPeriod(vehicle, locale)} />)}</div> : <p>{ja ? "現在所有中の公開車両はありません。" : "No currently owned public vehicle."}</p>}
          </div>
          <div className="profile-vehicle-group">
            <div className="section-heading compact"><div><span className="eyebrow">HISTORY</span><h2>{ja ? "これまでの愛車" : "Previous Vehicles"}</h2></div><History size={21} aria-hidden="true" /></div>
            {groupedVehicles.previous.length ? <div className="profile-vehicle-lines">{groupedVehicles.previous.map((vehicle) => <ProfileVehicleLine key={vehicle.id} vehicle={vehicle} period={formatOwnershipPeriod(vehicle, locale)} />)}</div> : <p>{ja ? "これまでの愛車はまだ公開されていません。" : "No previous vehicle is public yet."}</p>}
          </div>
        </section>
      )}

      <section>
        <div className="section-heading"><div><span className="eyebrow">VEHICLE RECORDS</span><h2>{ja ? "閲覧できる愛車記録" : "Visible vehicle records"}</h2></div></div>
        {journals.length ? <div className="journal-grid">{journals.map((journal) => <JournalCard key={journal.id} journal={journal} author={profile} record={data.records.find((record) => record.id === journal.linkedRecordId)} locale={locale} safety={!ownProfile && signedIn ? { muted: isProfileMuted(data, profile.id), blocked: isProfileBlocked(data, profile.id), onToggleMute: () => toggleMuteProfile(profile.id), onToggleBlock: () => toggleBlockProfile(profile.id) } : undefined} />)}</div> : <div className="empty-state"><BookOpenText size={26} /><h3>{ja ? "表示できる愛車記録はありません" : "No visible vehicle records"}</h3></div>}
      </section>
      <p className="legal-note">{ja ? "所有期間や投稿数は人気、整備能力、ナレッジの信頼度を表しません。" : "Ownership duration and post counts do not indicate popularity, maintenance skill, or knowledge reliability."}</p>
    </div>
  );
}

function ProfileVehicleLine({ vehicle, period }: { vehicle: ReturnType<typeof groupVehiclesByOwnership>["current"][number]; period: string }) {
  const VehicleIcon = vehicle.vehicleCategory === "motorcycle" || vehicle.vehicleCategory === "moped" ? Bike : CarFront;
  return <div><VehicleIcon size={18} aria-hidden="true" /><span><strong>{vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make} {vehicle.model}</strong><small>{period}</small></span></div>;
}
