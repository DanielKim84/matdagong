import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { back, go, useRoute } from "../../app/navigation";
import { Avatar, FoodPhoto, ProfileCover } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import MapCanvas from "../../components/MapCanvas";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { relativeTime, TopBar } from "../../components/ui";
import type { Taster } from "../../models/place";
import type { TasteTag } from "../../services/community";
import {
  activityLabel,
  coverOf,
  focusLabel,
  formatDate,
  introOf,
  planLabel,
  recordsOf,
  tagsOf,
} from "./tasterData";

type Tab = "map" | "list" | "taste";

const groupLabels: Record<TasteTag["tagGroup"], string> = {
  CUISINE: "음식 종류",
  TASTE: "맛과 메뉴",
  CAFE: "카페와 디저트",
  OCCASION: "방문 스타일",
  VISIT: "매장 이용",
};

/** 맛객 프로필(#profile/<accountId>): 취향 일치, 통계, 맛집 지도와 기록 목록. */
export default function TasterProfileScreen() {
  const app = useAppData();
  const route = useRoute();
  const own = app.isMyTasterId(route.id);
  const myself: Taster | undefined = own && app.myProfile
    ? {
      tasterId: app.myProfile.accountId,
      tasterName: app.nickname,
      tag: app.myProfile.profileTags.join(" · ") || "맛객",
      avatar: app.myProfile.profileImgUrl ?? "",
      avatarVariant: app.myProfile.avatarVariant,
      note: "",
      intro: app.myProfile.intro ?? undefined,
      profileCoverUrl: app.myProfile.profileCoverUrl,
      profileCoverUrls: app.myProfile.profileCoverUrls,
      tasterFocus: app.myProfile.tasterFocus,
      activityScope: app.myProfile.activityScope,
      activityRegion: app.myProfile.activityRegion,
      profileTags: app.myProfile.profileTags,
      subscriberCount: app.incomingSubscriptions.length,
    }
    : undefined;
  const found = app.tasterById.get(route.id);
  // 내 프로필은 맛객 목록에 없을 수 있어 내 프로필 정보로 채웁니다.
  const taster = found && myself ? { ...myself, ...found, subscriberCount: found.subscriberCount ?? myself.subscriberCount } : found ?? myself;

  if (!taster) {
    return (
      <main className="r-screen">
        <TopBar title="맛객 프로필" fallback="tasters" />
        <div className="r-empty" role={app.loading ? "status" : undefined}>
          <b>{app.loading ? "맛객 정보를 불러오고 있어요…" : "맛객 정보를 찾을 수 없어요"}</b>
          {!app.loading && <p>프로필을 비공개로 바꿨거나 탈퇴한 맛객일 수 있어요.</p>}
          {!app.loading && (
            <button type="button" className="r-button r-button--secondary r-button--pill" onClick={() => go("tasters")}>맛객 찾기로 가기</button>
          )}
        </div>
      </main>
    );
  }
  return <Profile key={taster.tasterId} taster={taster} own={own} />;
}

