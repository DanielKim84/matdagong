import { createPortal } from "react-dom";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import type { LikeChoice, LikeChoicePrompt } from "./useLikeChoice";

/**
 * 찬 하트를 눌렀을 때 고르는 시트입니다. 스토리 보기처럼 시트보다 위에 뜨는 화면에서도 보이도록 문서 끝에 붙입니다.
 * 다녀왔는데 별로였어요 · 빼기 두 가지만 둡니다.
 */
export default function LikeChoiceSheet({
  prompt,
  onChoose,
  onClose,
}: {
  prompt: LikeChoicePrompt;
  onChoose: (choice: LikeChoice) => void;
  onClose: () => void;
}) {
  return createPortal(
    <Sheet
      title="하트를 풀까요?"
      onClose={onClose}
      className="r-like-choice"
      backdropClassName="r-like-choice-backdrop"
    >
      <p className="r-like-choice__place">‘{prompt.placeName}’</p>
      <div className="r-like-choice__list">
        <button
          type="button"
          className="r-like-choice__option r-like-choice__option--disliked"
          onClick={() => onChoose("disliked")}
        >
          <span className="r-like-choice__icon" aria-hidden="true">
            <Icon name="close" />
          </span>
          <span className="r-like-choice__copy">
            <b>다녀왔는데 별로였어요</b>
            <small>
              발견·내 지도의 지도에서 이 맛집을 빼고, 이 맛집을 추천한 맛객과의 신뢰에 반영해요. 피드에서는
              ‘별로였어요’로 보여요. 나 탭의 별로였던 곳에서 되돌릴 수 있어요. 직접 다녀온 곳(가게 근처)에서만 고를 수
              있어요.
            </small>
          </span>
        </button>
        <button
          type="button"
          className="r-like-choice__option r-like-choice__option--remove"
          onClick={() => onChoose("remove")}
        >
          <span className="r-like-choice__icon" aria-hidden="true">
            <Icon name="heart" />
          </span>
          <span className="r-like-choice__copy">
            <b>가볼 곳에서 빼기</b>
            <small>하트만 지워요. 발견에 다시 보이고, 언제든 다시 저장할 수 있어요.</small>
          </span>
        </button>
      </div>
    </Sheet>,
    document.body,
  );
}
