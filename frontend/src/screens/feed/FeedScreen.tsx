import { useCallback, useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import { EmptyState, NotificationButton, Segmented, Skeleton, TopBar } from "../../components/ui";
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

/** 피드 탭: 구독한 맛객 스토리 줄과 맛객들의 최신 기록 카드. */
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
        avatar: first?.author.avatar ?? avatarSource(id, profile?.avatar),
        fallbackAvatar: first?.author.fallbackAvatar,
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

  const isLoading = app.loading && places.length === 0;
  const hasError = !app.loading && !!app.error && places.length === 0;

  return (
    <main className="r-screen r-feed">
      <TopBar title="피드" root right={<NotificationButton />} />

      <nav className="r-feed-stories" aria-label="구독한 맛객 스토리">
        <button type="button" className="r-feed-story-chip" onClick={() => go("tasters")}>
          <span className="r-feed-story-chip__add">
            <Icon name="plus" />
          </span>
          <small>맛객 찾기</small>
        </button>
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
                <Avatar
                  src={group.avatar}
                  fallbackSrc={group.fallbackAvatar}
                  name={group.name}
                  variant={group.variant}
                />
                {isFresh && (
                  <em className="r-feed-story-chip__count" aria-hidden="true">
                    {group.unseenCount}
                  </em>
                )}
              </span>
              <small>{group.name}</small>
            </button>
          );
        })}
      </nav>

      <div className="r-feed-tabs">
        <Segmented
          label="피드 범위"
          value={tab}
          onChange={changeTab}
          options={[
            { value: "subscribed", label: "구독 중" },
            { value: "all", label: "전체" },
          ]}
        />
      </div>

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
        ) : tab === "subscribed" && subscriptions.length === 0 ? (
          <EmptySubscriptions onShowAll={() => changeTab("all")} />
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

/** 구독한 맛객이 없을 때: 취향이 맞는 맛객을 보여 주고 맛객 탭으로 안내합니다. */
function EmptySubscriptions({ onShowAll }: { onShowAll: () => void }) {
  const picks = useAppData().recommendedTasters.slice(0, EMPTY_PICK_LIMIT);
  return (
    <div className="r-card r-feed-empty">
      <EmptyState
        icon="user"
        title="아직 구독한 맛객이 없어요"
        message={
          <>
            입맛이 맞는 맛객을 구독하면
            <br />새 기록이 이곳에 스토리와 카드로 모여요.
          </>
        }
      />
      {picks.length > 0 && (
        <div className="r-feed-empty__picks">
          <span className="r-label">취향이 비슷한 맛객</span>
          {picks.map((taster) => (
            <button
              type="button"
              className="r-row"
              key={taster.tasterId}
              onClick={() => go("profile", taster.tasterId)}
            >
              <TasterAvatar taster={taster} />
              <span className="r-row__copy">
                <b>{taster.tasterName}</b>
                <small>{taster.intro || taster.activityRegion || taster.tag || "맛객"}</small>
              </span>
              <TasteScore taster={taster} />
            </button>
          ))}
        </div>
      )}
      <div className="r-feed-empty__actions">
        <button type="button" className="r-button r-button--primary r-button--block" onClick={() => go("tasters")}>
          맛객 찾아보기
        </button>
        <button type="button" className="r-button r-button--secondary r-button--block" onClick={onShowAll}>
          전체 기록 먼저 보기
        </button>
      </div>
    </div>
  );
}