function Profile({ taster, own }: { taster: Taster; own: boolean }) {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [tab, setTab] = useState<Tab>("map");
  const [busy, setBusy] = useState(false);

  // 내 프로필은 비공개 기록까지, 다른 맛객은 공개 기록만 보여 줍니다.
  const list = own
    ? recordsOf(app.myRecords, app.isMyTasterId)
    : recordsOf(app.places, (id) => id === taster.tasterId);
  const latest = list.find((record) => record.entry.recordedAt)?.entry.recordedAt;

  const subscription = app.subscriptions.find((item) => item.targetAccountId === taster.tasterId);
  const subscribed = !!subscription || app.subscriptionIds.includes(taster.tasterId);
  const tags = tagsOf(taster);
  const matched = taster.matchedTags ?? [];
  const area = activityLabel(taster);
  const focus = focusLabel(taster.tasterFocus);

  async function unsubscribe() {
    const paidEnd = subscription?.subscriptionType === "PAID" && subscription.endAt ? formatDate(subscription.endAt) : null;
    const accepted = await confirm({
      title: paidEnd ? "유료 구독을 해지할까요?" : "구독을 해지할까요?",
      message: paidEnd
        ? "지금 해지하면 남은 기간과 관계없이 구독이 바로 끝나요."
        : `${taster.tasterName} 맛객의 새 기록 알림과 구독 피드 표시가 멈춰요.`,
      ...(paidEnd ? { detail: { label: "원래 종료 예정일", value: paidEnd } } : {}),
      tone: "danger",
      confirmLabel: "구독 해지",
    });
    if (!accepted) return;
    setBusy(true);
    try {
      await app.actions.cancelTasterSubscription(taster.tasterId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="r-screen r-tasters-profile">
      <div className="r-tasters-profile__cover">
        <ProfileCover src={coverOf(taster)} />
        <button type="button" className="r-icon-button r-icon-button--float" onClick={() => back("tasters")} aria-label="이전 화면으로 돌아가기">
          <Icon name="back" />
        </button>
      </div>

      <div className="r-tasters-profile__body">
        <div className="r-tasters-profile__head">
          <Avatar className="r-tasters-avatar r-tasters-avatar--xl" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
          <dl className="r-tasters-stats">
            <div><dt>기록</dt><dd>{list.length.toLocaleString()}</dd></div>
            <div><dt>구독자</dt><dd>{(taster.subscriberCount ?? 0).toLocaleString()}</dd></div>
            <div><dt>최근 기록</dt><dd>{relativeTime(latest) || "-"}</dd></div>
          </dl>
        </div>

        <div className="r-tasters-profile__intro">
          <h1 className="r-display">{taster.tasterName}</h1>
          <p>{introOf(taster)}</p>
          {(area || focus) && (
            <span className="r-tasters-profile__meta">
              {area && <span><Icon name="pin" />{area}</span>}
              {focus && <span><Icon name={taster.tasterFocus === "CAFE_DESSERT" ? "coffee" : "fork"} />{focus}</span>}
            </span>
          )}
          {subscription && (
            <span className={`r-tasters-plan ${subscription.subscriptionType === "FREE" ? "is-free" : ""}`}>구독 중 · {planLabel(subscription)}</span>
          )}
        </div>

        {!own && taster.matchScore != null && (
          <section className="r-card r-tasters-match" aria-label="나와 취향 일치">
            <div className="r-tasters-match__top">
              <b>나와 취향</b>
              <strong>{taster.matchScore}%</strong>
            </div>
            <div className="r-tasters-match__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={taster.matchScore} aria-label="취향 일치율">
              <i style={{ width: `${Math.min(100, Math.max(0, taster.matchScore))}%` }} />
            </div>
            {matched.length ? (
              <div className="r-tags">{matched.map((tag) => <span key={tag} className="r-tag">{tag} ✓</span>)}</div>
            ) : (
              <small className="r-muted">아직 겹치는 취향 태그가 없어요.</small>
            )}
          </section>
        )}

        <div className="r-tasters-tabs" role="tablist" aria-label="맛객 기록 보기">
          {([["map", "맛집 지도"], ["list", "기록 목록"], ["taste", "취향"]] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>
              {label}{value === "list" && list.length > 0 ? ` ${list.length}` : ""}
            </button>
          ))}
        </div>

        {tab === "map" ? (
          list.length ? (
            <div className="r-tasters-map">
              <MapCanvas
                places={list.map((record) => record.place)}
                subscriptions={app.subscriptionIds}
                onSelect={(place) => go("place", place.id)}
                fitToPlaces
              />
            </div>
          ) : <EmptyRecords own={own} />
        ) : tab === "list" ? (
          list.length ? (
            <div className="r-tasters-records">
              {list.map(({ place, entry }) => {
                const photo = entry.photos?.[0] ?? (own ? app.photoFor(place.id) : undefined);
                const when = relativeTime(entry.recordedAt);
                return (
                  <button type="button" className="r-row" key={place.id} onClick={() => go("place", place.id)}>
                    {photo ? <img className="r-thumb" src={photo} alt="" /> : <span className="r-thumb"><FoodPhoto place={place} /></span>}
                    <span className="r-row__copy">
                      <b>{place.name}</b>
                      <small>{[place.category, when].filter(Boolean).join(" · ")}</small>
                      {entry.note && <small className="r-tasters-records__note">{entry.note}</small>}
                    </span>
                    {own && entry.visibility === "PRIVATE" && <span className="r-tag r-tag--neutral">비공개</span>}
                  </button>
                );
              })}
            </div>
          ) : <EmptyRecords own={own} />
        ) : (
          <TasteGroups tags={tags} matched={matched} options={app.tasteTags} />
        )}
      </div>

      <div className="r-action-bar">
        {own ? (
          <button type="button" className="r-button r-button--primary r-button--block" onClick={() => go("profile-edit")}>
            <Icon name="settings" /> 프로필 편집
          </button>
        ) : (
          <>
            <button
              type="button"
              className="r-button r-button--secondary r-tasters-support"
              onClick={() => app.actions.notify({ kind: "info", title: "후원은 준비 중이에요", message: "곧 마음에 드는 맛객을 응원할 수 있어요." })}
            >
              후원
            </button>
            {subscribed ? (
              <button
                type="button"
                className="r-button r-button--secondary r-tasters-subscribed"
                disabled={busy}
                onClick={() => void unsubscribe()}
                aria-label={`${taster.tasterName} 구독 중, 눌러서 구독 해지`}
              >
                <Icon name="check" /> {busy ? "해지하고 있어요…" : "구독 중"}
              </button>
            ) : (
              <button type="button" className="r-button r-button--primary r-tasters-subscribe" onClick={() => app.actions.openSubscription(taster.tasterId)}>
                {app.currentFreeSubscription ? "구독하기" : "구독하기 · 첫 구독 무료"}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function EmptyRecords({ own }: { own: boolean }) {
  return (
    <div className="r-empty">
      <span className="r-badge-icon"><Icon name="fork" /></span>
      <b>{own ? "아직 남긴 기록이 없어요" : "아직 공개한 기록이 없어요"}</b>
      <p>{own ? "다녀온 맛집을 기록하면 여기 지도와 목록에 모여요." : "새 기록을 남기면 구독자에게 알려 드려요."}</p>
      {own && <button type="button" className="r-button r-button--primary r-button--pill" onClick={() => go("register")}>기록 남기기</button>}
    </div>
  );
}

/** 공개 취향 태그를 분류별로 묶고, 나와 겹치는 태그는 강조합니다. */
function TasteGroups({ tags, matched, options }: { tags: string[]; matched: string[]; options: TasteTag[] }) {
  if (!tags.length) {
    return (
      <div className="r-empty">
        <span className="r-badge-icon"><Icon name="heart" /></span>
        <b>아직 공개한 취향이 없어요</b>
      </div>
    );
  }
  const groups = new Map<string, string[]>();
  tags.forEach((tag) => {
    const group = options.find((option) => option.name === tag)?.tagGroup;
    const label = group ? groupLabels[group] : "기타";
    groups.set(label, [...(groups.get(label) ?? []), tag]);
  });
  return (
    <div className="r-tasters-taste">
      {[...groups.entries()].map(([label, items]) => (
        <section key={label}>
          <h2>{label}</h2>
          <div className="r-tags">
            {items.map((tag) => (
              <span key={tag} className={matched.includes(tag) ? "r-tag" : "r-tag r-tag--neutral"}>
                {tag}{matched.includes(tag) ? " ✓" : ""}
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
