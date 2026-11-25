import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";

/**
 * 내 기록 삭제 확인(보드 18-03): 연한 코랄 원 속 휴지통, "이 기록을 삭제할까요?"와 설명, 회색 안내(가게·가볼 곳은 남음),
 * 지우지 않고 숨기는 "나만 보기로 변경하기" 줄(이미 나만 보기면 두지 않음), 아래 취소 · 삭제입니다.
 */
export default function DeleteRecordSheet({
  isPrivate,
  onMakePrivate,
  onDelete,
  onClose,
}: {
  isPrivate: boolean;
  onMakePrivate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="이 기록을 삭제할까요?" onClose={onClose} className="r-choice-sheet r-delete-sheet" header={<span />}>
      <span className="r-delete-sheet__mark" aria-hidden="true">
        <Icon name="trash" />
      </span>
      <h2 className="r-delete-sheet__title">이 기록을 삭제할까요?</h2>
      <p className="r-delete-sheet__lead">
        이 맛집에 작성한 기록과 함께
        <br />
        등록한 사진, 태그가 모두 삭제돼요.
      </p>
      <p className="r-info-note">
        <Icon name="info" />
        기록을 삭제해도 가게와 가볼 곳(하트)은 그대로 남고, 다녀온 곳으로 계속 표시돼요.
      </p>
      {!isPrivate && (
        <button type="button" className="r-delete-sheet__private" onClick={onMakePrivate}>
          <Icon name="view" />
          <span>
            <b>나만 보기로 변경하기</b>
            <small>기록을 삭제하지 않고, 나만 볼 수 있어요.</small>
          </span>
          <Icon name="chevron" />
        </button>
      )}
      <div className="r-choice-sheet__actions">
        <button type="button" className="r-button r-button--secondary" onClick={onClose}>
          취소
        </button>
        <button type="button" className="r-button r-button--primary" onClick={onDelete}>
          삭제
        </button>
      </div>
    </Sheet>
  );
}
