import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go, useRoute } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import PlaceTile, { type PlaceTileBadge } from "../../components/PlaceTile";
import { EmptyState, Segmented, Skeleton, TopBar } from "../../components/ui";
import CollectionSelectBar from "./CollectionSelectBar";
import { MY_PLACE_GROUP_LABELS, myPlaceEntries, type MyPlaceGroup } from "./myPlaceCollection";
import { useRecordVisibilityChange } from "./useRecordVisibilityChange";

type Tab = "saved" | "recent";
type Filter = "all" | MyPlaceGroup;

const FILTERS: Filter[] = ["all", "mine", "private", "wish", "visited"];

/** 고른 묶음에 맞는 곳이 없을 때의 안내입니다. */
const EMPTY_FILTER_COPY: Record<MyPlaceGroup, { icon: IconName; title: string; message: string }> = {
  mine: {
    icon: "book",
    title: "아직 공개한 내 기록이 없어요",
    message: "다녀온 곳을 기록하고 공개하면 이곳에 모여요.",
  },
  private: { icon: "lock", title: "나만 보는 기록이 없어요", message: "기록할 때 ‘나만 보기’를 고르면 이곳에 모여요." },
  wish: {
    icon: "heart",
    title: "아직 가보고 싶은 곳이 없어요",
    message: "마음에 드는 맛집의 하트를 누르면 이곳에 모여요.",
  },
  visited: {
    icon: "check",
    title: "아직 다녀온 곳이 없어요",
    message:
      "가게에서 빠른 저장한 곳과 기록을 지운 곳이 이곳에 모여요. 위치와 상관없이 언제든 기록으로 남길 수 있어요.",
  },
};

/** 주소의 두 번째 칸(#saved/private)에서 칩을 읽습니다. */
function filterOf(id: string): Filter {
  return FILTERS.find((value) => value === id) ?? "all";
}

/**
 * 내 맛집 모음: 내 맛집(#saved/칩)과 최근 본 곳(#recent)을 탭으로 오갑니다.
 * 내 맛집은 내 지도와 같은 기준으로 내가 등록한 곳 · 나만 보기 · 가보고 싶은 곳 · 다녀온 곳을 칩으로 나눠 봅니다.
 * 내가 등록한 곳·나만 보기 칩에서는 여러 곳을 골라 공개 범위를 한 번에 바꿉니다(바꾸기 전에 확인을 받음).
 */
