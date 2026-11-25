import { useEffect, useState, type ReactNode } from "react";
import { useAppData } from "../../app/AppData";
import { go, useRoute } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import SelectChip from "../../components/SelectChip";
import { EmptyState, PageIntro, Skeleton, TopBar } from "../../components/ui";
import { isMyTaster, placeNeighborhood, placePhoto, type Place } from "../../models/place";
import { categoryLabel } from "../../utils/format";
import { splitReason } from "../record/recordModel";
import { MY_PLACE_CATEGORY_LABELS, type MyPlaceCategory } from "../mymap/myMapModel";
import { useMyPlaceEntries } from "./myPlaceCollection";
import { useRecordVisibilityChange } from "./useRecordVisibilityChange";

type Filter = "all" | MyPlaceCategory;
type Entry = ReturnType<typeof useMyPlaceEntries>[number];

const FILTERS: Filter[] = ["all", "wish", "visited", "shared"];

/** 모음 맨 위 큰 제목 아래 설명입니다(보드 13-02 가볼 곳 · 13-03 가본 곳 · 13-04 공개 범위). */
const COLLECTION_INTRO: Record<Filter, ReactNode> = {
  all: "가볼 곳 · 가본 곳 · 공유 중인 곳을 한곳에 모았어요.",
  wish: (
    <>
      가고 싶은 맛집을 저장한 모음이에요.
      <br />
      방문 여부와 관계없이 따로 보관해요.
    </>
  ),
  visited: (
    <>
      다녀온 맛집을 모아보고,
      <br />
      기록한 내용도 함께 확인해요.
    </>
  ),
  shared: <>내가 남긴 맛집 기록의 공개 범위를 관리해요. 나만 보기로 설정해도 내 방문 기록이에요.</>,
};
const INTRO_ICONS: Record<Filter, IconName> = { all: "book", wish: "heart", visited: "paw", shared: "shared" };

/** 고른 갈래에 맞는 곳이 없을 때의 안내입니다. */
const EMPTY_COPY: Record<MyPlaceCategory, { icon: IconName; title: string; message: string }> = {
  shared: {
    icon: "shared",
    title: "아직 남긴 기록이 없어요",
    message: "다녀온 곳을 기록하면 이곳에서 공개 범위를 관리할 수 있어요.",
  },
  wish: { icon: "heart", title: "아직 가볼 곳이 없어요", message: "마음에 드는 맛집의 하트를 누르면 이곳에 모여요." },
  visited: {
    icon: "paw",
    title: "아직 가본 곳이 없어요",
    message: "나만 보는 기록과, 가게에서 빠른 저장한 곳·기록을 지운 곳이 이곳에 모여요.",
  },
};

/** 공개 범위 화면(공유 중)의 칩: 내 기록 전체 · 공개 기록 · 나만 보기(보드 13-04). */
type RecordFilter = "all" | "public" | "private";
/** 가본 곳 화면의 칩: 전체 · 기록 있음 · 기록 없음 다음에 분류 칩(보드 13-03). */
type VisitFilter = "all" | "recorded" | "unrecorded";

const VISIBILITY_OPTIONS: { value: "public" | "private"; label: string }[] = [
  { value: "public", label: "공개" },
  { value: "private", label: "나만 보기" },
];

/** 주소의 두 번째 칸(#saved/visited)에서 갈래를 읽습니다. */
function filterOf(id: string): Filter {
  return FILTERS.find((value) => value === id) ?? "all";
}

/** 가게 분류의 큰 이름(한식·카페 등)입니다. 분류 칩에 씁니다. */
function cuisineOf(place: Place): string {
  return categoryLabel(place.category).split(" · ")[0] ?? "";
}

