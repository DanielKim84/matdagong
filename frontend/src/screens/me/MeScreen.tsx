import { useMemo, useState } from "react";
import { useAppData, type AccountRole } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { SectionHead, TopBar } from "../../components/ui";
import { formatNumber } from "../../utils/format";
import { diaryEntries } from "./diary";
import IncomingSubscribersSheet from "./IncomingSubscribersSheet";
import MeDiaryCard from "./MeDiaryCard";
import MeTile from "./MeTile";
import QuickDraftsSheet from "./QuickDraftsSheet";
import { useQuickPlaceDrafts } from "./useQuickPlaceDrafts";

const ROLE_LABEL: Record<AccountRole, string> = {
  ADMIN: "관리자",
  SUPER_TASTER: "슈퍼 맛객",
  TASTER: "맛객",
  USER: "사용자",
};

/** 나 탭(#my): 프로필 머리, 다이어리 카드, 한눈에 보는 타일, 맛객 활동 요약. */
export default function MeScreen() {
  const app = useAppData();
  const quickDrafts = useQuickPlaceDrafts();
  const [sheet, setSheet] = useState<"incoming" | "drafts" | null>(null);

  const entries = useMemo(
    () => diaryEntries(app.myRecords, app.isMyTasterId, app.photoFor),
    [app.myRecords, app.isMyTasterId, app.photoFor],
  );
  const publicCount = entries.filter((entry) => entry.isPublic).length;
  const paidCount = app.incomingSubscriptions.filter((item) => item.subscriptionType === "PAID").length;
  const freeCount = app.incomingSubscriptions.length - paidCount;
  const savedCount = new Set(app.likedPlaceIds).size;

  return (
    <main className="r-screen r-me">
      <TopBar
        title="나"
        root
        right={
          <button type="button" className="r-icon-button" onClick={() => go("settings")} aria-label="설정">
            <Icon name="settings" />
          </button>
        }
      />
      <section className="r-me-profile" aria-label="내 프로필">
        <button
          type="button"
          className="r-me-profile__avatar"
          onClick={() => go("profile-edit")}
          aria-label="프로필 편집"
        >
          <Avatar
            src={app.myProfile?.profileImgUrl ?? null}
            name={app.nickname}
            variant={app.myProfile?.avatarVariant ?? 1}
          />
        </button>
        <div className="r-me-profile__copy">
          <div className="r-me-profile__name">
            <h2 className="r-display">{app.nickname}</h2>
            <span className={`r-me-role r-me-role--${app.accountRole.toLowerCase()}`}>
              {ROLE_LABEL[app.accountRole]}
            </span>
          </div>
          <div className="r-me-profile__links">
            {app.myProfile && (
              <button type="button" onClick={() => go("profile", app.myProfile?.accountId)}>
                내 맛객 프로필 보기
              </button>
            )}
            <button type="button" onClick={() => go("profile-edit")}>
              프로필 편집
            </button>
          </div>
        </div>
      </section>

      <div className="r-me-body">
        <MeDiaryCard entries={entries} />

        <div className="r-me-tiles">
          <MeTile icon="heart" value={`${savedCount}`} label="저장한 맛집" onClick={() => go("saved")} />
          <MeTile
            icon="star"
            value={`${formatNumber(app.points.balance)} P`}
            label="포인트 지갑"
            tone="amber"
            onClick={() => go("wallet")}
          />
          <MeTile
            icon="user"
            value={`${app.incomingSubscriptions.length}`}
            label="나를 구독하는 맛객"
            onClick={() => setSheet("incoming")}
          />
          <MeTile icon="clock" value={`${app.recentPlaces.length}`} label="최근 본 맛집" onClick={() => go("recent")} />
          <MeTile
            icon="bookmark"
            value={`${app.subscriptionIds.length}`}
            label="내가 구독한 맛객"
            onClick={() => go("subscriptions")}
          />
          <MeTile
            icon="pin"
            value={quickDrafts.isLoaded ? `${quickDrafts.drafts.length}` : "—"}
            label="빠른 장소 기록"
            caption={quickDrafts.isLoading && !quickDrafts.isLoaded ? "불러오는 중" : undefined}
            onClick={() => setSheet("drafts")}
          />
        </div>

        <section className="r-me-section">
          <SectionHead title="맛객 활동" />
          <div className="r-card r-me-activity">
            <dl className="r-me-stats">
              <div>
                <dt>공개 기록</dt>
                <dd>
                  {publicCount}
                  <small>곳</small>
                </dd>
              </div>
              <div>
                <dt>나만 보기</dt>
                <dd>
                  {entries.length - publicCount}
                  <small>곳</small>
                </dd>
              </div>
              <div>
                <dt>구독자</dt>
                <dd>
                  {app.incomingSubscriptions.length}
                  <small>명</small>
                </dd>
              </div>
            </dl>
            <p className="r-me-activity__note r-muted">
              {app.incomingSubscriptions.length
                ? `유료 구독 ${paidCount}명 · 무료 구독 ${freeCount}명이 내 기록을 받아보고 있어요.`
                : publicCount
                  ? "공개 기록이 쌓이면 나와 취향이 맞는 사람들이 구독할 수 있어요."
                  : "기록을 공개하면 다른 사람들이 나를 맛객으로 구독할 수 있어요."}
            </p>
          </div>
          <button type="button" className="r-card r-me-link" onClick={() => go("taster-recommendations")}>
            <span className="r-badge-icon">
              <Icon name="sparkle" />
            </span>
            <span className="r-row__copy">
              <b>취향 맛객 추천</b>
              <small>나와 잘 맞는 맛객 {app.recommendedTasters.length}명을 둘러보세요</small>
            </span>
            <Icon name="chevron" />
          </button>
        </section>
      </div>

      {sheet === "incoming" && <IncomingSubscribersSheet onClose={() => setSheet(null)} />}
      {sheet === "drafts" && <QuickDraftsSheet quickDrafts={quickDrafts} onClose={() => setSheet(null)} />}
    </main>
  );
}
