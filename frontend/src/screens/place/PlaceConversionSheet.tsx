import { useAppData } from "../../app/AppData";
import Sheet from "../../components/Sheet";
import type { Place } from "../../models/place";

/** 입맛에 맞았던 하트(직접 다녀온 곳)를 방문 기록으로 바꿀지 묻는 시트입니다. 확인하면 이 가게를 채운 기록하기로 갑니다. */
export default function PlaceConversionSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const { actions } = useAppData();

  function confirm() {
    onClose();
    actions.startRecordConversion(place);
  }

  return (
    <Sheet title="방문 기록으로 바꿀까요?" onClose={onClose} className="r-place-sheet">
      <p>
        ‘{place.name}’의 장소 정보를 기록 화면에 채워 둘게요. 사진과 추천 이유를 적어 저장하면 하트 대신 내 기록으로
        남아요.
      </p>
      <div className="r-place-sheet__actions">
        <button type="button" className="r-button r-button--secondary" onClick={onClose}>
          취소
        </button>
        <button type="button" className="r-button r-button--primary" onClick={confirm}>
          기록 화면으로 이동
        </button>
      </div>
    </Sheet>
  );
}
