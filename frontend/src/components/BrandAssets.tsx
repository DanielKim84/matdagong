/** 맛다공 그림 자산(음식 예시 사진, 맛객 아바타·배경, 지도 위 내 위치·맛객 핀 미리 보기)입니다. */
import { useState } from "react";
import type { Place } from "../models/place";
import { demoAvatarNumber } from "../utils/profileMedia";
import { stableHash } from "../utils/stableHash";
import MascotArt, { CHARACTER_SHEET, characterViewBox } from "./MascotArt";
import { LOCK_BADGE_SVG, MARKER_SHELL_PATH, TRUST_BADGE_SVG } from "./mapMarkerArt";

/** 등록 사진이 없는 장소도 화면이 비지 않도록 네 장의 음식 시안 중 하나를 장소 ID로 고정해 보여줍니다. */
export function FoodPhoto({ place }: { place: Pick<Place, "id"> }) {
  const cell = stableHash(place.id) % 4;
  return (
    <svg
      className="food-photo"
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

/** 맛객 프로필 사진입니다. 사진이 없으면 variant번 기본 캐릭터, 샘플 계정(demo-avatar:N)은 샘플 사진을 그립니다. */
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
  // 오래된 업로드 URL이 사라졌으면 맛객별 기본 이미지로 바꿔 깨진 이미지 표시를 막습니다.
  const displayedSrc = src && failedImage === src ? fallbackSrc : src;
  const demoNumber = demoAvatarNumber(displayedSrc);
  const demoCell = demoNumber ? demoNumber - 1 : -1;
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
          viewBox={characterViewBox(variant || 1)}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <image href={CHARACTER_SHEET.url} width={CHARACTER_SHEET.width} height={CHARACTER_SHEET.height} />
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

/**
 * 지도 위 내 위치 표시(내비게이션의 자동차 아이콘처럼). 틀 없이 내 캐릭터가 지도 위에 서 있고,
 * 발밑의 파란 원이 실제 위치입니다(MapCanvas는 이 원의 가운데를 좌표에 맞춥니다).
 */
export function MyPositionMarker({ name = "나", variant = 1 }: { name?: string; variant?: number }) {
  return (
    <span className="my-position-marker" role="img" aria-label={`내 위치 · ${name}`}>
      <span className="my-position-marker__ground" aria-hidden="true" />
      <MascotArt pose={variant} className="my-position-marker__character" />
    </span>
  );
}

/** 지도 마커 안내에서 실제 지도(MapCanvas)와 같은 모양의 맛객 핀을 보여줍니다. */
export function TasterMapMarker({
  name = "맛객",
  kind = "subscribed",
  isPrivate = false,
  isTrusted = false,
}: {
  name?: string;
  kind?: "subscribed" | "other" | "own";
  /** 나만 보는 내 기록(kind="own")이면 체크 대신 자물쇠 표식을 붙입니다. */
  isPrivate?: boolean;
  /**
   * 믿고 가는 맛객 표식(지도 마커와 같은 모양). 구독 중이면 하트 자리에 같은 색 별을 넣고,
   * 구독하지 않은 맛객이면 오른쪽 위에 주황 바탕 별을 붙입니다.
   */
  isTrusted?: boolean;
}) {
  const variant = kind === "subscribed" ? 4 : 1;
  return (
    <span className={`taster-map-marker-preview taster-map-marker--${kind}`} aria-label={name}>
      <svg className="taster-map-marker-shell" viewBox="0 0 43 53" aria-hidden="true">
        <path d={MARKER_SHELL_PATH} />
      </svg>
      <span className="taster-map-marker-face">
        <Avatar name={name} variant={variant} />
      </span>
      {(kind === "own" && isPrivate) || (kind === "subscribed" && isTrusted) ? (
        <i
          className={`taster-map-marker-badge taster-map-marker-badge--${kind}${isPrivate ? " is-private" : ""}`}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: isPrivate ? LOCK_BADGE_SVG : TRUST_BADGE_SVG }}
        />
      ) : (
        kind !== "other" && (
          <i className={`taster-map-marker-badge taster-map-marker-badge--${kind}`} aria-hidden="true">
            {kind === "subscribed" ? "♥" : "✓"}
          </i>
        )
      )}
      {isTrusted && kind === "other" && (
        <span
          className="taster-map-marker-trust"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: TRUST_BADGE_SVG }}
        />
      )}
    </span>
  );
}
