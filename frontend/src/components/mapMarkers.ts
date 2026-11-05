/**
 * 지도(MapCanvas)에 올리는 마커 DOM을 만듭니다. 카카오 CustomOverlay가 DOM 요소를 받으므로 React 대신 직접 만들고,
 * 모양은 mapMarkerArt.ts의 SVG 원본과 app.css의 마커 규칙을 BrandAssets의 미리 보기와 함께 씁니다.
 */
import { MY_TASTER_ID, type MapKind, type Place, type Taster } from "../models/place";
import { compareByTrust, isTrustedTaster } from "../models/trust";
import { demoAvatarNumber } from "../utils/profileMedia";
import { CHARACTER_SHEET, characterViewBox } from "./MascotArt";
import { LOCK_BADGE_SVG, MARKER_SHELL_PATH, TRUST_BADGE_SVG, symbolMarkerHtml } from "./mapMarkerArt";

const SVG_NS = "http://www.w3.org/2000/svg";
// 묶음 마커 격자 한 칸의 크기(위도·경도 도)입니다. 배율 7에서 이 크기이고 한 단계 넓어질 때마다 두 배가 됩니다.
const CLUSTER_CELL_DEGREES = 0.018;
// 맛객 정보가 없는 장소도 핀을 그릴 수 있게 쓰는 기본 맛객입니다.
const FALLBACK_TASTER: Taster = {
  tasterId: "sample-taster",
  tasterName: "맛객",
  tag: "",
  avatar: "",
  avatarVariant: 1,
  note: "",
};

type PlaceGroup = { latitude: number; longitude: number; count: number };

/** 축소한 지도에서 장소를 격자 칸별로 묶고, 칸마다 평균 위치와 장소 수를 돌려줍니다. */
export function groupPlacesByCell(places: Place[], zoomLevel: number): PlaceGroup[] {
  const cellSize = CLUSTER_CELL_DEGREES * 2 ** (zoomLevel - 7);
  const groups = new Map<string, PlaceGroup>();
  places.forEach((place) => {
    const row = Math.floor(place.latitude / cellSize);
    const column = Math.floor(place.longitude / cellSize);
    const key = `${row}:${column}`;
    const group = groups.get(key) ?? { latitude: 0, longitude: 0, count: 0 };
    group.latitude += place.latitude;
    group.longitude += place.longitude;
    group.count += 1;
    groups.set(key, group);
  });
  return [...groups.values()].map((group) => ({
    latitude: group.latitude / group.count,
    longitude: group.longitude / group.count,
    count: group.count,
  }));
}

export function createClusterMarker(count: number): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-cluster-marker";
  button.setAttribute("aria-label", `맛집 ${count}곳이 모인 곳`);
  button.textContent = String(count);
  return button;
}

/** 내 기록, 구독 관계를 계정 데이터로 판단해 마커 종류를 나눕니다. 취향 %는 카드·목록에서만 보여 줍니다. */
function markerKind(place: Place, subscriptions: string[]): MapKind {
  const isMyRecord = place.visibility === "private" || place.tasters.some((taster) => taster.tasterId === MY_TASTER_ID);
  if (isMyRecord) return "own";
  return place.tasters.some((taster) => subscriptions.includes(taster.tasterId)) ? "subscribed" : "other";
}

/** 핀 가운데에 넣을 맛객 사진, 없으면 관계별 포즈의 맛다공 캐릭터입니다. */
function markerFace(role: "subscribed" | "other" | "own", taster: Taster): HTMLElement {
  const face = document.createElement("span");
  face.className = "taster-map-marker-face";
  const hasUploadedPhoto = taster.avatar && demoAvatarNumber(taster.avatar) === null;
  if (hasUploadedPhoto) {
    const image = document.createElement("img");
    image.src = taster.avatar;
    image.alt = "";
    face.append(image);
    return face;
  }
  const roleVariant = role === "subscribed" ? 4 : role === "own" ? taster.avatarVariant : 1;
  const avatar = document.createElementNS(SVG_NS, "svg");
  avatar.setAttribute("viewBox", characterViewBox(roleVariant || taster.avatarVariant || 1));
  avatar.setAttribute("aria-hidden", "true");
  avatar.setAttribute("preserveAspectRatio", "xMidYMid slice");
  const sprite = document.createElementNS(SVG_NS, "image");
  sprite.setAttribute("href", CHARACTER_SHEET.url);
  sprite.setAttribute("width", String(CHARACTER_SHEET.width));
  sprite.setAttribute("height", String(CHARACTER_SHEET.height));
  avatar.append(sprite);
  face.append(avatar);
  return face;
}

