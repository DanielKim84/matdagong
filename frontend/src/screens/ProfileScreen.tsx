import { useState } from "react";
import type { Place, Taster } from "../models/place";
import { back, go } from "../app/navigation";
import { Avatar, FoodPhoto, ProfileCover } from "../components/BrandAssets";
import Icon from "../components/Icon";
import { useNotificationDialog } from "../components/NotificationDialog";
import { groupsForFocus, type TasteTagGroup } from "../models/tasteTags";
import type { ActiveSubscription, TasteTag } from "../services/community";
import "../styles/profile.css";
import { profileCoverFor } from "../utils/profileMedia";
import Sheet from "../components/Sheet";
import PaginationDots from "../components/PaginationDots";
import { swipeHandlers, wrapIndex } from "../utils/swipe";

const groupDetails: Record<TasteTagGroup, { label: string; icon: "fork" | "coffee" | "heart" | "pin" }> = {
  CUISINE: { label: "음식 종류", icon: "fork" },
  TASTE: { label: "맛과 메뉴", icon: "heart" },
  CAFE: { label: "카페와 디저트", icon: "coffee" },
  OCCASION: { label: "방문 스타일", icon: "pin" },
  VISIT: { label: "피하고 싶은 조건", icon: "pin" },
};

function activityDescription(taster: Taster): string | null {
  const scope = taster.activityScope ?? "LOCAL";
  const region = taster.activityRegion?.trim();
  if (scope === "TRAVEL") return "여행·드라이브 전국 맛집";
  if (scope === "BOTH") return region ? `${region} 중심 · 여행·드라이브` : "지역과 여행지 모두";
  return region ? `${region} 중심` : null;
}

