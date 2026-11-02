import { useEffect, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go, useRoute } from "../../app/navigation";
import { Avatar, ProfileCover } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { EmptyState, TopBar } from "../../components/ui";
import type { Taster } from "../../models/place";
import { formatNumber, formatRelativeTime } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import ProfileActionBar from "./ProfileActionBar";
import TasteGroups from "./TasteGroups";
import TasterRecords from "./TasterRecords";
import {
  activityLabel,
  coverOf,
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

/** 위쪽 바 높이. 커버가 이 선 위로 다 올라가면 바에 바탕과 이름을 깝니다. */
const TOP_BAR_HEIGHT = 64;

/** 맛객 프로필(#profile/<accountId>): 취향 일치, 통계, 맛집 지도와 기록 목록. */
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
        {app.loading ? (
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
  const [isScrolled, setIsScrolled] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);

  // 커버 사진이 화면 위로 지나가면 떠 있는 바에 바탕과 맛객 이름을 깔아 줍니다.
  useEffect(() => {
    const target = coverRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsScrolled(!entry.isIntersecting), {
      rootMargin: `-${TOP_BAR_HEIGHT}px 0px 0px 0px`,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

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
      <div className="r-tasters-profile__cover" ref={coverRef}>
        <ProfileCover src={coverOf(taster)} />
      </div>

      <div className="r-tasters-profile__body">
        <div className="r-tasters-profile__head">
          <Avatar
            className="r-tasters-avatar r-tasters-avatar--xl"
            src={avatarSource(taster.tasterId, taster.avatar)}
            fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
            name={taster.tasterName}
            variant={taster.avatarVariant}
          />
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
        </div>

        <div className="r-tasters-profile__intro">
          <h1 className="r-display">{taster.tasterName}</h1>
          <p>{introOf(taster)}</p>
          {(area || focus) && (
            <span className="r-tasters-profile__meta">
              {area && (
                <span>
                  <Icon name="pin" />
                  {area}
                </span>
              )}
              {focus && (
                <span>
                  <Icon name={taster.tasterFocus === "CAFE_DESSERT" ? "coffee" : "fork"} />
                  {focus}
                </span>
              )}
            </span>
          )}
          {subscription && (
            <span className={`r-tasters-plan ${subscription.subscriptionType === "FREE" ? "is-free" : ""}`}>
              구독 중 · {planLabel(subscription)}
            </span>
          )}
        </div>

        {!isOwn && taster.matchScore != null && (
          <section className="r-card r-tasters-match" aria-label="나와 취향 일치">
            <div className="r-tasters-match__top">
              <b>나와 취향</b>
              <strong>{taster.matchScore}%</strong>
            </div>
            <div
              className="r-tasters-match__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={taster.matchScore}
              aria-label="취향 일치율"
            >
              <i style={{ width: `${Math.min(100, Math.max(0, taster.matchScore))}%` }} />
            </div>
            {matched.length ? (
              <div className="r-tags">
                {matched.map((tag) => (
                  <span key={tag} className="r-tag">
                    {tag} ✓
                  </span>
                ))}
              </div>
            ) : (
              <small className="r-muted">아직 겹치는 취향 태그가 없어요.</small>
            )}
          </section>
        )}

        <div className="r-tasters-tabs" role="tablist" aria-label="맛객 기록 보기">
          {PROFILE_TABS.map(({ value, label }) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>
              {label}
              {value === "list" && records.length > 0 ? ` ${records.length}` : ""}
            </button>
          ))}
        </div>

        {tab === "taste" ? (
          <TasteGroups tags={tagsOf(taster)} matched={matched} />
        ) : (
          <TasterRecords records={records} view={tab} isOwn={isOwn} />
        )}
      </div>

      <ProfileActionBar taster={taster} isOwn={isOwn} />
    </main>
  );
}
