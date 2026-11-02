import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { EmptyState, Segmented, SectionHead, Skeleton, TopBar } from "../../components/ui";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import IncomingList from "./IncomingList";
import LocalTasters from "./LocalTasters";
import RecommendCard from "./RecommendCard";
import SubscribedList from "./SubscribedList";
import TasterRows from "./TasterRows";
import { PAGE_SIZE, fallbackTaster, searchTasters, statsByTaster, type LocalTasterFilter } from "./tasterData";

type Tab = "recommend" | "subscribed" | "incoming";

/** 맛객 탭(#tasters): 취향 일치로 맛객을 고르고, 구독 중·나를 구독한 사람을 봅니다. */
export default function TastersScreen() {
  const app = useAppData();
  const [tab, setTab] = useState<Tab>("recommend");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [localFilter, setLocalFilter] = useState<LocalTasterFilter>({ region: "", focus: "ALL", limit: PAGE_SIZE });

  const stats = useMemo(() => statsByTaster(app.places), [app.places]);
  const others = app.tasters.filter((taster) => !app.isMyTasterId(taster.tasterId));
  const keyword = query.trim().toLowerCase();
  const searchResults = searchTasters(others, keyword);
  const isFirstLoad = app.loading && !app.tasters.length;

  return (
    <main className="r-screen r-tasters">
      <TopBar
        title="맛객"
        root
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

            {isFirstLoad ? (
              <Skeleton shape="row" count={4} label="맛객을 불러오고 있어요." />
            ) : app.error && !app.tasters.length ? (
              <EmptyState
                tone="error"
                title="맛객을 불러오지 못했어요"
                message={app.error}
                action={{ label: "다시 불러오기", onClick: app.actions.retry }}
              />
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
                <SubscribedStrip />
                <RecommendSection />
                <LocalTasters tasters={others} stats={stats} filter={localFilter} onFilterChange={setLocalFilter} />
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
  const subscribedTasters = app.subscriptions.map(
    (subscription) =>
      app.tasterById.get(subscription.targetAccountId) ??
      fallbackTaster(subscription.targetAccountId, subscription.targetNickname),
  );
  return (
    <section className="r-tasters-section">
      <SectionHead title="내가 구독한 맛객" action="관리" onAction={() => go("subscriptions")} />
      <div className="r-tasters-strip">
        {subscribedTasters.map((taster) => (
          <button type="button" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
            <Avatar
              className="r-tasters-avatar r-tasters-avatar--lg"
              src={avatarSource(taster.tasterId, taster.avatar)}
              fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
              name={taster.tasterName}
              variant={taster.avatarVariant}
            />
            <span>{taster.tasterName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** 취향이 잘 맞는 맛객 카드 묶음. 추천이 없으면 취향 고르기를 권합니다. */
function RecommendSection() {
  const app = useAppData();
  // 취향을 이미 골랐다면 입맛 맞는 맛객을 모두 구독 중인 경우라 취향 설정 대신 취향 넓히기를 권합니다.
  const hasPreference = !!app.myProfile?.preferenceTags.length;
  return (
    <section className="r-tasters-section">
      <SectionHead title="취향이 잘 맞는 맛객" action="취향 수정" onAction={() => go("profile-edit", "taste")} />
      {app.recommendedTasters.length ? (
        <div className="r-tasters-carousel">
          {app.recommendedTasters.slice(0, 10).map((taster) => (
            <RecommendCard key={taster.tasterId} taster={taster} />
          ))}
        </div>
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
