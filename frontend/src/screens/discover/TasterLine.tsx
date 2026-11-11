import TasterAvatar from "../../components/TasterAvatar";
import TasteScore from "../../components/TasteScore";
import { isMyTaster, type Taster } from "../../models/place";
import type { PlaceContext } from "./discoverModel";

/**
 * 대표 맛객 줄(발견·내 지도의 카드·목록): 위 줄에 얼굴·이름과 오른쪽 끝 "구독 중", 아래 줄에 신뢰·취향 칩.
 * 맛객 목록과 같은 배치로, 칩을 이름 옆에 두지 않아 이름이 잘리지 않게 합니다. 내 기록이면 칩 없이 "내 기록"만 씁니다.
 */
export default function TasterLine({
  taster,
  ctx,
  others = 0,
  stack = [],
}: {
  taster?: Taster;
  ctx: PlaceContext;
  /** 대표 맛객 말고 더 기록한 맛객 수 */
  others?: number;
  /** 얼굴을 겹쳐 보여 줄 맛객(대표 포함) */
  stack?: Taster[];
}) {
  if (!taster) return null;
  const faces = stack.length > 1 ? stack.slice(0, 3) : [taster];
  const isMine = isMyTaster(taster);
  const isSubscribed = ctx.subscriptions.has(taster.tasterId);
  return (
    <span className="r-discover-taster">
      <span className="r-discover-taster__who">
        <span className="r-avatar-stack" aria-hidden="true">
          {faces.map((face) => (
            <TasterAvatar key={face.tasterId} taster={face} />
          ))}
        </span>
        <b>
          {isMine ? "내 기록" : taster.tasterName}
          {others > 0 ? ` 외 ${others}명` : ""}
        </b>
        {isSubscribed && !isMine && <em className="r-tag r-tag--mine r-discover-taster__sub">구독 중</em>}
      </span>
      {!isMine && <TasteScore taster={{ ...taster, matchScore: ctx.matchOf(taster) }} />}
    </span>
  );
}
