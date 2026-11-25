import { useCallback, useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import TasterAvatar from "../../components/TasterAvatar";
import { EmptyState, NotificationButton, Skeleton, TopBar } from "../../components/ui";
import { avatarSource } from "../../utils/profileMedia";
import FeedCard from "./FeedCard";
import {
  STORY_WINDOW_DAYS,
  addSeen,
  collectFeedRecords,
  readStorySeen,
  storyRecords,
  writeStorySeen,
  type StoryGroup,
  type StorySeen,
} from "./feedRecords";
import StoryViewer from "./StoryViewer";

type FeedTab = "subscribed" | "all";

const PAGE_SIZE = 10;
/** 구독이 없을 때 보여 줄 추천 맛객 수 */
const EMPTY_PICK_LIMIT = 3;

/**
 * 피드 탭(보드 07-01): 로고 · 알림, "맛객들의 새로운 기록" 제목, 구독 · 전체 칩, 구독한 맛객 스토리 링 줄, 최신 기록 목록.
 * 구독한 맛객이 없으면(보드 07-04) 제목·칩 없이 빈 화면 안내만 둡니다.
 */
export default function FeedScreen() {
  const app = useAppData();
  const { places, tasterById, isMyTasterId, subscriptions, actions } = app;
  const [tab, setTab] = useState<FeedTab>("subscribed");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [seen, setSeen] = useState<StorySeen>(readStorySeen);
  // 스토리를 여는 순간의 묶음을 고정해 둡니다(보는 중에 링 순서가 바뀌어도 위치가 흔들리지 않게).
  const [story, setStory] = useState<{ groups: StoryGroup[]; start: number } | null>(null);

  const allRecords = useMemo(
    () => collectFeedRecords(places, tasterById, isMyTasterId),
    [places, tasterById, isMyTasterId],
  );
  const subscribedRecords = useMemo(() => {
    const ids = new Set(subscriptions.map((subscription) => subscription.targetAccountId));
    return allRecords.filter((record) => ids.has(record.author.id));
  }, [allRecords, subscriptions]);
  const records = tab === "subscribed" ? subscribedRecords : allRecords;

  // 구독한 맛객마다 스토리 묶음을 만들고, 안 본 최근 기록이 있는 사람을 앞에 둡니다.
  const storyGroups = useMemo(() => {
    const groups: StoryGroup[] = subscriptions.map((subscription) => {
      const id = subscription.targetAccountId;
      const profile = tasterById.get(id);
      const tasterRecords = subscribedRecords.filter((record) => record.author.id === id);
      const story = storyRecords(tasterRecords, seen[id]);
      const first = tasterRecords[0];
      return {
        tasterId: id,
        name: first?.author.name || profile?.tasterName || subscription.targetNickname || "맛객",
        avatar: first?.author.avatar ?? avatarSource(profile?.avatar),
        variant: first?.author.variant ?? profile?.avatarVariant ?? 1,
        ...story,
      };
    });
    const latestOf = (group: StoryGroup) => Math.max(0, ...group.records.map((record) => record.time));
    return groups.sort(
      (left, right) =>
        Number(right.unseenCount > 0) - Number(left.unseenCount > 0) ||
        latestOf(right) - latestOf(left) ||
        right.records.length - left.records.length,
    );
  }, [subscriptions, subscribedRecords, tasterById, seen]);
  const playableGroups = useMemo(() => storyGroups.filter((group) => group.records.length > 0), [storyGroups]);

  const markSeen = useCallback((tasterId: string, recordKey: string) => {
    setSeen((current) => {
      const next = addSeen(current, tasterId, recordKey);
      if (next !== current) writeStorySeen(next);
      return next;
    });
  }, []);
  const closeStory = useCallback(() => setStory(null), []);

  function changeTab(next: FeedTab) {
    setTab(next);
    setVisibleCount(PAGE_SIZE);
  }

  const isLoading = app.isLoading && places.length === 0;
  const hasError = !app.isLoading && !!app.error && places.length === 0;
  const hasNoSubscriptions = tab === "subscribed" && subscriptions.length === 0 && !isLoading && !hasError;

  return (
    <main className="r-screen r-feed">
      <TopBar title="맛다공 피드" isBrand right={<NotificationButton />} />
      {!hasNoSubscriptions && <h2 className="r-home-title r-feed__title">맛객들의 새로운 기록</h2>}
      <div className="r-chips r-feed-tabs" role="tablist" aria-label="피드 범위" hidden={hasNoSubscriptions}>
        {(
          [
            { value: "subscribed", label: "구독" },
            { value: "all", label: "전체" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            className={`r-chip ${tab === option.value ? "is-on" : ""}`}
            onClick={() => changeTab(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {storyGroups.length > 0 && (
        <nav className="r-feed-stories" aria-label="구독한 맛객 스토리">
          {storyGroups.map((group) => {
            const playableIndex = playableGroups.indexOf(group);
            const isFresh = group.unseenCount > 0;
            return (
              <button
                type="button"
                key={group.tasterId}
                className={`r-feed-story-chip${isFresh ? " is-fresh" : ""}`}
                aria-label={`${group.name}${isFresh ? `, 안 본 새 기록 ${group.unseenCount}개` : `, 최근 ${STORY_WINDOW_DAYS}일 새 기록 없음`}${playableIndex < 0 ? ", 기록 없음, 프로필 보기" : ", 스토리 보기"}`}
                onClick={() =>
                  playableIndex >= 0
                    ? setStory({ groups: playableGroups, start: playableIndex })
                    : go("profile", group.tasterId)
                }
              >
                <span className="r-feed-story-chip__ring">
                  <Avatar src={group.avatar} name={group.name} variant={group.variant} />
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <section className="r-feed-list" aria-label={tab === "subscribed" ? "구독한 맛객의 기록" : "맛객들의 최신 기록"}>
        {isLoading ? (
          <Skeleton shape="card" count={2} label="기록을 불러오고 있어요." className="r-feed-skeletons" />
        ) : hasError ? (
          <EmptyState
            tone="error"
            title="기록을 불러오지 못했어요"
            message={app.error}
            action={{ label: "다시 불러오기", onClick: actions.retry }}
          />
        ) : hasNoSubscriptions ? (
          <EmptySubscriptions />
        ) : records.length === 0 ? (
          <EmptyState
            title={tab === "subscribed" ? "구독한 맛객의 새 기록이 아직 없어요" : "아직 공개된 기록이 없어요"}
            message={
              tab === "subscribed"
                ? "새 기록이 올라오면 이곳과 알림으로 알려 드릴게요."
                : "맛객들이 기록을 남기면 이곳에 모여요."
            }
            action={
              tab === "subscribed"
                ? { label: "전체 기록 보기", onClick: () => changeTab("all"), variant: "soft" }
                : undefined
            }
          />
        ) : (
          <>
            {records.slice(0, visibleCount).map((record) => (
              <FeedCard key={record.key} record={record} />
            ))}
            {records.length > visibleCount && (
              <button
                type="button"
                className="r-button r-button--secondary r-button--block"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                기록 더 보기
              </button>
            )}
          </>
        )}
      </section>

      {story && <StoryViewer groups={story.groups} startGroup={story.start} onSeen={markSeen} onClose={closeStory} />}
    </main>
  );
}

/** 구독한 맛객이 없을 때(보드 07-04): 로고 그림과 안내, 맛객 추천받기 · 맛객 둘러보기, "이런 맛객은 어때요?" 세 명. */
function EmptySubscriptions() {
  const { recommendedTasters, actions } = useAppData();
  const picks = recommendedTasters.slice(0, EMPTY_PICK_LIMIT);
  return (
    <div className="r-feed-empty">
      <img className="r-feed-empty__art" src="/assets/brand/brand-symbol.png" alt="" />
      <h3>아직 구독한 맛객이 없어요</h3>
      <p>
        좋아하는 맛객을 구독하고
        <br />
        그들의 새로운 기록과 스토리를 만나보세요.
      </p>
      <div className="r-feed-empty__actions">
        <button
          type="button"
          className="r-button r-button--primary r-button--block"
          onClick={() => go("taster-recommendations")}
        >
          <Icon name="people" />
          맛객 추천받기
        </button>
        <button type="button" className="r-button r-button--secondary r-button--block" onClick={() => go("tasters")}>
          <Icon name="search" />
          맛객 둘러보기
        </button>
      </div>
      {picks.length > 0 && (
        <section className="r-feed-empty__picks" aria-labelledby="feed-picks-title">
          <h3 id="feed-picks-title">이런 맛객은 어때요?</h3>
          <ul>
            {picks.map((taster) => (
              <li key={taster.tasterId}>
                <button type="button" onClick={() => go("profile", taster.tasterId)}>
                  <TasterAvatar taster={taster} />
                  <b>{taster.tasterName}</b>
                </button>
                <button
                  type="button"
                  className="r-feed-empty__subscribe"
                  onClick={() => actions.openSubscription(taster.tasterId)}
                >
                  구독하기
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
