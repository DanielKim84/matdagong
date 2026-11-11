import { useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go, useRoute } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, Segmented, TopBar } from "../../components/ui";
import TasterAvatar from "../../components/TasterAvatar";
import { useScrolledPast } from "../../hooks/useScrolledPast";
import type { Taster } from "../../models/place";
import { formatNumber, formatRelativeTime } from "../../utils/format";
import ProfileActionBar from "./ProfileActionBar";
import ProfileCoverGallery from "./ProfileCoverGallery";
import TasteGroups from "./TasteGroups";
import TasteMatchCard from "./TasteMatchCard";
import TasterRecords from "./TasterRecords";
import TasterReportButton from "./TasterReportButton";
import {
  activityLabel,
  coversOf,
  focusLabel,
  introOf,
  planLabel,
  recordsOf,
  tagsOf,
  tasterFromProfile,
} from "./tasterData";

type Tab = "map" | "list" | "taste";

const PROFILE_TABS: { value: Tab; label: string }[] = [
  { value: "map", label: "맛집 지도" },
  { value: "list", label: "기록 목록" },
  { value: "taste", label: "취향" },
];

/** 맛객 프로필(#profile/<accountId>): 소개·통계, 나와의 신뢰·취향 비교, 맛집 지도·기록 목록·취향 탭, 구독 버튼. */
export default function TasterProfileScreen() {
  const app = useAppData();
  const route = useRoute();
  const isOwn = app.isMyTasterId(route.id);
  const myself =
    isOwn && app.myProfile
      ? tasterFromProfile(app.myProfile, app.nickname, app.incomingSubscriptions.length)
      : undefined;
  const found = app.tasterById.get(route.id);
  // 내 프로필은 맛객 목록에 없을 수 있어 내 프로필 정보로 채웁니다.
  const taster =
    found && myself
      ? { ...myself, ...found, subscriberCount: found.subscriberCount ?? myself.subscriberCount }
      : (found ?? myself);

  if (!taster) {
    return (
      <main className="r-screen">
        <TopBar title="맛객 프로필" fallback="tasters" />
        {app.isLoading ? (
          <EmptyState tone="loading" title="맛객 정보를 불러오고 있어요…" />
        ) : (
          <EmptyState
            title="맛객 정보를 찾을 수 없어요"
            message="프로필을 비공개로 바꿨거나 탈퇴한 맛객일 수 있어요."
            action={{ label: "맛객 찾기로 가기", onClick: () => go("tasters") }}
          />
        )}
      </main>
    );
  }
  return <Profile key={taster.tasterId} taster={taster} isOwn={isOwn} />;
}

function Profile({ taster, isOwn }: { taster: Taster; isOwn: boolean }) {
  const app = useAppData();
  const [tab, setTab] = useState<Tab>("map");
  const coverRef = useRef<HTMLDivElement>(null);
  // 배경 사진이 화면 위로 지나가면 떠 있는 바에 바탕과 맛객 이름을 깔아 줍니다.
  const isScrolled = useScrolledPast(coverRef);

  // 내 프로필은 비공개 기록까지, 다른 맛객은 공개 기록만 보여 줍니다.
  const records = isOwn
    ? recordsOf(app.myRecords, app.isMyTasterId)
    : recordsOf(app.places, (id) => id === taster.tasterId);
  const latest = records.find((record) => record.entry.recordedAt)?.entry.recordedAt;
  const subscription = app.subscriptions.find((item) => item.targetAccountId === taster.tasterId);
  const matched = taster.matchedTags ?? [];
  const area = activityLabel(taster);
  const focus = focusLabel(taster.tasterFocus);

  return (
    <main className="r-screen r-tasters-profile">
      <TopBar title={taster.tasterName} fallback="tasters" variant="float" isScrolled={isScrolled} />
      <ProfileCoverGallery covers={coversOf(taster)} ref={coverRef} />

      <div className="r-tasters-profile__body">
        <section className="r-card r-tasters-hero" aria-label={`${taster.tasterName} 소개`}>
          <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--hero" />
          <h1 className="r-display">{taster.tasterName}</h1>
          <p className="r-tasters-hero__intro">{introOf(taster)}</p>
          {(area || focus || subscription) && (
            <div className="r-tasters-hero__chips">
              {area && (
                <span className="r-tasters-hero__chip">
                  <Icon name="pin" />
                  {area}
                </span>
              )}
              {focus && (
                <span className="r-tasters-hero__chip">
                  <Icon name={taster.tasterFocus === "CAFE_DESSERT" ? "coffee" : "fork"} />
                  {focus}
                </span>
              )}
              {subscription && (
                <span className={`r-tasters-plan ${subscription.subscriptionType === "FREE" ? "is-free" : ""}`}>
                  구독 중 · {planLabel(subscription)}
                </span>
              )}
            </div>
          )}
          <dl className="r-tasters-stats">
            <div>
              <dt>기록</dt>
              <dd>{formatNumber(records.length)}</dd>
            </div>
            <div>
              <dt>구독자</dt>
              <dd>{formatNumber(taster.subscriberCount)}</dd>
            </div>
            <div>
              <dt>최근 기록</dt>
              <dd>{formatRelativeTime(latest) || "-"}</dd>
            </div>
          </dl>
        </section>

        {!isOwn && (taster.matchScore != null || taster.trustScore != null) && <TasteMatchCard taster={taster} />}

        <Segmented<Tab>
          label="맛객 기록 보기"
          value={tab}
          onChange={setTab}
          options={PROFILE_TABS.map(({ value, label }) => ({
            value,
            label: value === "list" && records.length > 0 ? `${label} ${records.length}` : label,
          }))}
        />

        {tab === "taste" ? (
          // 내 프로필은 나와 비교할 대상이 아니므로 "나와 같아요" 표시를 두지 않습니다.
          <TasteGroups tags={tagsOf(taster)} matched={isOwn ? undefined : matched} />
        ) : (
          <TasterRecords taster={taster} records={records} view={tab} isOwn={isOwn} />
        )}

        {!isOwn && (
          <TasterReportButton
            tasterId={taster.tasterId}
            tasterName={taster.tasterName}
            className="r-tasters-profile__report"
          />
        )}
      </div>

      <ProfileActionBar taster={taster} isOwn={isOwn} />
    </main>
  );
}
