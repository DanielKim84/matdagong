import { useState } from "react";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, PageIntro, Segmented, Skeleton, TopBar } from "../../components/ui";
import { kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../../services/places";
import { isCafeCategory, placeNeighborhood } from "../../models/place";
import { DAY_MS, categoryLabel, startOfDay } from "../../utils/format";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import { formatDay } from "./diary";
import { useQuickPlaceDrafts } from "./useQuickPlaceDrafts";

/** 저장한 날로 묶는 탭입니다(보드 14-03 "오늘 | 최근 7일 | 그 전"). */
const DATE_GROUPS = ["오늘", "최근 7일", "그 전"] as const;
type DateGroup = (typeof DATE_GROUPS)[number];

/** 기기 시간대의 자정으로 나눕니다. 최근 7일은 오늘을 포함한 7일 가운데 오늘(따로 묶음)을 뺀 6일입니다. */
function dateGroupOf(savedAt: string, now = new Date()): DateGroup {
  const saved = new Date(savedAt);
  const startOfToday = startOfDay(now);
  if (saved.getTime() >= startOfToday) return "오늘";
  return saved.getTime() >= startOfToday - 6 * DAY_MS ? "최근 7일" : "그 전";
}

/**
 * 빠른 장소 기록(#drafts, 보드 14-03): 가게에서 장소만 먼저 저장해 둔 곳. 큰 제목과 설명, "오늘 | 최근 7일 | 그 전" 탭,
 * 날짜 띠("오늘 · 3월 21일 (금) 2곳"), 가게 줄(사진 칸 · 이름 · "분류 · 동네" · "방문만 저장됨" · 코랄 "기록하기")입니다.
 * 기록을 완성하면 목록에서 빠지고, 줄 왼쪽 아래 휴지통으로 지울 수 있습니다.
 */
export default function QuickDraftsScreen() {
  const { drafts, isLoaded, isLoading, error, deletingId, remove } = useQuickPlaceDrafts();
  const counts = Object.fromEntries(
    DATE_GROUPS.map((group) => [group, drafts.filter((draft) => dateGroupOf(draft.savedAt) === group).length]),
  ) as Record<DateGroup, number>;
  const [tab, setTab] = useState<DateGroup | null>(null);
  // 처음에는 저장한 곳이 있는 첫 탭을 엽니다.
  const current = tab ?? DATE_GROUPS.find((group) => counts[group] > 0) ?? "오늘";
  const shown = drafts.filter((draft) => dateGroupOf(draft.savedAt) === current);
  const band = current === "오늘" ? `오늘 · ${formatDay(new Date())}` : current;

  function continueDraft(draft: QuickPlaceDraft) {
    // 기록 화면이 열릴 때 이 장소를 선택 상태로 복원하도록 일회성 값을 넘깁니다.
    writeStorageJson(STORAGE_KEYS.quickPlaceHandoff, kakaoPlaceFromQuickDraft(draft), "session");
    go("register");
  }

  return (
    <main className="r-screen r-me-drafts">
      <TopBar title="빠른 장소 기록" fallback="my" variant="plain" />
      <div className="r-me-body">
        <PageIntro title="빠른 장소 기록" message="방문만 저장한 곳에서 추천 기록을 이어 써보세요." />
        {error && (
          <p className="r-error-box" role="alert">
            {error}
          </p>
        )}
        {isLoading && !isLoaded ? (
          <Skeleton shape="card" count={3} label="저장한 장소를 불러오고 있어요…" />
        ) : drafts.length ? (
          <>
            <Segmented<DateGroup>
              label="저장한 날"
              value={current}
              onChange={setTab}
              options={DATE_GROUPS.map((group) => ({ value: group, label: group }))}
            />
            <p className="r-me-diary__band">
              {band} <small>{shown.length}곳</small>
            </p>
            {shown.length ? (
              <ul className="r-collection-rows">
                {shown.map((draft) => (
                  <DraftRow
                    key={`${draft.providerCode}:${draft.providerPlaceId}`}
                    draft={draft}
                    isDeleting={deletingId === draft.providerPlaceId}
                    onDelete={() => void remove(draft)}
                    onContinue={() => continueDraft(draft)}
                  />
                ))}
              </ul>
            ) : (
              <p className="r-me-note r-muted">이 기간에 저장한 곳이 없어요.</p>
            )}
          </>
        ) : (
          !error && (
            <EmptyState
              icon="pin"
              title="빠른 기록이 없어요"
              message="내 지도의 ‘기록하기 → 빠른 저장’으로 가게에 도착했을 때 장소만 먼저 남겨 두세요."
              action={{ label: "맛집 기록하기", onClick: () => go("register"), variant: "primary" }}
              className="r-me-empty"
            />
          )
        )}
      </div>
    </main>
  );
}

function DraftRow({
  draft,
  isDeleting,
  onDelete,
  onContinue,
}: {
  draft: QuickPlaceDraft;
  isDeleting: boolean;
  onDelete: () => void;
  onContinue: () => void;
}) {
  const isCafe = isCafeCategory(draft.category);
  const meta = [
    draft.category ? categoryLabel(draft.category).split(" · ")[0] : "",
    placeNeighborhood({ address: draft.address ?? "", lotAddress: null }),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="r-collection-row r-me-draft-row">
      <span className="r-collection-row__photo r-me-draft-row__thumb" aria-hidden="true">
        <Icon name={isCafe ? "coffee" : "fork"} />
      </span>
      <span className="r-collection-row__copy">
        <b>{draft.placeName}</b>
        {meta && <small>{meta}</small>}
        <em>방문만 저장됨</em>
      </span>
      <span className="r-me-draft-row__actions">
        <button
          type="button"
          className="r-me-draft-row__write"
          onClick={onContinue}
          aria-label={`${draft.placeName} 맛집 기록 이어 쓰기`}
        >
          <Icon name="pencil" />
          기록하기
        </button>
        <button
          type="button"
          className="r-text-button r-me-draft-row__delete"
          disabled={isDeleting}
          onClick={onDelete}
          aria-label={`${draft.placeName} 빠른 기록 삭제`}
        >
          <Icon name="trash" />
        </button>
      </span>
    </li>
  );
}
