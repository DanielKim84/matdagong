import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import { isMyTaster } from "../../models/place";
import { splitReason } from "../record/recordModel";
import type { PlaceRecord } from "./placeRecords";

/**
 * 상세 위쪽의 대표 맛객 한마디(보드 09-01): 맛객 줄(얼굴 · 이름 · 신뢰·취향 · >) 아래 굵은 한 줄 추천과 두 줄까지 자른 이야기입니다.
 * 맛객 줄을 누르면 그 맛객 프로필로 갑니다(내 기록이면 누르지 않음). 전체 이야기는 아래 "맛객의 추천 이유"에서 봅니다.
 */
export default function PlaceTasterLead({ record }: { record: PlaceRecord }) {
  const { headline, detail } = splitReason(record.note.trim());
  const isMine = isMyTaster(record);
  const who = (
    <>
      <TasterAvatar taster={record} />
      <span className="r-place-lead__name">
        <b>{isMine ? "내 기록" : record.tasterName}</b>
        {!isMine && <TasteScore taster={record} />}
      </span>
      {!isMine && <Icon name="chevron" />}
    </>
  );
  return (
    <section className="r-place-lead" aria-label={`${record.tasterName}의 한마디`}>
      {isMine ? (
        <div className="r-place-lead__who">{who}</div>
      ) : (
        <button
          type="button"
          className="r-place-lead__who"
          onClick={() => go("profile", record.tasterId)}
          aria-label={`${record.tasterName} 프로필 보기`}
        >
          {who}
        </button>
      )}
      {headline && <p className="r-place-lead__quote">&ldquo;{headline}&rdquo;</p>}
      {detail && <p className="r-place-lead__story">{detail}</p>}
    </section>
  );
}
