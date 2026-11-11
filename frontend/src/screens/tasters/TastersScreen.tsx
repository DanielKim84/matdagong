import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import TasterAvatar from "../../components/TasterAvatar";
import { EmptyState, SectionHead, Skeleton, TopBar } from "../../components/ui";
import BrowseTasters from "./BrowseTasters";
import RecommendCard from "./RecommendCard";
import { RecommendNote, TasterFocusTabs, TasterRegionButton } from "./TasterFilters";
import TasterRows from "./TasterRows";
import { ScopeNotice, isScopeReady } from "./TasterScopeNotice";
import {
  PAGE_SIZE,
  areaKey,
  hasTravelers,
  isInScope,
  matchesFocus,
  scopeRecordCounts,
  searchTasters,
  statsByTaster,
  subscribedTaster,
  type BrowseFilter,
  type ScopeContext,
  type TasterFocusFilter,
  type TasterScope,
} from "./tasterData";
import { useOnDemandLocation } from "./useOnDemandLocation";

/** 추천 카드 묶음에 보여 줄 최대 맛객 수 */
const RECOMMEND_LIMIT = 10;

/**
 * 맛객 탭(#tasters): 취향 일치로 맛객을 고르고 둘러봅니다. 구독 중인 맛객은 위쪽 가로 줄로만 보여 주고,
 * 구독 중·나를 구독한 사람 목록은 구독 관리(#subscriptions) 한 곳에서 봅니다(같은 목록을 두 군데 두지 않음).
 */
