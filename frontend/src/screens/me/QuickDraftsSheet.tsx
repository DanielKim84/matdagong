import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { EmptyState, Skeleton } from "../../components/ui";
import { kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../../services/places";
import { categoryLabel, formatMonthDay } from "../../utils/format";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import type { QuickPlaceDrafts } from "./useQuickPlaceDrafts";

/** 빠른 장소 기록 시트: 이어서 맛집 기록하기, 삭제. */
export default function QuickDraftsSheet({
  quickDrafts,
  onClose,
}: {
  quickDrafts: QuickPlaceDrafts;
  onClose: () => void;
}) {
  const { drafts, isLoaded, isLoading, error, deletingId, remove } = quickDrafts;

  function continueDraft(draft: QuickPlaceDraft) {
    // 기록 화면이 열릴 때 이 장소를 선택 상태로 복원하도록 일회성 값을 넘깁니다.
    writeStorageJson(STORAGE_KEYS.quickPlaceHandoff, kakaoPlaceFromQuickDraft(draft), "session");
    onClose();
    go("register");
  }

  return (
    <Sheet title="빠른 장소 기록" onClose={onClose} className="r-me-sheet">
      <p className="r-me-sheet__intro r-muted">
        장소만 먼저 저장한 기록이에요. 맛집으로 기록하면 이 목록에서 자동으로 정리돼요.
      </p>
      {error && (
        <p className="r-me-sheet__error" role="alert">
          {error}
        </p>
      )}
      {isLoading && !isLoaded ? (
        <Skeleton shape="row" count={3} label="저장한 장소를 불러오고 있어요…" />
      ) : drafts.length ? (
        <div className="r-me-sheet__list">
          {drafts.map((draft) => (
            <div className="r-me-draft" key={`${draft.providerCode}:${draft.providerPlaceId}`}>
              <button
                type="button"
                className="r-row"
                onClick={() => continueDraft(draft)}
                aria-label={`${draft.placeName} 맛집 기록 이어하기`}
              >
                <span className="r-badge-icon">
                  <Icon name="pin" />
                </span>
                <span className="r-row__copy">
                  <b>{draft.placeName}</b>
                  <small>{draft.address}</small>
                  <small>
                    {draft.category ? categoryLabel(draft.category) : "장소"} · {formatMonthDay(draft.savedAt)} 저장
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="r-icon-button"
                aria-label={`${draft.placeName} 기록 삭제`}
                disabled={deletingId === draft.providerPlaceId}
                onClick={() => void remove(draft)}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <EmptyState
            icon="pin"
            title="빠른 기록이 없어요"
            message="가게에 도착했을 때 장소만 먼저 저장해 두고, 나중에 기록을 완성할 수 있어요."
            className="r-me-empty"
          />
        )
      )}
    </Sheet>
  );
}
