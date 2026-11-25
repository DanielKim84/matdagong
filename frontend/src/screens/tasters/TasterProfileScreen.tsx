import { useRef } from "react";
import { useAppData } from "../../app/AppData";
import { go, useRoute } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead, TopBar } from "../../components/ui";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import { useScrolledPast } from "../../hooks/useScrolledPast";
import type { Taster } from "../../models/place";
import { formatNumber } from "../../utils/format";
import { sharePageWithNotice } from "../../utils/placeLinks";
import ProfileActionBar from "./ProfileActionBar";
import ProfileCoverGallery from "./ProfileCoverGallery";
import TasteGroups from "./TasteGroups";
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

/**
 * 맛객 프로필(#profile/<accountId>, 보드 01-03·08-03·08-04): 둥글게 깎인 배경 사진 위 큰 얼굴 · 이름 · 소개,
 * 구독하기 버튼, 신뢰·취향·구독자 한 줄, 활동 지역·주요 분야 상자, 추천 맛집(목록·지도), 공개 스타일(묶음별 태그) 순서입니다.
 */
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
  const coverRef = useRef<HTMLDivElement>(null);
  // 배경 사진이 화면 위로 지나가면 위쪽 바에 맛객 이름을 보여 줍니다.
  const isScrolled = useScrolledPast(coverRef);

  // 내 프로필은 비공개 기록까지, 다른 맛객은 공개 기록만 보여 줍니다.
  const records = isOwn
    ? recordsOf(app.myRecords, app.isMyTasterId)
    : recordsOf(app.places, (id) => id === taster.tasterId);
  const subscription = app.subscriptions.find((item) => item.targetAccountId === taster.tasterId);
  const matched = taster.matchedTags ?? [];
  const hasScores = !isOwn && (taster.matchScore != null || taster.trustScore != null);
  const area = activityLabel(taster);
  const focus = focusLabel(taster.tasterFocus);

  return (
    <main className="r-screen r-tasters-profile" data-scrolled={isScrolled}>
      <TopBar
        title={taster.tasterName}
        fallback="tasters"
        right={
          <button
            type="button"
            className="r-icon-button"
            onClick={() => void sharePageWithNotice(`${taster.tasterName} · 맛다공 맛객`, app.actions.notify)}
            aria-label="프로필 공유"
          >
            <Icon name="share" />
          </button>
        }
      />
      <ProfileCoverGallery covers={coversOf(taster)} ref={coverRef} />

      <div className="r-tasters-profile__body">
        <section className="r-tasters-hero" aria-label={`${taster.tasterName} 소개`}>
          <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--hero" />
          <h1 className="r-display">{taster.tasterName}</h1>
          <p className="r-tasters-hero__intro">{introOf(taster)}</p>
          {subscription && (
            <span className={`r-tasters-plan ${subscription.subscriptionType === "FREE" ? "is-free" : ""}`}>
              구독 중 · {planLabel(subscription)}
            </span>
          )}
        </section>

        <ProfileActionBar taster={taster} isOwn={isOwn} />

        {/* 보드의 "신뢰 92% | 취향 78% | 함께 …" 한 줄: 나와의 점수(다른 맛객일 때)와 구독자 수 */}
        <div className="r-tasters-scoreline">
          <Icon name="people" />
          {hasScores && <TasteScore taster={taster} />}
          <span>구독자 {formatNumber(taster.subscriberCount)}명</span>
        </div>

        <dl className="r-tasters-facts">
          <div>
            <dt>
              <Icon name="pin" />
              활동 지역
            </dt>
            <dd>{area ?? "정하지 않았어요"}</dd>
          </div>
          <div>
            <dt>
              <Icon name="tag" />
              주요 분야
            </dt>
            <dd>{focus ?? "정하지 않았어요"}</dd>
          </div>
        </dl>

        <section className="r-tasters-section" aria-labelledby="taster-records-title">
          <SectionHead title={`추천 맛집 ${formatNumber(records.length)}곳`} titleId="taster-records-title" />
          <TasterRecords records={records} isOwn={isOwn} />
        </section>

        <section className="r-tasters-section" aria-labelledby="taster-style-title">
          <SectionHead title="공개 스타일" titleId="taster-style-title" />
          {/* 내 프로필은 나와 비교할 대상이 아니므로 "나와 같아요" 표시를 두지 않습니다. */}
          <TasteGroups tags={tagsOf(taster)} matched={isOwn ? undefined : matched} />
        </section>

        {!isOwn && (
          <TasterReportButton
            tasterId={taster.tasterId}
            tasterName={taster.tasterName}
            className="r-tasters-profile__report"
          />
        )}
      </div>
    </main>
  );
}
