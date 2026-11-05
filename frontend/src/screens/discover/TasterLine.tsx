import { Avatar } from "../../components/BrandAssets";
import TasteScore from "../../components/TasteScore";
import { isMyTaster, type Taster } from "../../models/place";
import { isTrustedTaster } from "../../models/trust";
import type { PlaceContext } from "./discoverModel";

/** 대표 맛객 한 줄: 얼굴, 이름, 구독·신뢰·취향 표시. 믿고 가는 맛객이면 구독 여부보다 신뢰 등급을 보여 줍니다. */
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
  const isSubscribed = ctx.subscriptions.has(taster.tasterId);
  return (
    <span className="r-discover-taster">
      <span className="r-avatar-stack" aria-hidden="true">
        {faces.map((face) => (
          <Avatar key={face.tasterId} src={face.avatar} name={face.tasterName} variant={face.avatarVariant} />
        ))}
      </span>
      <b>
        {isMyTaster(taster) ? "내 기록" : taster.tasterName}
        {others > 0 ? ` 외 ${others}명` : ""}
      </b>
      {isSubscribed && !isTrustedTaster(taster) ? (
        <em className="r-discover-taster__sub">구독</em>
      ) : isMyTaster(taster) ? null : (
        <TasteScore taster={{ ...taster, matchScore: ctx.matchOf(taster) }} />
      )}
    </span>
  );
}
