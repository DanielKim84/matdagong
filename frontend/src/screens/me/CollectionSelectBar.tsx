import Icon from "../../components/Icon";

type Props = {
  /** 고르기 모드인지. 아니면 안내 문구와 "골라서 …" 버튼을 둡니다. */
  isSelecting: boolean;
  isAllPicked: boolean;
  pickedCount: number;
  shownCount: number;
  /** 나만 보기 칩이면 공개로, 내가 등록한 곳 칩이면 나만 보기로 바꿉니다. */
  shouldMakePublic: boolean;
  onStart: () => void;
  onToggleAll: () => void;
  onCancel: () => void;
};

/** 내 맛집 모음의 내가 등록한 곳·나만 보기 칩 위에 두는 공개 범위 고르기 줄입니다. */
export default function CollectionSelectBar({
  isSelecting,
  isAllPicked,
  pickedCount,
  shownCount,
  shouldMakePublic,
  onStart,
  onToggleAll,
  onCancel,
}: Props) {
  return (
    <div className="r-me-select-bar">
      {isSelecting ? (
        <>
          <button type="button" className="r-me-select-bar__all" aria-pressed={isAllPicked} onClick={onToggleAll}>
            <span className={`r-me-check ${isAllPicked ? "is-on" : ""}`} aria-hidden="true">
              <Icon name="check" />
            </span>
            전체 선택
            <small>{pickedCount ? `${pickedCount}곳 선택` : `${shownCount}곳`}</small>
          </button>
          <button type="button" className="r-button r-button--pill r-button--secondary" onClick={onCancel}>
            취소
          </button>
        </>
      ) : (
        <>
          <span>
            {shouldMakePublic
              ? "골라서 공개하면 다른 사람도 볼 수 있어요."
              : "공개한 기록은 다른 사람의 지도·피드에 보여요."}
          </span>
          <button type="button" className="r-button r-button--pill r-button--soft" onClick={onStart}>
            <Icon name={shouldMakePublic ? "user" : "lock"} />
            {shouldMakePublic ? "골라서 공개" : "골라서 나만 보기"}
          </button>
        </>
      )}
    </div>
  );
}