export default function CollectionsScreen() {
  const app = useAppData();
  const route = useRoute();
  const tab: Tab = route.screen === "recent" ? "recent" : "saved";
  const filter = filterOf(route.id);
  // null이면 고르기 모드가 아닙니다.
  const [selected, setSelected] = useState<string[] | null>(null);
  const { changed, isSaving, applyChange } = useRecordVisibilityChange();

  // 별로였던 곳은 "다녀왔는데 별로였어요"라 다녀온 곳으로도 셉니다(다녀온 곳 기록 없이 가게 근처에서 고른 곳 포함).
  const visitedPlaceIds = [...new Set([...app.visitedPlaceIds, ...app.dislikedPlaceIds])];
  const entries = myPlaceEntries({
    myRecords: app.myRecords,
    knownPlaces: [...app.places, ...app.privatePlaces, ...app.myRecords, ...app.recentPlaces],
    likedPlaceIds: app.likedPlaceIds,
    visitedPlaceIds,
  }).map((entry) =>
    (entry.group === "mine" || entry.group === "private") && entry.place.id in changed
      ? { ...entry, group: changed[entry.place.id] ? ("mine" as const) : ("private" as const) }
      : entry,
  );
  const countOf = (value: Filter) =>
    value === "all" ? entries.length : entries.filter((entry) => entry.group === value).length;
  const shown = filter === "all" ? entries : entries.filter((entry) => entry.group === filter);
  const canChangeVisibility = tab === "saved" && (filter === "mine" || filter === "private") && shown.length > 0;
  const isSelecting = canChangeVisibility && selected !== null;
  const shownIds = shown.map((entry) => entry.place.id);
  // 칩을 바꾸면 고른 것 중 지금 칩에 보이는 곳만 셉니다.
  const picked = isSelecting ? selected.filter((id) => shownIds.includes(id)) : [];
  const isAllPicked = shown.length > 0 && picked.length === shown.length;
  const shouldMakePublic = filter === "private";
  // 하트·다녀온 곳인데 장소 정보를 아직 받지 못한 곳이 있으면 불러오는 중이거나 불러오기에 실패한 것입니다.
  const recordIds = new Set(app.myRecords.map((place) => place.id));
  const savedIds = new Set([...app.likedPlaceIds, ...visitedPlaceIds].filter((id) => !recordIds.has(id)));
  const savedShown = entries.filter((entry) => entry.group === "wish" || entry.group === "visited").length;
  const hasMissingLikes = savedIds.size > savedShown;

  /** 카드 오른쪽 위 이름표: 묶음 이름, 별로였던 곳이면 그 아래 회색 "별로였어요"(상세 뱃지와 같은 규칙). */
  function badgesOf(placeId: string, group: MyPlaceGroup): PlaceTileBadge[] {
    const badges: PlaceTileBadge[] = [{ label: MY_PLACE_GROUP_LABELS[group] }];
    if (group === "visited" && app.dislikedPlaceIds.includes(placeId))
      badges.push({ label: "별로였어요", isMuted: true });
    return badges;
  }

  function changeFilter(next: Filter) {
    setSelected(null);
    go("saved", next === "all" ? "" : next, true);
  }
  function toggle(placeId: string) {
    setSelected((current) =>
      current?.includes(placeId) ? current.filter((id) => id !== placeId) : [...(current ?? []), placeId],
    );
  }
  async function applyPicked() {
    if (await applyChange(picked, shouldMakePublic)) setSelected(null);
  }

  return (
    <main className={`r-screen r-me-collections ${picked.length ? "has-action-bar" : ""}`}>
      <TopBar title="내 맛집 모음" fallback="my" />
      <div className="r-me-body">
        <Segmented<Tab>
          label="모음 구분"
          value={tab}
          onChange={(next) => {
            setSelected(null);
            go(next, "", true);
          }}
          options={[
            { value: "saved", label: `내 맛집 ${entries.length}` },
            { value: "recent", label: `최근 본 곳 ${app.recentPlaces.length}` },
          ]}
        />
        {tab === "saved" && entries.length > 0 && (
          <div className="r-chips" role="group" aria-label="내 맛집 거르기">
            {FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                className={`r-chip ${filter === value ? "is-on" : ""}`}
                aria-pressed={filter === value}
                onClick={() => changeFilter(value)}
              >
                {value === "all" ? "전체" : MY_PLACE_GROUP_LABELS[value]} {countOf(value)}
              </button>
            ))}
          </div>
        )}

        {canChangeVisibility && (
          <CollectionSelectBar
            isSelecting={isSelecting}
            isAllPicked={isAllPicked}
            pickedCount={picked.length}
            shownCount={shown.length}
            shouldMakePublic={shouldMakePublic}
            onStart={() => setSelected([])}
            onToggleAll={() => setSelected(isAllPicked ? [] : shownIds)}
            onCancel={() => setSelected(null)}
          />
        )}

        {tab === "recent" ? (
          app.recentPlaces.length ? (
            <div className="r-me-grid">
              {app.recentPlaces.map((place) => (
                <PlaceTile
                  key={place.id}
                  place={place}
                  isLiked={app.likedPlaceIds.includes(place.id)}
                  onLike={() => void app.actions.chooseLike(place.id)}
                  photo={app.photoFor(place.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="clock"
              title="최근 본 맛집이 없어요"
              message="맛집 상세를 열어 보면 이곳에 차례로 남아요."
              action={{ label: "맛집 둘러보기", onClick: () => go("home"), variant: "primary" }}
              className="r-card r-me-empty"
            />
          )
        ) : shown.length ? (
          <div className="r-me-grid">
            {shown.map(({ place, group }) =>
              isSelecting ? (
                <PlaceTile
                  key={place.id}
                  place={place}
                  badges={badgesOf(place.id, group)}
                  photo={app.photoFor(place.id)}
                  isSelected={picked.includes(place.id)}
                  onSelect={() => toggle(place.id)}
                />
              ) : group === "mine" ||
                group === "private" ||
                (group === "visited" && !app.likedPlaceIds.includes(place.id)) ? (
                // 내 기록(하트를 쓰지 않음)과 하트 없는 다녀온 곳은 하트 대신 묶음 이름을 붙입니다.
                <PlaceTile
                  key={place.id}
                  place={place}
                  badges={badgesOf(place.id, group)}
                  photo={app.photoFor(place.id)}
                />
              ) : (
                <PlaceTile
                  key={place.id}
                  place={place}
                  isLiked
                  onLike={() => void app.actions.chooseLike(place.id)}
                  photo={app.photoFor(place.id)}
                />
              ),
            )}
          </div>
        ) : entries.length > 0 && filter !== "all" ? (
          <EmptyState
            icon={EMPTY_FILTER_COPY[filter].icon}
            title={EMPTY_FILTER_COPY[filter].title}
            message={EMPTY_FILTER_COPY[filter].message}
            action={
              filter === "wish"
                ? { label: "내 지도에서 찾기", onClick: () => go("mymap"), variant: "primary" }
                : filter === "mine" && countOf("private")
                  ? { label: `나만 보기 ${countOf("private")}곳 보기`, onClick: () => changeFilter("private") }
                  : undefined
            }
            className="r-card r-me-empty"
          />
        ) : hasMissingLikes ? (
          app.isLoading ? (
            <Skeleton shape="card" count={4} label="내 맛집을 불러오고 있어요…" className="r-me-grid" />
          ) : (
            <EmptyState
              tone="error"
              title="내 맛집 정보를 찾지 못했어요"
              message="잠시 후 다시 불러와 주세요."
              action={{ label: "다시 불러오기", onClick: app.actions.retry }}
              className="r-card r-me-empty"
            />
          )
        ) : (
          <EmptyState
            icon="heart"
            title="아직 내 맛집이 없어요"
            message="다녀온 곳을 기록하거나, 마음에 드는 맛집의 하트를 누르면 이곳에 모여요."
            action={{ label: "내 지도로 가기", onClick: () => go("mymap"), variant: "primary" }}
            className="r-card r-me-empty"
          />
        )}
      </div>

      {picked.length > 0 && (
        <div className="r-action-bar">
          <button
            type="button"
            className="r-button r-button--secondary r-me-collections__clear"
            onClick={() => setSelected([])}
            disabled={isSaving}
          >
            선택 해제
          </button>
          <button
            type="button"
            className="r-button r-button--primary r-me-collections__apply"
            onClick={() => void applyPicked()}
            disabled={isSaving}
          >
            <Icon name={shouldMakePublic ? "user" : "lock"} />
            {isSaving
              ? "바꾸는 중…"
              : shouldMakePublic
                ? `${picked.length}곳 공개하기`
                : `${picked.length}곳 나만 보기로`}
          </button>
        </div>
      )}
    </main>
  );
}