export default function TastersScreen() {
  const app = useAppData();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  // 지역(제목 옆 버튼)·분야(밑줄 탭) 조건은 한 번만 두고 취향 맞는 맛객과 맛객 둘러보기가 함께 따릅니다(같은 조건을 두 번 고르지 않게).
  const [scope, setScope] = useState<TasterScope>("ALL");
  const [focus, setFocus] = useState<TasterFocusFilter>("ALL");
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>({ sort: "SUBSCRIBERS", limit: PAGE_SIZE });
  const location = useOnDemandLocation();
  const myArea = app.myProfile?.activityScope === "TRAVEL" ? null : areaKey(app.myProfile?.activityRegion);
  const scopeContext: ScopeContext = { places: app.places, position: location.position, myArea };

  function changeScope(next: TasterScope) {
    setScope(next);
    setBrowseFilter((current) => ({ ...current, limit: PAGE_SIZE }));
  }
  function changeFocus(next: TasterFocusFilter) {
    setFocus(next);
    setBrowseFilter((current) => ({ ...current, limit: PAGE_SIZE }));
  }

  const stats = useMemo(() => statsByTaster(app.places), [app.places]);
  const others = app.tasters.filter((taster) => !app.isMyTasterId(taster.tasterId));
  const keyword = query.trim().toLowerCase();
  const searchResults = searchTasters(others, keyword);
  const isFirstLoad = app.isLoading && !app.tasters.length;

  return (
    <main className="r-screen r-tasters">
      <TopBar
        title="맛객"
        isRoot
        aside={
          <TasterRegionButton
            scope={scope}
            onScopeChange={changeScope}
            location={location}
            myArea={myArea}
            hasTravel={hasTravelers(others)}
          />
        }
        right={
          <button
            type="button"
            className="r-icon-button"
            aria-label={isSearchOpen ? "맛객 검색 닫기" : "맛객 검색"}
            aria-expanded={isSearchOpen}
            onClick={() => {
              setIsSearchOpen((isOpen) => !isOpen);
              setQuery("");
            }}
          >
            <Icon name={isSearchOpen ? "close" : "search"} />
          </button>
        }
      />

      <div className="r-tasters-body">
        {isSearchOpen && (
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
              <EmptyState title="맞는 맛객을 찾지 못했어요" message="다른 닉네임이나 지역, 취향 태그로 찾아보세요." />
            )}
          </section>
        ) : (
          <>
            {isFirstLoad ? (
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
                <SubscribedStrip />
                <TasterFocusTabs focus={focus} onFocusChange={changeFocus} />
                {isScopeReady(scope, location, myArea) ? (
                  <>
                    <RecommendSection
                      scope={scope}
                      onScopeChange={changeScope}
                      focus={focus}
                      onFocusChange={changeFocus}
                      context={scopeContext}
                    />
                    <BrowseTasters
                      tasters={others}
                      stats={stats}
                      scope={scope}
                      focus={focus}
                      filter={browseFilter}
                      onFilterChange={setBrowseFilter}
                      context={scopeContext}
                    />
                  </>
                ) : (
                  // 내 주변인데 위치를 모르거나 내 지역이 없으면 두 섹션 대신 안내 하나만 보여 줍니다.
                  <ScopeNotice scope={scope} location={location} myArea={myArea} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** 내가 구독한 맛객을 가로로 늘어놓습니다. 구독이 없으면 그리지 않습니다. */
function SubscribedStrip() {
  const app = useAppData();
  if (!app.subscriptions.length) return null;
  const subscribedTasters = app.subscriptions.map((subscription) => subscribedTaster(app.tasterById, subscription));
  return (
    <section className="r-tasters-section">
      <SectionHead title="내가 구독한 맛객" action="구독 관리" onAction={() => go("subscriptions")} />
      <div className="r-tasters-strip">
        {subscribedTasters.map((taster) => (
          <button type="button" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
            <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--lg" />
            <span>{taster.tasterName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * 취향이 잘 맞는 맛객 카드 묶음. 위쪽 공통 조건(지역·분야) 안에서 아직 구독하지 않은 맛객을
 * 믿고 가는 맛객 → 신뢰 % → 취향 % 순으로 보여 줍니다(models/trust의 compareByTrust). 추천이 없으면 취향 고르기를 권합니다.
 */
function RecommendSection({
  scope,
  onScopeChange,
  focus,
  onFocusChange,
  context,
}: {
  scope: TasterScope;
  onScopeChange: (scope: TasterScope) => void;
  focus: TasterFocusFilter;
  onFocusChange: (focus: TasterFocusFilter) => void;
  context: ScopeContext;
}) {
  const app = useAppData();
  // 취향을 이미 골랐다면 입맛 맞는 맛객을 모두 구독 중인 경우라 취향 설정 대신 취향 넓히기를 권합니다.
  const hasPreference = !!app.myProfile?.preferenceTags.length;
  const counts = scopeRecordCounts(scope, context);
  const inScope = app.recommendedTasters.filter(
    (taster) => isInScope(taster, scope, counts, context.myArea) && matchesFocus(taster, focus),
  );
  // 비었을 때는 좁힌 조건부터 풀어 보게 합니다: 지역을 좁혔으면 전체 지역, 아니면 모든 분야.
  const widen =
    scope !== "ALL"
      ? { label: "전체 지역 보기", onClick: () => onScopeChange("ALL"), variant: "soft" as const }
      : { label: "모든 분야 보기", onClick: () => onFocusChange("ALL"), variant: "soft" as const };
  return (
    <section className="r-tasters-section">
      <SectionHead title="취향이 잘 맞는 맛객" action="취향 수정" onAction={() => go("profile-edit", "taste")} />
      {app.recommendedTasters.length ? (
        <>
          {inScope.length ? (
            <>
              <RecommendNote
                scope={scope}
                focus={focus}
                myArea={context.myArea}
                total={inScope.length}
                limit={RECOMMEND_LIMIT}
              />
              <div className="r-tasters-carousel">
                {inScope.slice(0, RECOMMEND_LIMIT).map((taster) => (
                  <RecommendCard key={taster.tasterId} taster={taster} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title={
                scope === "MY_AREA"
                  ? `${context.myArea}에는 취향 맞는 맛객이 아직 없어요`
                  : "이 조건에는 취향 맞는 맛객이 아직 없어요"
              }
              message="조건을 넓혀 보거나, 아래 맛객 둘러보기에서 찾아보세요."
              action={widen}
            />
          )}
        </>
      ) : (
        <EmptyState
          className="r-card r-card--flat r-tasters-empty-card"
          title={hasPreference ? "입맛 맞는 맛객을 모두 구독했어요" : "아직 추천할 맛객이 없어요"}
          message={
            hasPreference
              ? "취향을 더 고르면 새로운 맛객을 찾아드려요."
              : "추천 취향을 고르면 입맛이 맞는 맛객을 찾아드려요."
          }
          action={{
            label: hasPreference ? "취향 더 고르기" : "내 취향 설정하기",
            onClick: () => go("profile-edit", "taste"),
            variant: "soft",
          }}
        />
      )}
    </section>
  );
}