export default function ProfileScreen({
  taster,
  places,
  tasteTags,
  subscribed,
  subscription,
  onSubscribe,
  onUnsubscribe,
}: {
  taster: Taster;
  places: Place[];
  tasteTags: TasteTag[];
  subscribed: boolean;
  subscription?: Pick<ActiveSubscription, "subscriptionType" | "endAt">;
  onSubscribe: () => void;
  onUnsubscribe: () => Promise<void>;
}) {
  const [tab, setTab] = useState("맛집");
  const [coverIndex, setCoverIndex] = useState(0);
  const [coverListOpen, setCoverListOpen] = useState(false);
  const [coverViewerOpen, setCoverViewerOpen] = useState(false);
  const { confirm } = useNotificationDialog();
  const own = places.filter((place) =>
    place.tasters.some((item) => item.tasterId === taster.tasterId),
  );
  const publicTagNames = taster.profileTags ?? [];
  const tagGroups = groupsForFocus(taster.tasterFocus ?? "BOTH")
    .map((group) => ({
      group,
      tags: tasteTags.filter((tag) => tag.tagGroup === group && publicTagNames.includes(tag.name)),
    }))
    .filter((group) => group.tags.length > 0);
  const activity = activityDescription(taster);
  const savedCovers = taster.profileCoverUrls?.length ? taster.profileCoverUrls : taster.profileCoverUrl ? [taster.profileCoverUrl] : [];
  const covers = savedCovers.length ? savedCovers : [profileCoverFor(taster.tasterId, null)];
  const coverSlides = covers.length === 1 ? [covers[0], covers[0]] : covers;
  return (
    <main className="profile-screen">
      <div className="profile-cover" {...swipeHandlers(
        (step) => setCoverIndex((current) => wrapIndex(current, step, coverSlides.length)),
        { markSwiped: true },
      )}>
        <div
          className="profile-cover-slide-track"
          role="button"
          tabIndex={0}
          aria-label="프로필 배경 사진 목록 보기"
          onClick={(event) => {
            if (event.currentTarget.parentElement?.dataset.swiped === "true") {
              event.currentTarget.parentElement.dataset.swiped = "false";
              event.preventDefault();
              return;
            }
            setCoverListOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setCoverListOpen(true);
            }
          }}
          style={{ transform: `translateX(-${coverIndex * 100}%)` }}
        >
          {coverSlides.map((cover, index) => <ProfileCover key={`${cover}-${index}`} src={cover} />)}
        </div>
        <button
          className="photo-back icon-button"
          onClick={() => back("my")}
          aria-label="이전 화면으로 돌아가기"
        >
          <Icon name="back" />
        </button>
        {savedCovers.length > 0 && <>
          <span className="profile-cover-count">{(coverIndex % covers.length) + 1}/{covers.length}</span>
          <PaginationDots activeIndex={coverIndex % covers.length} total={covers.length} onSelect={setCoverIndex} className="photo-slide-indicators--cover-below" label="배경 사진 페이지" />
        </>}
      </div>
      <section className="profile-body">
        <Avatar
          className="profile-avatar"
          src={taster.avatar}
          name={taster.tasterName}
          variant={taster.avatarVariant}
        />
        <h1>{taster.tasterName}</h1>
        {activity && <span className="profile-handle"><Icon name="pin" />{activity}</span>}
        <p className="profile-bio">{taster.intro?.trim() || "맛있는 하루를 기록하며 맛집을 탐방합니다."}</p>
        {publicTagNames.length > 0 && (
          <div className="profile-tag-pills">{publicTagNames.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
        )}
        <div className="profile-statistics">
          <span>
            <b>{own.length}</b>맛집 기록
          </span>
          <span>
            <b>{(taster.subscriberCount ?? 0).toLocaleString()}</b>구독자
          </span>
          <span>
            <b>{publicTagNames.length}</b>취향 태그
          </span>
        </div>
        <button
          className={`primary-button ${subscribed ? "is-subscribed" : ""}`}
          onClick={async () => {
            if (!subscribed) return onSubscribe();
            const paidEndDate = subscription?.subscriptionType === "PAID" && subscription.endAt
              ? new Date(subscription.endAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
              : null;
            const accepted = await confirm({
              title: paidEndDate ? "유료 구독을 취소할까요?" : "구독을 취소할까요?",
              message: paidEndDate
                ? "현재 유료 구독 중이에요. 지금 취소하면 구독이 바로 종료돼요."
                : `${taster.tasterName} 맛객의 새 기록 알림과 구독 목록 표시가 중단돼요.`,
              ...(paidEndDate ? { detail: { label: "유료 구독 종료 예정일", value: paidEndDate } } : {}),
              tone: "danger",
              confirmLabel: "구독 취소",
            });
            if (accepted) await onUnsubscribe();
          }}
        >
          {subscribed ? (
            <><Icon name="heart" filled /> 구독 중</>
          ) : (
            <><Icon name="heart" /> 구독하기</>
          )}
        </button>
        <div className="detail-tabs profile-tabs">
          {["맛집", "태그"].map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "맛집" ? (
          <div className="profile-grid">
            {own.length ? own.map((place) => (
              <button className="profile-place-card" key={place.id} onClick={() => go("place", place.id)}>
                <FoodPhoto place={place} />
                <span className="profile-place-copy">
                  <b>{place.name}</b>
                  <small>{place.category}</small>
                </span>
              </button>
            )) : <div className="profile-empty"><Icon name="fork" /><b>아직 소개한 맛집이 없어요</b><span>새로운 맛집을 발견하면 여기에 모아둘게요.</span></div>}
          </div>
        ) : tab === "태그" ? (
          <div className="profile-tag-groups">
            {tagGroups.map(({ group, tags }) => (
              <section key={group} className={`profile-tag-group profile-tag-group--${group.toLowerCase()}`}>
                <h2><span><Icon name={groupDetails[group].icon} /></span>{groupDetails[group].label}<small>{tags.length}개</small></h2>
                <div>{tags.map((tag) => <span key={tag.name}><i>#</i>{tag.name}</span>)}</div>
              </section>
            ))}
            {own.length > 0 && (
              <section className="profile-tag-group">
                <h2><span><Icon name="fork" /></span>소개한 맛집 분야<small>{new Set(own.map((place) => place.category.split(" · ")[0])).size}개</small></h2>
                <div>{[...new Set(own.map((place) => place.category.split(" · ")[0]))]
                  .map((category) => <span key={`place-${category}`}><i>#</i>{category}</span>)}</div>
              </section>
            )}
            {!tagGroups.length && !own.length && <div className="profile-empty"><Icon name="heart" /><b>아직 공개한 스타일이 없어요</b><span>맛집 분야와 취향을 등록하면 여기에 보여요.</span></div>}
          </div>
        ) : null}
      </section>
      {coverListOpen && <Sheet title={`${taster.tasterName}의 사진`} onClose={() => setCoverListOpen(false)} className="place-gallery-sheet">
        <p>프로필 배경 사진을 선택해 볼 수 있어요.</p>
        <div className="profile-cover-gallery-list">{covers.map((cover, index) => <button key={`${cover}-${index}`} onClick={() => { setCoverIndex(index); setCoverListOpen(false); setCoverViewerOpen(true); }}><ProfileCover src={cover} /><span>{index + 1} / {covers.length}</span></button>)}</div>
      </Sheet>}
      {coverViewerOpen && <Sheet title={`${taster.tasterName} 사진 ${coverIndex + 1}/${covers.length}`} onClose={() => setCoverViewerOpen(false)} className="profile-cover-viewer">
        <div className="profile-cover-viewer-stage" {...swipeHandlers(
          (step) => setCoverIndex((current) => wrapIndex(current, step, coverSlides.length)),
        )}><div className="profile-cover-viewer-track" style={{ transform: `translateX(-${coverIndex * 100}%)` }}>{coverSlides.map((cover, index) => <ProfileCover key={`${cover}-${index}`} src={cover} />)}</div>
        </div>
        <PaginationDots activeIndex={coverIndex % covers.length} total={covers.length} onSelect={setCoverIndex} label="배경 사진 페이지" />
      </Sheet>}
    </main>
  );
}
