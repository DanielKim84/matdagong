import { Avatar } from "../../components/BrandAssets";
import { isMyTaster, type Taster } from "../../models/place";
import type { PlaceContext } from "./discoverModel";

/** 대표 맛객 한 줄: 얼굴, 이름, 구독·취향 표시. */
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
  const match = ctx.matchOf(taster);
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
      {isSubscribed ? (
        <em className="r-discover-taster__sub">구독</em>
      ) : match > 0 ? (
        <span className="r-match">취향 {match}%</span>
      ) : null}
    </span>
  );
}