/** 기호 마커의 화면 읽기용 이름 앞말입니다. */
const SYMBOL_LABELS = { liked: "가볼 곳", visited: "다녀온 곳", search: "검색한 가게" } as const;

/**
 * 장소 하나의 마커 버튼입니다. 구독·다른 맛객·내 기록은 맛객 핀으로, 가볼 곳·다녀온 곳·검색한 가게는 기호 마커로 그립니다.
 * 종류는 kindOverride가 있으면 그것(내 지도), 없으면 계정 관계로 정합니다. 누르면 할 일은 부르는 쪽이 붙입니다.
 */
export function createPlaceMarker(place: Place, subscriptions: string[], kindOverride?: MapKind): HTMLButtonElement {
  const kind = kindOverride ?? markerKind(place, subscriptions);
  const button = document.createElement("button");
  button.type = "button";
  if (kind === "liked" || kind === "visited" || kind === "search") {
    button.className = `map-category-marker map-category-marker--${kind}`;
    button.setAttribute("aria-label", `${SYMBOL_LABELS[kind]} ${place.name}`);
    button.innerHTML = symbolMarkerHtml(kind);
    return button;
  }

  const subscribedTaster = place.tasters.find((taster) => subscriptions.includes(taster.tasterId));
  const fallbackTaster = place.tasters.find((taster) => taster.tasterId !== MY_TASTER_ID) ?? FALLBACK_TASTER;
  // 믿고 가는 맛객이 기록한 곳은 핀 종류와 상관없이 별 표식을 붙이고, 그 맛객 얼굴을 먼저 보여 줍니다.
  const trustedTaster = place.tasters
    .filter((taster) => taster.tasterId !== MY_TASTER_ID && isTrustedTaster(taster))
    .sort(compareByTrust)[0];
  const markerTaster =
    kind === "subscribed"
      ? ((trustedTaster && subscriptions.includes(trustedTaster.tasterId) ? trustedTaster : subscribedTaster) ??
        fallbackTaster)
      : kind === "other"
        ? (trustedTaster ??
          place.tasters.find(
            (taster) => taster.tasterId !== MY_TASTER_ID && !subscriptions.includes(taster.tasterId),
          ) ??
          fallbackTaster)
        : (place.tasters.find((taster) => taster.tasterId === MY_TASTER_ID) ?? fallbackTaster);
  // 내 기록 중 나만 보기는 같은 보라 핀에 자물쇠 표식으로 구분합니다.
  const isPrivateOwn = kind === "own" && (place.visibility === "private" || markerTaster.visibility === "PRIVATE");
  button.className = `taster-map-marker taster-map-marker--${kind}${isPrivateOwn ? " is-private" : ""}`;
  const owner =
    kind === "own"
      ? isPrivateOwn
        ? "나만 보는 내 기록"
        : "내가 등록한"
      : kind === "other"
        ? `구독하지 않은 ${markerTaster.tasterName} 맛객이 추천한`
        : `${markerTaster.tasterName} 맛객이 추천한`;
  const trustNote = kind !== "own" && trustedTaster ? ", 믿고 가는 맛객의 기록" : "";
  button.setAttribute("aria-label", `${owner} ${place.name}${trustNote}`);

  const shell = document.createElementNS(SVG_NS, "svg");
  shell.setAttribute("class", "taster-map-marker-shell");
  shell.setAttribute("viewBox", "0 0 43 53");
  shell.setAttribute("aria-hidden", "true");
  const shellPath = document.createElementNS(SVG_NS, "path");
  shellPath.setAttribute("d", MARKER_SHELL_PATH);
  shell.append(shellPath);
  button.append(shell, markerFace(kind, markerTaster));

  // 표식은 오른쪽 위에 하나만 둡니다. 구독 중인 믿고 가는 맛객은 하트 자리에 같은 색 별을 넣습니다.
  if (kind !== "other") {
    const badge = document.createElement("span");
    badge.className = "taster-map-marker-badge";
    badge.setAttribute("aria-hidden", "true");
    if (isPrivateOwn) badge.innerHTML = LOCK_BADGE_SVG;
    else if (kind === "subscribed" && trustedTaster) badge.innerHTML = TRUST_BADGE_SVG;
    else badge.textContent = kind === "subscribed" ? "♥" : "✓";
    button.append(badge);
  }
  // 구독하지 않은 믿고 가는 맛객은 눈에 잘 띄도록 주황 바탕 별을 붙입니다.
  if (kind === "other" && trustedTaster) {
    const trustBadge = document.createElement("span");
    trustBadge.className = "taster-map-marker-trust";
    trustBadge.setAttribute("aria-hidden", "true");
    trustBadge.innerHTML = TRUST_BADGE_SVG;
    button.append(trustBadge);
  }
  return button;
}
