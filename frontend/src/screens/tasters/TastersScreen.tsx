import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar, ProfileCover } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { Segmented, SectionHead, TopBar } from "../../components/ui";
import type { Taster } from "../../models/place";
import { IncomingList, SubscribedList } from "./SubscriptionLists";
import { activityLabel, coverOf, fallbackTaster, introOf, statsByTaster, tagsOf, type TasterStats } from "./tasterData";

type Tab = "recommend" | "subscribed" | "incoming";
type Focus = "ALL" | "RESTAURANT" | "CAFE_DESSERT";

const TRAVEL = "__travel";
const PAGE = 12;

/** 맛객 탭(#tasters): 취향 일치로 맛객을 고르고, 구독 중·나를 구독한 사람을 봅니다. */
export default function TastersScreen() {
  const app = useAppData();
  const [tab, setTab] = useState<Tab>("recommend");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [focus, setFocus] = useState<Focus>("ALL");
  const [limit, setLimit] = useState(PAGE);

  const stats = useMemo(() => statsByTaster(app.places), [app.places]);
  const others = app.tasters.filter((taster) => !app.isMyTasterId(taster.tasterId));

  // 활동 지역 칩: 맛객이 많은 지역 순으로 최대 8개
  const regionCounts = new Map<string, number>();
  others.forEach((taster) => {
    const name = taster.activityScope !== "TRAVEL" ? taster.activityRegion?.trim() : "";
    if (name) regionCounts.set(name, (regionCounts.get(name) ?? 0) + 1);
  });
  const regions = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  const hasTravel = others.some((taster) => taster.activityScope === "TRAVEL" || taster.activityScope === "BOTH");

  const local = others
    .filter((taster) => {
      if (region === TRAVEL) return taster.activityScope === "TRAVEL" || taster.activityScope === "BOTH";
      if (region) return taster.activityScope !== "TRAVEL" && taster.activityRegion?.trim() === region;
      return true;
    })
    .filter((taster) => {
      if (focus === "ALL") return true;
      return taster.tasterFocus === focus || taster.tasterFocus === "BOTH";
    })
    .sort((a, b) => (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0)
      || (stats.get(b.tasterId)?.count ?? 0) - (stats.get(a.tasterId)?.count ?? 0));

  const keyword = query.trim().toLowerCase();
  const searchResults = keyword
    ? others.filter((taster) =>
      [taster.tasterName, taster.intro, taster.activityRegion, ...tagsOf(taster)]
        .some((text) => text?.toLowerCase().includes(keyword)))
    : [];

  const subscribedTasters = app.subscriptions.map((subscription) =>
    app.tasterById.get(subscription.targetAccountId)
    ?? fallbackTaster(subscription.targetAccountId, subscription.targetNickname));

  const firstLoad = app.loading && !app.tasters.length;

  return (
    <main className="r-screen r-tasters-screen">
      <TopBar
        title="맛객"
        root
        right={
          <button
            type="button"
            className="r-icon-button"
            aria-label={searchOpen ? "맛객 검색 닫기" : "맛객 검색"}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((open) => !open);
              setQuery("");
            }}
          >
            <Icon name={searchOpen ? "close" : "search"} />
          </button>
        }
      />

      <div className="r-tasters-body">
        {searchOpen && (
          <label className="r-tasters-search">
            <Icon name="search" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="닉네임, 지역, 취향 태그로 찾기"
              aria-label="맛객 검색어"
            />
          </label>
        )}

        {keyword ? (
          <section className="r-tasters-section" aria-label="검색 결과">
            <SectionHead title={`검색 결과 ${searchResults.length}`} />
            {searchResults.length ? (
              <TasterRows tasters={searchResults} stats={stats} />
            ) : (
              <div className="r-empty"><b>맞는 맛객을 찾지 못했어요</b><p>다른 닉네임이나 지역, 취향 태그로 찾아보세요.</p></div>
            )}
          </section>
        ) : (
          <>
            <Segmented
              label="맛객 보기"
              value={tab}
              onChange={setTab}
              options={[
                { value: "recommend", label: "추천" },
                { value: "subscribed", label: `구독 중 ${app.subscriptions.length}` },
                { value: "incoming", label: `나를 구독 ${app.incomingSubscriptions.length}` },
              ]}
            />

            {firstLoad ? (
              <div className="r-empty" role="status"><p>맛객을 불러오고 있어요…</p></div>
            ) : app.error && !app.tasters.length ? (
              <div className="r-empty" role="alert">
                <b>맛객을 불러오지 못했어요</b>
                <p>{app.error}</p>
                <button type="button" className="r-button r-button--secondary r-button--pill" onClick={app.actions.retry}>다시 불러오기</button>
              </div>
            ) : tab === "subscribed" ? (
              <section className="r-tasters-section">
                <SectionHead title="구독 중인 맛객" action="구독 관리" onAction={() => go("subscriptions")} />
                <SubscribedList />
              </section>
            ) : tab === "incoming" ? (
              <section className="r-tasters-section">
                <SectionHead title="나를 구독한 사람" action="구독 관리" onAction={() => go("subscriptions")} />
                <IncomingList />
              </section>
            ) : (
              <>
                {subscribedTasters.length > 0 && (
                  <section className="r-tasters-section">
                    <SectionHead title="내가 구독한 맛객" action="관리" onAction={() => go("subscriptions")} />
                    <div className="r-tasters-strip">
                      {subscribedTasters.map((taster) => (
                        <button type="button" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
                          <Avatar className="r-tasters-avatar r-tasters-avatar--lg" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                          <span>{taster.tasterName}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <section className="r-tasters-section">
                  <SectionHead title="취향이 잘 맞는 맛객" action="취향 수정" onAction={() => go("profile-edit", "taste")} />
                  {app.recommendedTasters.length ? (
                    <div className="r-tasters-carousel">
                      {app.recommendedTasters.slice(0, 10).map((taster) => (
                        <RecommendCard key={taster.tasterId} taster={taster} />
                      ))}
                    </div>
                  ) : (
                    // 취향을 이미 골랐다면 입맛 맞는 맛객을 모두 구독 중인 경우라 취향 설정 대신 취향 넓히기를 권합니다.
                    <div className="r-card r-card--flat r-empty r-tasters-empty-card">
                      <b>{app.myProfile?.preferenceTags.length ? "입맛 맞는 맛객을 모두 구독했어요" : "아직 추천할 맛객이 없어요"}</b>
                      <p>{app.myProfile?.preferenceTags.length
                        ? "취향을 더 고르면 새로운 맛객을 찾아드려요."
                        : "추천 취향을 고르면 입맛이 맞는 맛객을 찾아드려요."}</p>
                      <button type="button" className="r-button r-button--soft r-button--pill" onClick={() => go("profile-edit", "taste")}>
                        {app.myProfile?.preferenceTags.length ? "취향 더 고르기" : "내 취향 설정하기"}
                      </button>
                    </div>
                  )}
                </section>

                <section className="r-tasters-section">
                  <SectionHead title="동네 맛객" />
                  {(regions.length > 0 || hasTravel) && (
                    <div className="r-chips r-tasters-chips" role="group" aria-label="활동 지역">
                      <button type="button" className={`r-chip ${region === "" ? "is-on" : ""}`} aria-pressed={region === ""} onClick={() => { setRegion(""); setLimit(PAGE); }}>전체 지역</button>
                      {regions.map((name) => (
                        <button type="button" key={name} className={`r-chip ${region === name ? "is-on" : ""}`} aria-pressed={region === name} onClick={() => { setRegion(name); setLimit(PAGE); }}>
                          {name}
                        </button>
                      ))}
                      {hasTravel && (
                        <button type="button" className={`r-chip ${region === TRAVEL ? "is-on" : ""}`} aria-pressed={region === TRAVEL} onClick={() => { setRegion(TRAVEL); setLimit(PAGE); }}>여행·드라이브</button>
                      )}
                    </div>
                  )}
                  <div className="r-chips r-tasters-chips r-tasters-chips--small" role="group" aria-label="분야">
                    {([["ALL", "모든 분야"], ["RESTAURANT", "식당"], ["CAFE_DESSERT", "카페·디저트"]] as const).map(([value, label]) => (
                      <button type="button" key={value} className={`r-chip ${focus === value ? "is-on" : ""}`} aria-pressed={focus === value} onClick={() => { setFocus(value); setLimit(PAGE); }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {local.length ? (
                    <>
                      <p className="r-tasters-note">구독자 많은 순</p>
                      <TasterRows tasters={local.slice(0, limit)} stats={stats} />
                      {local.length > limit && (
                        <button type="button" className="r-button r-button--secondary r-button--pill r-tasters-more" onClick={() => setLimit((value) => value + PAGE)}>
                          맛객 더 보기 ({local.length - limit})
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="r-empty"><b>이 조건의 맛객이 아직 없어요</b><p>다른 지역이나 분야를 골라 보세요.</p></div>
                  )}
                  <button
                    type="button"
                    className="r-tasters-bundle"
                    onClick={() => app.actions.notify({ kind: "info", title: "지역 묶음 구독은 준비 중이에요", message: "지금은 맛객을 한 명씩 구독할 수 있어요." })}
                  >
                    <span className="r-tasters-bundle__icon"><Icon name="pin" /></span>
                    <span><b>지역 묶음 구독</b> · {region && region !== TRAVEL ? `${region} ` : "동네 "}맛객 여럿을 한 번에 (준비 중)</span>
                  </button>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** 취향 일치 맛객 카드: 커버 위 일치율, 아바타, 소개, 태그, 구독 버튼 */
function RecommendCard({ taster }: { taster: Taster }) {
  const app = useAppData();
  const tags = taster.matchedTags?.length ? taster.matchedTags : tagsOf(taster);
  const place = activityLabel(taster);
  return (
    <article className="r-card r-tasters-rec">
      <button type="button" className="r-tasters-rec__open" onClick={() => go("profile", taster.tasterId)} aria-label={`${taster.tasterName} 프로필 보기`}>
        <span className="r-tasters-rec__cover">
          <ProfileCover src={coverOf(taster)} />
          {taster.matchScore != null && <span className="r-match">취향 {taster.matchScore}%</span>}
        </span>
        <span className="r-tasters-rec__copy">
          <Avatar className="r-tasters-avatar r-tasters-avatar--ring" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
          <b className="r-display">{taster.tasterName}</b>
          <small>{place ? `${place} · ` : ""}{introOf(taster)}</small>
          {tags.length > 0 && (
            <span className="r-tags">{tags.slice(0, 2).map((tag) => <span key={tag} className="r-tag">{tag}</span>)}</span>
          )}
        </span>
      </button>
      <button type="button" className="r-button r-button--primary r-button--pill r-tasters-rec__cta" onClick={() => app.actions.openSubscription(taster.tasterId)}>
        구독하기
      </button>
    </article>
  );
}

/** 맛객 목록 줄: 아바타, 이름, 기록 수·구독자 수, 오른쪽에 구독 상태나 취향 일치율 */
function TasterRows({ tasters, stats }: { tasters: Taster[]; stats: Map<string, TasterStats> }) {
  const app = useAppData();
  return (
    <div className="r-card r-tasters-list">
      {tasters.map((taster) => {
        const count = stats.get(taster.tasterId)?.count ?? taster.placeCount ?? 0;
        const place = activityLabel(taster);
        const subscribed = app.subscriptionIds.includes(taster.tasterId);
        return (
          <button type="button" className="r-row" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
            <Avatar className="r-tasters-avatar r-tasters-avatar--md" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
            <span className="r-row__copy">
              <b>{taster.tasterName}</b>
              <small>
                기록 {count.toLocaleString()}곳 · 구독자 {(taster.subscriberCount ?? 0).toLocaleString()}
                {place ? ` · ${place}` : ""}
              </small>
            </span>
            {subscribed ? (
              <span className="r-tasters-state">구독 중</span>
            ) : taster.matchScore ? (
              <span className="r-match">취향 {taster.matchScore}%</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
