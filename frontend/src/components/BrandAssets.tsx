import { useState } from "react";
import type { Place } from "../models/place";
import { MARKER_SHELL_PATH } from "./mapMarkerArt";

export function FoodPhoto({
  place,
  index = 0,
  className = "",
}: {
  place?: Pick<Place, "id" | "category">;
  index?: number;
  className?: string;
}) {
  // 등록 사진이 없는 더미 장소도 화면이 비지 않도록 네 장의 음식 시안 중 하나를 보여줍니다.
  const stableIndex = place ? [...place.id].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) : index;
  const cell = ((stableIndex % 4) + 4) % 4;
  return (
    <svg
      className={`food-photo ${className}`}
      viewBox="0 0 512 512"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="맛집 음식 예시 사진"
    >
      <image
        href="/assets/food-photos.png"
        width="1024"
        height="1024"
        x={-(cell % 2) * 512}
        y={-Math.floor(cell / 2) * 512}
      />
    </svg>
  );
}

export function Avatar({
  className = "",
  src,
  fallbackSrc,
  name = "맛객",
  variant = 1,
}: {
  className?: string;
  src?: string | null;
  fallbackSrc?: string | null;
  name?: string;
  variant?: number;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const selectedVariant = Math.min(10, Math.max(1, Math.trunc(variant || 1)));
  const column = (selectedVariant - 1) % 5;
  const row = Math.floor((selectedVariant - 1) / 5);
  // 오래된 업로드 URL이 사라졌으면 맛객별 기본 이미지로 바꿔 깨진 이미지 표시를 막습니다.
  const displayedSrc = src && failedImage === src ? fallbackSrc : src;
  const demoPhoto = displayedSrc?.match(/^demo-avatar:(\d)$/);
  const demoCell = demoPhoto ? Number(demoPhoto[1]) - 1 : -1;
  return (
    <span className={`avatar ${className}`} role="img" aria-label={`${name} 프로필`}>
      {demoCell >= 0 ? (
        <svg
          className="brand-art avatar-character"
          viewBox={`${(demoCell % 2) * 627} ${Math.floor(demoCell / 2) * 627} 627 627`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <image href="/assets/demo-taster-portraits.png" width="1254" height="1254" />
        </svg>
      ) : displayedSrc ? (
        <img src={displayedSrc} alt="" onError={() => setFailedImage(displayedSrc)} />
      ) : (
        <svg
          className="brand-art avatar-character"
          viewBox={`${column * 396.6} ${row * 396.5} 396.6 396.5`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <image href="/assets/avatars/matdagong-characters-v1.png" width="1983" height="793" />
        </svg>
      )}
    </span>
  );
}

/** 기본 배경은 한 장의 이미지 묶음에서 ID별 장면을 골라 표시합니다. */
export function ProfileCover({ src, className = "" }: { src: string; className?: string }) {
  const demoCover = src.match(/^demo-cover:(\d)$/);
  const cell = demoCover ? Number(demoCover[1]) - 1 : -1;
  if (cell === 4) {
    return <img className={className} src="/assets/demo-taster-cover-5.png" alt="" />;
  }
  if (cell >= 0) {
    return (
      <svg className={className} viewBox="0 0 768 512" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <image
          href="/assets/demo-taster-covers.png"
          width="1536"
          height="1024"
          x={-(cell % 2) * 768}
          y={-Math.floor(cell / 2) * 512}
        />
      </svg>
    );
  }
  return <img className={className} src={src} alt="" />;
}

/** 지도 마커 안내에서 실제 지도(MapCanvas)와 같은 모양의 맛객 핀을 보여줍니다. */
export function TasterMapMarker({
  src,
  name = "맛객",
  variant,
  kind = "subscribed",
}: {
  src?: string | null;
  name?: string;
  variant?: number;
  kind?: "subscribed" | "other" | "matched" | "own";
}) {
  const fallbackVariant = kind === "subscribed" ? 4 : kind === "matched" ? 7 : 1;
  return (
    <span className={`taster-map-marker-preview taster-map-marker--${kind}`} aria-label={name}>
      <svg className="taster-map-marker-shell" viewBox="0 0 43 53" aria-hidden="true">
        <path d={MARKER_SHELL_PATH} />
      </svg>
      <span className="taster-map-marker-face">
        <Avatar src={src} name={name} variant={variant ?? fallbackVariant} />
      </span>
      {kind !== "other" && (
        <i className={`taster-map-marker-badge taster-map-marker-badge--${kind}`} aria-hidden="true">
          {kind === "subscribed" ? "♥" : kind === "own" ? "✓" : "✦"}
        </i>
      )}
    </span>
  );
}
