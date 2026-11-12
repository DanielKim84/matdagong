import { useAppData, type AccountRole } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { TopBar } from "../../components/ui";
import { formatNumber } from "../../utils/format";
import MeDiaryCard from "./MeDiaryCard";
import MeTile, { MeTilePair } from "./MeTile";
import { useMyPlaceEntries } from "./myPlaceCollection";
import { useDiaryEntries } from "./useDiaryEntries";
import { useQuickPlaceDrafts } from "./useQuickPlaceDrafts";

const ROLE_LABEL: Record<AccountRole, string> = {
  ADMIN: "관리자",
  SUPER_TASTER: "슈퍼 맛객",
  TASTER: "맛객",
  USER: "사용자",
};

/** 나 탭(#my): 프로필 머리, 다이어리 카드, 맛객 활동 요약, 바로 가기 타일, 취향 맛객 추천 링크. */
export default function MeScreen() {
  const app = useAppData();
  const quickDrafts = useQuickPlaceDrafts();

  const entries = useDiaryEntries();
  const publicCount = entries.filter((entry) => entry.isPublic).length;
  const paidCount = app.incomingSubscriptions.filter((item) => item.subscriptionType === "PAID").length;
  const freeCount = app.incomingSubscriptions.length - paidCount;
  // 모음 화면과 같은 목록의 수라, 타일을 눌러 들어가도 숫자가 같습니다.
  const myPlaceCount = useMyPlaceEntries().length;

  return (
    <main className="r-screen r-me">
      <TopBar
        title="나"
        isRoot
        right={
          <button type="button" className="r-icon-button" onClick={() => go("settings")} aria-label="설정">
            <Icon name="settings" />
          </button>
        }
      />
      {app.myProfile?.hiddenByReports && (
        <p className="r-me-hidden-notice" role="status">
          <b>신고가 쌓여 내 프로필이 임시로 가려졌어요.</b>
          다른 맛객에게 내 프로필과 기록이 보이지 않고, 새 기록을 남길 수 없어요. 운영팀이 확인한 뒤 다시 알려 드릴게요.
        </p>
      )}
      {/*
        내 프로필 카드: 사진(올린 사진, 없으면 고른 기본 캐릭터)을 누르면 사진을 바꾸는 프로필 편집으로 갑니다(카메라 표시).
        아래 두 버튼은 고치기(프로필 편집)와, 다른 사람에게 보이는 내 맛객 프로필 보기입니다.
      */}
      <section className="r-card r-me-profile" aria-label="내 프로필">
        <div className="r-me-profile__main">
          <button
            type="button"
            className="r-me-profile__avatar"
            onClick={() => go("profile-edit")}
            aria-label="프로필 사진 바꾸기"
          >
            <Avatar
              src={app.myProfile?.profileImgUrl ?? null}
              name={app.nickname}
              variant={app.myProfile?.avatarVariant ?? 1}
            />
            <span className="r-me-profile__camera" aria-hidden="true">
              <Icon name="camera" />
            </span>
          </button>
          <div className="r-me-profile__copy">
            <div className="r-me-profile__name">
              <h2 className="r-display">{app.nickname}</h2>
              <span className={`r-me-role r-me-role--${app.accountRole.toLowerCase()}`}>
                {ROLE_LABEL[app.accountRole]}
              </span>
            </div>
            <small>
              {app.myProfile
                ? "다른 맛객에게 보이는 내 사진과 이름이에요"
                : "사진과 이름을 정하고 맛객 활동을 시작해 보세요"}
            </small>
          </div>
        </div>
        <div className="r-me-profile__actions">
          <button type="button" className="r-button r-button--pill r-button--soft" onClick={() => go("profile-edit")}>
            <Icon name="pencil" />
            프로필 편집
          </button>
          {app.myProfile && (
            <button
              type="button"
              className="r-button r-button--pill r-button--secondary"
              onClick={() => go("profile", app.myProfile?.accountId)}
            >
              <Icon name="user" />
              공개 프로필 보기
            </button>
          )}
        </div>
      </section>

      <div className="r-me-body">
        <MeDiaryCard entries={entries} />

        {/* 내가 관리하는 기록(공개·나만 보기)과 구독자가 가장 중요해 다이어리 바로 아래에 둡니다. */}
        <section className="r-card r-me-feature" aria-label="맛객 활동">
          <span className="r-me-feature__head">
            <small lang="en">TASTER ACTIVITY</small>
            <b className="r-display">맛객 활동</b>
          </span>
          <div className="r-me-activity">
            {/* 숫자를 누르면 내 맛집 모음의 공개·나만 보기 칩(여기서 공개 범위도 바꿈)과 구독자 화면으로 바로 갑니다. */}
            <div className="r-me-stats">
              <button type="button" onClick={() => go("saved", "mine")}>
                <span>공개 기록</span>
                <b>
                  {publicCount}
                  <small>곳</small>
                </b>
              </button>
              <button type="button" onClick={() => go("saved", "private")}>
                <span>나만 보기</span>
                <b>
                  {entries.length - publicCount}
                  <small>곳</small>
                </b>
              </button>
              <button type="button" onClick={() => go("subscriptions", "incoming")}>
                <span>구독자</span>
                <b>
                  {app.incomingSubscriptions.length}
                  <small>명</small>
                </b>
              </button>
            </div>
            <p className="r-me-activity__note r-muted">
              {app.incomingSubscriptions.length
                ? `유료 구독 ${paidCount}명 · 무료 구독 ${freeCount}명이 내 기록을 받아보고 있어요.`
                : publicCount
                  ? "공개 기록이 쌓이면 나와 취향이 맞는 사람들이 구독할 수 있어요."
                  : "기록을 공개하면 다른 사람들이 나를 맛객으로 구독할 수 있어요."}
            </p>
          </div>
        </section>

        {/* 두 칸씩 짝지어 둡니다: 내 맛집(모음·최근 본 곳) / 구독·포인트 / 빠른 기록·별로였던 곳. */}
        <div className="r-me-tiles">
          <MeTile
            icon="heart"
            value={`${myPlaceCount}`}
            label="내 맛집 모음"
            caption="등록·다녀온·가볼 곳"
            onClick={() => go("saved")}
          />
          <MeTile icon="clock" value={`${app.recentPlaces.length}`} label="최근 본 맛집" onClick={() => go("recent")} />
          <MeTile
            icon="bookmark"
            value={
              <MeTilePair
                items={[
                  { count: app.subscriptionIds.length, label: "구독 중" },
                  { count: app.incomingSubscriptions.length, label: "나를 구독" },
                ]}
              />
            }
            label="구독 관리"
            onClick={() => go("subscriptions")}
          />
          <MeTile
            icon="star"
            value={`${formatNumber(app.points.balance)} P`}
            label="포인트 지갑"
            tone="amber"
            onClick={() => go("wallet")}
          />
          <MeTile
            icon="pin"
            value={quickDrafts.isLoaded ? `${quickDrafts.drafts.length}` : "—"}
            label="빠른 장소 기록"
            caption={quickDrafts.isLoading && !quickDrafts.isLoaded ? "불러오는 중" : "이어서 기록할 곳"}
            onClick={() => go("drafts")}
          />
          {/* 하트를 풀며 별로였어요를 고른 곳은 지도에서 빠지므로, 잘못 고른 곳을 되돌릴 수 있게 둡니다. */}
          <MeTile
            icon="pin-off"
            value={`${app.dislikedPlaceIds.length}`}
            label="별로였던 곳"
            caption="지도에서 뺀 곳"
            onClick={() => go("disliked")}
          />
        </div>

        <section className="r-me-section" aria-label="추천">
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
    </main>
  );
}
