import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead, Skeleton, TopBar } from "../../components/ui";
import { kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../../services/places";
import { isCafeCategory } from "../../models/place";
import { DAY_MS, categoryLabel, formatRelativeTime, startOfDay } from "../../utils/format";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import { useQuickPlaceDrafts } from "./useQuickPlaceDrafts";

/** 저장한 날로 묶는 이름입니다. 오늘 → 최근 7일 → 그 전 순서로 보여 줍니다. */
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
 * 빠른 장소 기록(#drafts): 가게에서 장소만 먼저 저장해 둔 곳. 이어서 맛집 기록을 완성하거나 지웁니다.
 * 저장한 날로 묶고, 카드는 이름·분류·주소를 위에, 저장 시간·삭제·이어 쓰기를 아래 한 줄에 둡니다.
 */
export default function QuickDraftsScreen() {
  const { drafts, isLoaded, isLoading, error, deletingId, remove } = useQuickPlaceDrafts();
  const groups = DATE_GROUPS.map((group) => ({
    group,
    drafts: drafts.filter((draft) => dateGroupOf(draft.savedAt) === group),
  })).filter((item) => item.drafts.length);

  function continueDraft(draft: QuickPlaceDraft) {
    // 기록 화면이 열릴 때 이 장소를 선택 상태로 복원하도록 일회성 값을 넘깁니다.
    writeStorageJson(STORAGE_KEYS.quickPlaceHandoff, kakaoPlaceFromQuickDraft(draft), "session");
    go("register");
  }

  return (
    <main className="r-screen r-me-drafts">
      <TopBar title="빠른 장소 기록" fallback="my" />
      <div className="r-me-body">
        <p className="r-me-drafts__hint">
          <Icon name="clock" />
          가게에서 장소만 먼저 저장해 둔 곳이에요. 기록을 완성하면 이 목록에서 자동으로 빠져요.
        </p>
        {error && (
          <p className="r-error-box" role="alert">
            {error}
          </p>
        )}
        {isLoading && !isLoaded ? (
          <Skeleton shape="card" count={3} label="저장한 장소를 불러오고 있어요…" />
        ) : drafts.length ? (
          groups.map(({ group, drafts: grouped }) => (
            <section key={group} className="r-me-drafts__group" aria-label={group}>
              <SectionHead title={group} meta={`${grouped.length}곳`} className="r-section-head--date" />
              <ul className="r-me-drafts__list">
                {grouped.map((draft) => (
                  <DraftCard
                    key={`${draft.providerCode}:${draft.providerPlaceId}`}
                    draft={draft}
                    isDeleting={deletingId === draft.providerPlaceId}
                    onDelete={() => void remove(draft)}
                    onContinue={() => continueDraft(draft)}
                  />
                ))}
              </ul>
            </section>
          ))
        ) : (
          !error && (
            <EmptyState
              icon="pin"
              title="빠른 기록이 없어요"
              message="내 지도의 ‘기록하기 → 빠른 저장’으로 가게에 도착했을 때 장소만 먼저 남겨 두세요."
              action={{ label: "맛집 기록하기", onClick: () => go("register"), variant: "primary" }}
              className="r-card r-me-empty"
            />
          )
        )}
      </div>
    </main>
  );
}

function DraftCard({
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
  const label = draft.category ? categoryLabel(draft.category) : "장소";
  const isCafe = isCafeCategory(draft.category);
  return (
    <li className="r-card r-me-draft-card">
      <div className="r-me-draft-card__head">
        <span className={`r-me-draft-card__icon ${isCafe ? "is-cafe" : ""}`} aria-hidden="true">
          <Icon name={isCafe ? "coffee" : "fork"} />
        </span>
        <span className="r-me-draft-card__copy">
          <span className="r-me-draft-card__title">
            <b>{draft.placeName}</b>
            <span className="r-tag">{label}</span>
          </span>
          {draft.address && <small>{draft.address}</small>}
        </span>
      </div>
      <div className="r-me-draft-card__foot">
        <span className="r-me-draft-card__time">
          <Icon name="clock" />
          {formatRelativeTime(draft.savedAt)} 저장
        </span>
        <button
          type="button"
          className="r-icon-button r-me-draft-card__delete"
          disabled={isDeleting}
          onClick={onDelete}
          aria-label={`${draft.placeName} 빠른 기록 삭제`}
        >
          <Icon name="trash" />
        </button>
        <button
          type="button"
          className="r-button r-button--pill r-button--primary"
          onClick={onContinue}
          aria-label={`${draft.placeName} 맛집 기록 이어 쓰기`}
        >
          <Icon name="plus" />
          이어 쓰기
        </button>
      </div>
    </li>
  );
}
