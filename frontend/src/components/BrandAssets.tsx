import { useState } from "react";
import type { Place } from "../models/place";

const regions = {
  avatar: [1352, 481, 47, 47],
  welcome: [222, 171, 179, 141],
  discover: [414, 134, 184, 198],
  map: [610, 133, 189, 198],
  subscribe: [812, 134, 180, 198],
  points: [1005, 133, 174, 198],
  ads: [1190, 133, 161, 192],
  redPin: [65, 876, 63, 72],
  purplePin: [209, 876, 63, 72],
  photoPin: [350, 876, 63, 72],
  adPin: [499, 876, 63, 72],
} as const;

export function BrandArt({
  name,
  className = "",
  label = "",
}: {
  name: "logo" | keyof typeof regions;
  className?: string;
  label?: string;
}) {
  if (name === "logo")
    return (
      <img
        className={`brand-art ${className}`}
        src="/assets/brand-logo.png"
        alt={label}
        aria-hidden={!label}
        style={{ objectFit: "contain" }}
      />
    );
  const [x, y, width, height] = regions[name];
  return (
    <svg
      className={`brand-art ${className}`}
      viewBox={`${x} ${y} ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={!label}
    >
      <image href="/assets/design-reference.png" width="1536" height="1024" />
    </svg>
  );
}

export function FoodPhoto({
  place,
  index = 0,
  className = "",
}: {
  place?: Pick<Place, "id">;
  index?: number;
  className?: string;
}) {
  const photoIndex = place
    ? (Number(place.id.replace(/\D/g, "")) || 1) - 1
    : index;
  const cell = ((photoIndex % 4) + 4) % 4;
  return (
    <svg
      className={`food-photo ${className}`}
      viewBox="0 0 512 512"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="음식 예시 사진"
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
  name = "맛객",
  variant = 1,
}: {
  className?: string;
  src?: string | null;
  name?: string;
  variant?: number;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const selectedVariant = Math.min(10, Math.max(1, Math.trunc(variant || 1)));
  const column = (selectedVariant - 1) % 5;
  const row = Math.floor((selectedVariant - 1) / 5);
  return (
    <span className={`avatar ${className}`} role="img" aria-label={`${name} 프로필`}>
      {src && failedImage !== src ? (
        <img src={src} alt="" onError={() => setFailedImage(src)} />
      ) : (
        <svg
          className="brand-art avatar-character"
          viewBox={`${column * 396.6} ${row * 396.5} 396.6 396.5`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <image
            href="/assets/avatars/matdagong-characters-v1.png"
            width="1983"
            height="793"
          />
        </svg>
      )}
    </span>
  );
}

export function CategoryArt({ index }: { index: number }) {
  return (
    <svg className="category-art" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#FFF1DB" stroke="#F6DEBD" />
      <ellipse
        cx="20"
        cy="24"
        rx="12"
        ry="7"
        fill="#FFFDF6"
        stroke="#9D6B46"
        strokeWidth="1.2"
      />
      {index === 0 ? (
        <>
          <path d="M10 21h20l-3 9H13z" fill="#CC583B" />
          <path d="M13 20q7-10 14 0" fill="#F4E3B9" />
          <path d="M16 16h2m4 0h2" stroke="#6C9E46" strokeWidth="2" />
        </>
      ) : index === 1 ? (
        <>
          <path d="M10 19q4-7 9-1l2 8H11z" fill="#F8BE8B" />
          <path d="M21 18q5-6 9 1l-1 7h-8z" fill="#FF7952" />
          <path d="m13 17 4 7m7-7 4 7" stroke="#fff3ce" strokeWidth="1.5" />
        </>
      ) : index === 2 ? (
        <>
          <path d="M9 23q5-15 11 0 5-15 11 0" fill="#D7AB6E" stroke="#A47843" />
          <path d="m13 17 1 5m10-5 2 5" stroke="#EFD4A4" />
        </>
      ) : index === 3 ? (
        <>
          <path d="m11 20 9-9 10 9-4 7H15z" fill="#F5B85D" />
          <path d="m12 21 17 0" stroke="#8B432D" strokeWidth="3" />
          <path d="m14 17 11 0" stroke="#78A252" strokeWidth="2" />
        </>
      ) : index === 4 ? (
        <>
          <path d="M12 14h15v13H12z" fill="#D59C68" />
          <path
            d="M27 17c9-2 7 10 0 7"
            fill="none"
            stroke="#9B6648"
            strokeWidth="2"
          />
          <path d="M16 12q-2-4 1-5m5 5q-2-4 1-5" fill="none" stroke="#C5A37B" />
        </>
      ) : (
        <>
          <path d="M12 17h16v10H12z" fill="#EDB562" />
          <path d="M14 12h12v5H14z" fill="#B37B3F" />
          <path d="M18 8h4v4h-4z" fill="#DAA157" />
        </>
      )}
    </svg>
  );
}