/**
 * 내 맛집 모음(#saved/갈래, 보드 13-02~13-04): 위 바에 갈래 이름, 큰 제목 "가볼 곳 N곳"과 설명, 칩, 가게 줄입니다.
 * - 가볼 곳: 분류 칩(전체 · 한식 · …), 줄은 사진 · 이름 · "분류 · 동네" · 한마디 두 줄 · 오른쪽 코랄 하트(누르면 하트 풀기 시트).
 * - 가본 곳: 전체 · 기록 있음 · 기록 없음 · 분류 칩, 사진 위 체크, 이름 아래 "기록 있음/없음" 알약, >.
 * - 공유 중(내 기록 공개 범위): 전체 · 공개 기록 · 나만 보기 칩(처음엔 공개 기록), 줄마다 방문 날짜 · 한마디 · 공개 범위 고르기, 아래 "내 기록 남기기".
 * 공개 범위를 바꾸면 확인을 받고(useRecordVisibilityChange), 다시 받기 전까지 바꾼 값으로 먼저 보여 줍니다.
 */
export default function CollectionsScreen() {
  const app = useAppData();
  const route = useRoute();
  const filter = filterOf(route.id);
  const [chip, setChip] = useState<string>(filter === "shared" ? "public" : "all");
  // 같은 화면에서 갈래만 바뀌면(나 탭 숫자 카드 → 다른 갈래) 칩을 그 갈래의 처음 칩으로 되돌립니다.
  useEffect(() => setChip(filter === "shared" ? "public" : "all"), [filter]);
  const { changed, applyChange } = useRecordVisibilityChange();

  // 방금 공유 범위를 바꾼 기록은 다시 받기 전까지 바꾼 갈래로 먼저 보여 줍니다.
  const entries = useMyPlaceEntries().map((entry) =>
    entry.hasRecord && entry.place.id in changed
      ? { ...entry, group: changed[entry.place.id] ? ("shared" as const) : ("visited" as const) }
      : entry,
  );
  // 공유 중 화면은 내 기록 전부(공개 + 나만 보기)의 공개 범위를 다룹니다.
  const base =
    filter === "all"
      ? entries
      : filter === "shared"
        ? entries.filter((entry) => entry.hasRecord)
        : entries.filter((entry) => entry.group === filter);
  const isPublic = (entry: Entry) => entry.group === "shared";
  const cuisines = [...new Set(base.map((entry) => cuisineOf(entry.place)).filter(Boolean))];
  const chips: { value: string; label: string }[] =
    filter === "shared"
      ? [
          { value: "all", label: `전체 (${base.length})` },
          { value: "public", label: `공개 기록 (${base.filter(isPublic).length})` },
          { value: "private", label: `나만 보기 (${base.filter((entry) => !isPublic(entry)).length})` },
        ]
      : [
          { value: "all", label: "전체" },
          ...(filter === "visited"
            ? [
                { value: "recorded", label: "기록 있음" },
                { value: "unrecorded", label: "기록 없음" },
              ]
            : []),
          ...cuisines.map((name) => ({ value: `cuisine:${name}`, label: name })),
        ];
  const shown = base.filter((entry) => {
    if (chip === "all") return true;
    if (chip === ("public" satisfies RecordFilter)) return isPublic(entry);
    if (chip === ("private" satisfies RecordFilter)) return !isPublic(entry);
    if (chip === ("recorded" satisfies VisitFilter)) return entry.hasRecord;
    if (chip === ("unrecorded" satisfies VisitFilter)) return !entry.hasRecord;
    return `cuisine:${cuisineOf(entry.place)}` === chip;
  });
  const title = filter === "all" ? "내 맛집" : MY_PLACE_CATEGORY_LABELS[filter];
  const count = filter === "shared" ? base.filter(isPublic).length : base.length;
  const isLoadingFirst = app.isLoading && !entries.length;

  const myRecordOf = (place: Place) => place.tasters.find(isMyTaster);
  const quoteOf = (place: Place) => {
    const note = (myRecordOf(place) ?? place.tasters[0])?.note.trim() ?? "";
    return splitReason(note).headline || note;
  };
  const visitDateOf = (place: Place) => {
    const at = myRecordOf(place)?.recordedAt;
    if (!at) return "";
    const date = new Date(at);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")} 방문`;
  };

  return (
    <main className={`r-screen r-me-collections ${filter === "shared" ? "has-action-bar" : ""}`}>
      <TopBar title={title} fallback="my" />
      <div className="r-me-body">
        <PageIntro title={`${title} ${count}곳`} message={COLLECTION_INTRO[filter]} icon={INTRO_ICONS[filter]} />
        {base.length > 0 && (
          <div className="r-chips" role="group" aria-label={`${title} 거르기`}>
            {chips.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`r-chip ${chip === option.value ? "is-on" : ""}`}
                aria-pressed={chip === option.value}
                onClick={() => setChip(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {isLoadingFirst ? (
          <Skeleton shape="row" count={4} label="내 맛집을 불러오고 있어요…" />
        ) : shown.length ? (
          <ul className="r-collection-rows">
            {shown.map((entry) => {
              const { place, group, hasRecord } = entry;
              const photo = placePhoto(place, myRecordOf(place), app.photoFor(place.id));
              const meta = [cuisineOf(place), placeNeighborhood(place)].filter(Boolean).join(" · ");
              const quote = quoteOf(place);
              return (
                <li key={place.id} className={`r-collection-row is-${group}`}>
                  <button type="button" className="r-collection-row__main" onClick={() => go("place", place.id)}>
                    <span className="r-collection-row__photo">
                      <PlaceThumb place={place} photo={photo} fallback="icon" />
                      {filter === "visited" && (
                        <i aria-hidden="true">
                          <Icon name="check" />
                        </i>
                      )}
                    </span>
                    <span className="r-collection-row__copy">
                      <b>{place.name}</b>
                      {filter === "shared" ? <small>{visitDateOf(place)}</small> : meta && <small>{meta}</small>}
                      {filter === "visited" ? (
                        <em className={hasRecord ? "is-on" : ""}>
                          <Icon name="pencil" />
                          {hasRecord ? "기록 있음" : "기록 없음"}
                        </em>
                      ) : (
                        quote && <q>{quote}</q>
                      )}
                    </span>
                    {filter === "visited" && <Icon name="chevron" />}
                  </button>
                  {group === "wish" && filter !== "shared" && (
                    <button
                      type="button"
                      className="r-collection-row__heart"
                      aria-label={`${place.name} 하트 풀기`}
                      onClick={() => void app.actions.chooseLike(place.id)}
                    >
                      <Icon name="heart" filled />
                    </button>
                  )}
                  {filter === "shared" && hasRecord && (
                    <SelectChip
                      label={`${place.name} 공개 범위`}
                      className={`r-collection-row__visibility ${isPublic(entry) ? "is-public" : ""}`}
                      value={isPublic(entry) ? "public" : "private"}
                      options={VISIBILITY_OPTIONS}
                      onChange={(next) => void applyChange([place.id], next === "public")}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={filter === "all" ? "heart" : EMPTY_COPY[filter].icon}
            title={filter === "all" ? "아직 내 맛집이 없어요" : EMPTY_COPY[filter].title}
            message={
              filter === "all"
                ? "다녀온 곳을 기록하거나, 마음에 드는 맛집의 하트를 누르면 이곳에 모여요."
                : EMPTY_COPY[filter].message
            }
            action={
              filter === "wish" || filter === "all"
                ? { label: "내 지도에서 찾기", onClick: () => go("mymap"), variant: "primary" }
                : undefined
            }
            className="r-me-empty"
          />
        )}
      </div>

      {filter === "shared" && (
        <div className="r-action-bar">
          <button type="button" className="r-button r-button--primary r-button--block" onClick={() => go("register")}>
            <Icon name="pencil" />내 기록 남기기
          </button>
        </div>
      )}
    </main>
  );
}
