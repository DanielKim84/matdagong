import { useState } from "react";
import type { Place, Taster } from "../models/place";
import { back, go } from "../app/navigation";
import { Avatar, FoodPhoto, ProfileCover } from "../components/BrandAssets";
import Icon from "../components/Icon";
import { groupsForFocus, type TasteTagGroup } from "../models/tasteTags";
import type { TasteTag } from "../services/community";
import "../styles/profile.css";
import { profileCoverFor } from "../utils/profileMedia";

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
  onSubscribe,
}: {
  taster: Taster;
  places: Place[];
  tasteTags: TasteTag[];
  subscribed: boolean;
  onSubscribe: () => void;
}) {
  const [tab, setTab] = useState("맛집");
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
  return (
    <main className="profile-screen">
      <div className="profile-cover">
        <ProfileCover src={profileCoverFor(taster.tasterId, taster.profileCoverUrl)} />
        <button
          className="photo-back icon-button"
          onClick={() => back("my")}
          aria-label="이전 화면으로 돌아가기"
        >
          <Icon name="back" />
        </button>
        <div className="hero-photo-actions">
          <button onClick={() => go("saved")} aria-label="내 맛집">
            <Icon name="heart" />
          </button>
        </div>
      </div>
      <section className="profile-body">
        <Avatar
          className="profile-avatar"
          src={taster.avatar}
          name={taster.tasterName}
          variant={taster.avatarVariant}
        />
        <h1>{taster.tasterName}</h1>
        <span className="profile-handle">
          @{taster.tasterId.replace("-", "")}_matguest
        </span>
        {activity && <div className="profile-activity"><Icon name="pin" /><span><small>주 활동</small><b>{activity}</b></span></div>}
        <p className="profile-bio">
          {taster.intro ?? "맛있는 하루를 기록하며 맛집을 탐방합니다."}
          <br />
          좋은 맛집이 있으면 언제든 추천해 주세요! <b>♥</b>
        </p>
        <div className="profile-statistics">
          <span>
            <b>{own.length}</b>맛집
          </span>
          <span>
            <b>{taster.subscriberCount ?? 0}</b>구독자
          </span>
        </div>
        <button
          className={`primary-button ${subscribed ? "is-subscribed" : ""}`}
          onClick={onSubscribe}
          disabled={subscribed}
        >
          {subscribed ? (
            <>
              <Icon name="check" />
              구독 중
            </>
          ) : (
            "구독하기"
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
                  <small>{place.category}</small>
                  <b>{place.name}</b>
                  <span><Icon name="pin" />{place.address}</span>
                </span>
              </button>
            )) : <div className="profile-empty"><Icon name="fork" /><b>아직 소개한 맛집이 없어요</b><span>새로운 맛집을 발견하면 여기에 모아둘게요.</span></div>}
          </div>
        ) : tab === "태그" ? (
          <div className="profile-tag-groups">
            {tagGroups.map(({ group, tags }) => (
              <section key={group} className={`profile-tag-group profile-tag-group--${group.toLowerCase()}`}>
                <h2><span><Icon name={groupDetails[group].icon} /></span>{groupDetails[group].label}<small>{tags.length}개</small></h2>
                <div>{tags.map((tag) => <span key={tag.name}>{tag.name}</span>)}</div>
              </section>
            ))}
            {own.length > 0 && (
              <section className="profile-tag-group">
                <h2><span><Icon name="fork" /></span>소개한 맛집 분야<small>{new Set(own.map((place) => place.category.split(" · ")[0])).size}개</small></h2>
                <div>{[...new Set(own.map((place) => place.category.split(" · ")[0]))]
                  .map((category) => <span key={`place-${category}`}>{category}</span>)}</div>
              </section>
            )}
            {!tagGroups.length && !own.length && <div className="profile-empty"><Icon name="heart" /><b>아직 공개한 스타일이 없어요</b><span>맛집 분야와 취향을 등록하면 여기에 보여요.</span></div>}
          </div>
        ) : null}
      </section>
    </main>
  );
}
