import { isMyTaster, type Taster } from "../../models/place";

/**
 * 사진 목록 줄의 한마디(보드의 “반찬까지 정갈해서 또 가고 싶은 곳이에요.”)입니다. 발견·내 지도 목록이 함께 씁니다.
 * 대표 맛객의 추천 이유를 따옴표로 두 줄까지 보여 주고, 이유가 없으면 누구의 기록인지 한 줄로 알립니다.
 */
export default function PlaceQuote({ taster }: { taster?: Taster }) {
  if (!taster) return null;
  const note = taster.note.trim();
  if (note) return <span className="r-place-card__note">“{note}”</span>;
  return <span className="r-place-card__note">{isMyTaster(taster) ? "내 기록" : `${taster.tasterName}님의 기록`}</span>;
}
