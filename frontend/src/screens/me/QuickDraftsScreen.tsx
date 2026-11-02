import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, Skeleton, TopBar } from "../../components/ui";
import { kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../../services/places";
import { categoryLabel, formatRelativeTime } from "../../utils/format";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import { useQuickPlaceDrafts } from "./useQuickPlaceDrafts";

/** 빠른 장소 기록(#drafts): 가게에서 장소만 먼저 저장해 둔 곳. 이어서 맛집 기록을 완성하거나 지웁니다. */
export default function QuickDraftsScreen() {
  const { drafts, isLoaded, isLoading, error, deletingId, remove } = useQuickPlaceDrafts();

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
          <p className="r-me-error" role="alert">
            {error}
          </p>
        )}
        {isLoading && !isLoaded ? (
          <Skeleton shape="card" count={3} label="저장한 장소를 불러오고 있어요…" />
        ) : drafts.length ? (
          <ul className="r-me-drafts__list">
            {drafts.map((draft) => {
              const label = draft.category ? categoryLabel(draft.category) : "장소";
              const isCafe = /카페|디저트|베이커리/.test(draft.category ?? "");
              return (
                <li key={`${draft.providerCode}:${draft.providerPlaceId}`} className="r-card r-me-draft-card">
                  <div className="r-me-draft-card__head">
                    <span className={`r-me-draft-card__icon ${isCafe ? "is-cafe" : ""}`} aria-hidden="true">
                      <Icon name={isCafe ? "coffee" : "fork"} />
                    </span>
                    <span className="r-me-draft-card__copy">
                      <b>{draft.placeName}</b>
                      <span className="r-me-draft-card__meta">
                        <span className="r-tag r-tag--neutral">{label}</span>
                        <small>{formatRelativeTime(draft.savedAt)} 저장</small>
                      </span>
                    </span>
                  </div>
                  {draft.address && (
                    <p className="r-me-draft-card__address">
                      <Icon name="pin" />
                      {draft.address}
                    </p>
                  )}
                  <div className="r-me-draft-card__actions">
                    <button
                      type="button"
                      className="r-button r-button--pill r-button--soft r-me-draft-card__delete"
                      disabled={deletingId === draft.providerPlaceId}
                      onClick={() => void remove(draft)}
                      aria-label={`${draft.placeName} 빠른 기록 삭제`}
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      className="r-button r-button--pill r-button--primary"
                      onClick={() => continueDraft(draft)}
                      aria-label={`${draft.placeName} 맛집 기록 이어하기`}
                    >
                      <Icon name="plus" />
                      기록 이어하기
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          !error && (
            <EmptyState
              icon="pin"
              title="빠른 기록이 없어요"
              message="가운데 + 버튼의 ‘빠른 저장’으로 가게에 도착했을 때 장소만 먼저 남겨 두세요."
              action={{ label: "맛집 기록하기", onClick: () => go("register"), variant: "primary" }}
              className="r-card r-me-empty"
            />
          )
        )}
      </div>
    </main>
  );
}
