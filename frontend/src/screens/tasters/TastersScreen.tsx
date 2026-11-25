import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import SelectChip from "../../components/SelectChip";
import { EmptyState, SectionHead, Skeleton, TopBar } from "../../components/ui";
import RecommendCard from "./RecommendCard";
import { TasterFocusChip, TasterRegionButton } from "./TasterFilters";
import TasterRows from "./TasterRows";
import { ScopeNotice, isScopeReady } from "./TasterScopeNotice";
import {
  PAGE_SIZE,
  filterBrowseTasters,
  myAreaLabel,
  hasTravelers,
  searchTasters,
  statsByTaster,
  type BrowseSort,
  type ScopeContext,
  type TasterFocusFilter,
  type TasterScope,
} from "./tasterData";
import { useOnDemandLocation } from "./useOnDemandLocation";

type SubscriptionFilter = "ALL" | "SUBSCRIBED" | "UNSUBSCRIBED";

/** "추천 ▾": 추천순은 믿고 가는 맛객 → 신뢰 % → 취향 %(models/trust compareByTrust), 그다음 구독자 · 기록 많은 순입니다. */
const SORT_OPTIONS: { value: BrowseSort; label: string }[] = [
  { value: "TASTE", label: "추천" },
  { value: "SUBSCRIBERS", label: "구독자순" },
  { value: "RECORDS", label: "기록순" },
];
const SUBSCRIPTION_OPTIONS: { value: SubscriptionFilter; label: string }[] = [
  { value: "ALL", label: "구독" },
  { value: "SUBSCRIBED", label: "구독 중" },
  { value: "UNSUBSCRIBED", label: "구독 안 함" },
];

/**
 * 맛객 탭(#tasters, 보드 08-01·08-02): 로고 아래 맛객 검색창, "나와 잘 맞을 맛객을 추천해요" 제목, 추천 ▾ · 분야 ▾ · 활동 지역 ▾ · 구독 ▾ 칩,
 * 맨 앞 한 명은 큰 추천 카드, 나머지는 맛객 줄로 이어집니다(조건에 드는 맛객 전체, "맛객 더 보기"로 늘림).
 * 검색어를 넣으면 "맛객 검색" 결과 줄만 보여 줍니다. 구독 중·나를 구독한 사람 목록은 구독 관리(#subscriptions)에서 봅니다.
 */
export default function TastersScreen() {
  const app = useAppData();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TasterScope>("ALL");
  const [focus, setFocus] = useState<TasterFocusFilter>("ALL");
  const [sort, setSort] = useState<BrowseSort>("TASTE");
  const [subscription, setSubscription] = useState<SubscriptionFilter>("ALL");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const location = useOnDemandLocation();
  const myAreas = app.myProfile?.activityScope === "TRAVEL" ? [] : (app.myProfile?.activityRegions ?? []);
  const myArea = myAreaLabel(app.myProfile);
  const scopeContext: ScopeContext = { places: app.places, position: location.position, myArea, myAreas };

  const stats = useMemo(() => statsByTaster(app.places), [app.places]);
  const others = app.tasters.filter((taster) => !app.isMyTasterId(taster.tasterId));
  const keyword = query.trim().toLowerCase();
  const searchResults = searchTasters(others, keyword);
  const isFirstLoad = app.isLoading && !app.tasters.length;
  const list = filterBrowseTasters(others, scope, focus, sort, stats, scopeContext).filter((taster) => {
    if (subscription === "ALL") return true;
    return app.subscriptionIds.includes(taster.tasterId) === (subscription === "SUBSCRIBED");
  });

  /** 조건을 바꾸면 처음 몇 명부터 다시 보여 줍니다. */
  function resetting<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setLimit(PAGE_SIZE);
    };
  }

  return (
    <main className="r-screen r-tasters">
      <TopBar title="맛다공 맛객" isBrand />

      <div className="r-tasters-body">
        <label className="r-search-field">
          <Icon name="search" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="맛객을 찾아보세요."
            aria-label="맛객 검색어"
          />
          {query && (
            <button
              type="button"
              className="r-search-field__clear"
              aria-label="검색어 지우기"
              onClick={() => setQuery("")}
            >
              <Icon name="close" />
            </button>
          )}
        </label>

        {keyword ? (
          <section className="r-tasters-section" aria-label="검색 결과">
            <SectionHead title={`검색 결과 ${searchResults.length}명`} />
            {searchResults.length ? (
              <TasterRows tasters={searchResults} stats={stats} />
            ) : (
              <EmptyState title="맞는 맛객을 찾지 못했어요" message="다른 닉네임이나 지역, 취향 태그로 찾아보세요." />
            )}
          </section>
        ) : isFirstLoad ? (
          <Skeleton shape="row" count={4} label="맛객을 불러오고 있어요." />
        ) : app.error && !app.tasters.length ? (
          <EmptyState
            tone="error"
            title="맛객을 불러오지 못했어요"
            message={app.error}
            action={{ label: "다시 불러오기", onClick: app.actions.retry }}
          />
        ) : (
          <>
            <h2 className="r-home-title">나와 잘 맞을 맛객을 추천해요</h2>
            <div className="r-chips" role="toolbar" aria-label="맛객 조건">
              <SelectChip label="정렬" value={sort} options={SORT_OPTIONS} onChange={resetting(setSort)} />
              <TasterFocusChip focus={focus} onFocusChange={resetting(setFocus)} />
              <TasterRegionButton
                scope={scope}
                onScopeChange={resetting(setScope)}
                location={location}
                myArea={myArea}
                hasTravel={hasTravelers(others)}
              />
              <SelectChip
                label="구독"
                value={subscription}
                options={SUBSCRIPTION_OPTIONS}
                onChange={resetting(setSubscription)}
              />
            </div>
            {!isScopeReady(scope, location, myArea) ? (
              // 내 주변인데 위치를 모르거나 내 지역이 없으면 목록 대신 안내 하나만 보여 줍니다.
              <ScopeNotice scope={scope} location={location} myArea={myArea} />
            ) : list.length ? (
              <>
                <RecommendCard taster={list[0]} />
                {list.length > 1 && <TasterRows tasters={list.slice(1, limit)} stats={stats} />}
                {list.length > limit && (
                  <button
                    type="button"
                    className="r-button r-button--secondary r-button--pill r-tasters-more"
                    onClick={() => setLimit((current) => current + PAGE_SIZE)}
                  >
                    맛객 더 보기 ({list.length - limit})
                  </button>
                )}
              </>
            ) : (
              <EmptyState
                title={
                  scope === "MY_AREA" ? `${myArea}에 기록한 맛객이 아직 없어요` : "이 조건에 맞는 맛객이 아직 없어요"
                }
                message="위쪽 칩에서 다른 조건을 골라 보세요."
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
