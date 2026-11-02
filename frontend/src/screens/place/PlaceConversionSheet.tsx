import { useAppData } from "../../app/AppData";
import Sheet from "../../components/Sheet";
import type { Place } from "../../models/place";

/** record: 하트로 저장한 맛집을 방문 기록으로, like: 직접 쓴 기록을 내 맛집(하트)으로 바꿉니다. */
export type ConversionKind = "record" | "like";

/** 방문 기록 ↔ 내 맛집 전환 확인 시트입니다. 기록 삭제를 동반할 수 있어 한 번 더 묻습니다. */
export default function PlaceConversionSheet({
  place,
  kind,
  onClose,
}: {
  place: Place;
  kind: ConversionKind;
  onClose: () => void;
}) {
  const { actions } = useAppData();
  const isToRecord = kind === "record";

  function confirm() {
    onClose();
    if (isToRecord) actions.startRecordConversion(place);
    else void actions.convertRecordToLike(place);
  }

  return (
    <Sheet
      title={isToRecord ? "방문 기록으로 바꿀까요?" : "내 맛집으로 바꿀까요?"}
      onClose={onClose}
      className="r-place-sheet"
    >
      <p>
        {isToRecord
          ? `‘${place.name}’의 장소 정보를 기록 화면에 채워 둘게요. 추천 이유와 방문 정보를 적어 저장하면 내 맛집에서 자동으로 빠져요.`
          : `‘${place.name}’에 직접 남긴 추천 이유, 메뉴, 태그, 방문 정보와 사진을 삭제하고 내 맛집으로 옮겨요.`}
      </p>
      <div className="r-place-sheet__actions">
        <button type="button" className="r-button r-button--secondary" onClick={onClose}>
          취소
        </button>
        <button type="button" className="r-button r-button--primary" onClick={confirm}>
          {isToRecord ? "기록 화면으로 이동" : "변경하기"}
        </button>
      </div>
    </Sheet>
  );
}
