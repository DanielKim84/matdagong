import type { Place, Taster } from "../../models/place";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { isMine, type PlaceContext } from "./discoverModel";

/** 장소 사진. 맛객이 올린 사진이 없으면 예시 사진 대신 음식 종류 기호를 보여 줍니다. */
export function PlaceThumb({ place, photo, className = "" }: { place: Place; photo?: string; className?: string }) {
  if (photo) return <img className={`r-discover-thumb ${className}`} src={photo} alt="" loading="lazy" decoding="async" />;
  const cafe = /카페|디저트|베이커리|간식|제과/.test(place.category);
  return (
    <span className={`r-discover-thumb r-discover-thumb--empty ${className}`} aria-hidden="true">
      <Icon name={cafe ? "coffee" : "fork"} />
    </span>
  );
}

/** 대표 맛객 한 줄: 얼굴, 이름, 구독·취향 표시. */
export function TasterLine({
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
  const subscribed = ctx.subscriptions.has(taster.tasterId);
  const match = ctx.matchOf(taster);
  return (
    <span className="r-discover-taster">
      <span className="r-avatar-stack" aria-hidden="true">
        {faces.map((face) => (
          <Avatar key={face.tasterId} src={face.avatar} name={face.tasterName} variant={face.avatarVariant} />
        ))}
      </span>
      <b>{isMine(taster) ? "내 기록" : taster.tasterName}{others > 0 ? ` 외 ${others}명` : ""}</b>
      {subscribed ? <em className="r-discover-taster__sub">구독</em> : match > 0 ? <span className="r-match">취향 {match}%</span> : null}
    </span>
  );
}
