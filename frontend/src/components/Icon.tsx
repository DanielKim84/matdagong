/** 화면 곳곳에서 쓰는 선 아이콘(24×24, 선 굵기 1.65)입니다. 아이콘 모양은 ICON_SHAPES에 이름별로 둡니다. */
export type IconName =
  | "home"
  | "search"
  | "plus"
  | "bell"
  | "user"
  | "back"
  | "close"
  | "chevron"
  | "chevron-down"
  | "info"
  | "logout"
  | "copy"
  | "coins"
  | "paw"
  | "globe"
  | "crown"
  | "ban"
  | "shared"
  | "tag"
  | "user-plus"
  | "user-x"
  | "external"
  | "alert"
  | "heart"
  | "bookmark"
  | "share"
  | "pin"
  | "clock"
  | "star"
  | "settings"
  | "filter"
  | "locate"
  | "camera"
  | "check"
  | "fork"
  | "coffee"
  | "book"
  | "message"
  | "image"
  | "route"
  | "sparkle"
  | "map"
  | "list"
  | "more"
  | "megaphone"
  | "phone"
  | "map-off"
  | "pencil"
  | "seal-check"
  | "pin-off"
  | "undo"
  | "trash"
  | "lock"
  | "cake"
  | "car"
  | "view"
  | "people"
  | "store";

const ICON_SHAPES: Record<IconName, string> = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  search: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0m-2 6 5 5",
  plus: "M12 3v18M3 12h18",
  bell: "M5 9a7 7 0 0 1 14 0v5l2 3H3l2-3V9M9 21h6",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3",
  back: "m15 4-8 8 8 8",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m9 5 7 7-7 7",
  "chevron-down": "m6 9 6 6 6-6",
  logout: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v6M12 7.5h.01",
  tag: "M3 12V3h9l9 9-9 9-9-9ZM8 8h.01",
  "user-x": "M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M3 21v-1a8 8 0 0 1 12-6.9M17 15l5 5M22 15l-5 5",
  "user-plus": "M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M3 21v-1a8 8 0 0 1 12-6.9M19 14v6M16 17h6",
  paw: "M12 12.2c2.5 0 4.3 2.3 5.3 4.1.9 1.7 0 3.9-2.1 3.9-1.3 0-2-.6-3.2-.6s-1.9.6-3.2.6c-2.1 0-3-2.2-2.1-3.9 1-1.8 2.8-4.1 5.3-4.1ZM3.7 10.4a1.9 2.3 0 1 0 3.8 0 1.9 2.3 0 1 0-3.8 0ZM7.5 6.4a2.1 2.5 0 1 0 4.2 0 2.1 2.5 0 1 0-4.2 0ZM12.3 6.4a2.1 2.5 0 1 0 4.2 0 2.1 2.5 0 1 0-4.2 0ZM16.5 10.4a1.9 2.3 0 1 0 3.8 0 1.9 2.3 0 1 0-3.8 0Z",
  coins:
    "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  copy: "M8 8h12v12H8V8ZM16 8V4H4v12h4",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  alert: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v6M12 16.5h.01",
  heart: "M20.8 8.8c0 5.2-8.8 11.2-8.8 11.2S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 8.8 2.3Z",
  bookmark: "M6 3h12v19l-6-4-6 4V3Z",
  // 공유 중(내 지도·내 맛집 모음의 갈래): 세 점을 이은 모양. 동그라미는 채우고 잇는 선만 선으로 그립니다(FILLED_ICONS).
  // 공유하는 동작 버튼은 아래 share(위 화살표 상자)를 씁니다.
  shared:
    "M17.5 2.5a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4ZM6.5 8.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4ZM17.5 15.1a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4ZM9.3 10.4l5.4-3.1M9.3 13.6l5.4 3.1",
  // 상자가 아래쪽에 무게가 실려 보여, 전체를 조금 위(2.5~20)로 올려 동그라미 안에서 가운데로 보이게 합니다.
  share: "M12 13.5V2.5m-4 4 4-4 4 4M8 9H5.5v11h13V9H16",
  pin: "M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1 1 16 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  clock: "M12 7v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z",
  settings: "m9 3-1 3-3 1-2 4 2 2v4l3 1 2 3h4l2-3 3-1v-4l2-2-2-4-3-1-1-3H9ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  filter: "M4 6h16M4 18h16M8 3v6M16 15v6",
  locate: "M12 1v5M12 18v5M1 12h5M18 12h5M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  camera: "M8 5 10 2h4l2 3h5v16H3V5h5ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  check: "m5 12 4 4L20 5",
  fork: "M4 2v6a3 3 0 0 0 6 0V2M7 2v20M20 22V2c-5 3-5 10 0 10",
  coffee: "M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 0 1 0 6h-2M8 2v3M12 2v3M2 23h18",
  book: "M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H3V4ZM21 4h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h5V4Z",
  message: "M3 3h18v14H9l-6 5V3Z",
  image: "M3 3h18v18H3V3Zm0 13 6-7 6 8 3-4 3 3M17 6h.01",
  route: "m4 4 17 7-8 3-3 8L4 4Z",
  sparkle:
    "m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Zm7 13 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  map: "M3 6.5 9 3l6 3 6-3v14.5L15 21l-6-3-6 3V6.5ZM9 3v15m6-12v15",
  list: "M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01",
  more: "M7 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M21 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  megaphone: "M3 10v4h3l8 5V5l-8 5H3ZM6 14l1.5 5h2.5l-1-4.2M17.5 9a3.5 3.5 0 0 1 0 6M20 6.5a7 7 0 0 1 0 11",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7.6 9.5a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.7 1.9Z",
  lock: "M5 11h14v11H5V11Zm3 0V7a4 4 0 0 1 8 0v4m-4 4v3",
  // 공개(프로필 편집의 "공개 프로필입니다" 안내, 보드 15)
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 3.7 5.5 3.7 9s-1.2 6.5-3.7 9c-2.5-2.5-3.7-5.5-3.7-9S9.5 5.5 12 3Z",
  // 대표(배경 사진의 첫 장, 보드 15-02)
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z",
  // 피하고 싶은 조건(추천에서 빼기, 보드 15-04)
  ban: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5.6 5.6l12.8 12.8",
  "map-off": "M3 6.5 9 3l6 3 6-3v14.5L15 21l-6-3-6 3V6.5ZM9 3v15m6-12v15M2 2l20 20",
  "seal-check":
    "M12 2.5 14.4 4.3 17.4 4.1 18.2 7 20.7 8.7 19.7 11.5 20.7 14.3 18.2 16 17.4 18.9 14.4 18.7 12 20.5 9.6 18.7 6.6 18.9 5.8 16 3.3 14.3 4.3 11.5 3.3 8.7 5.8 7 6.6 4.1 9.6 4.3 12 2.5ZM8.5 11.5l2.5 2.5 4.5-4.5",
  pencil: "M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4",
  "pin-off": "M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1 1 16 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0M3 3l18 18",
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V3h6v4",
  cake: "M4 21h16M5 21v-7.5A1.5 1.5 0 0 1 6.5 12h11a1.5 1.5 0 0 1 1.5 1.5V21M5 16.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0M12 12V8.5M12 6a1.5 1.5 0 0 1-1.5-1.5C10.5 3.5 12 2 12 2s1.5 1.5 1.5 2.5A1.5 1.5 0 0 1 12 6Z",
  car: "M5.5 17H3v-5l2.5-5h13l2.5 5v5h-2.5M9.5 17h5M3 12h18M9.5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0M18.5 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  view: "M2 20 8.5 10l4.5 6 2.5-3 6.5 7H2ZM19.5 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0",
  people: "M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M3 21v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M18 14.5a5.5 5.5 0 0 1 3 4.5v2",
  store: "M4 10v11h16V10M3 10l2-6h14l2 6H3Zm0 0a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 21v-5h4v5",
};

/**
 * 선 없이 늘 채워 그리는 아이콘입니다(⋯ 더 보기 점 세 개 포함). 발바닥은 작은 둥근 조각(발가락)이 모인 모양이라 선으로 그리면 무엇인지 안 보여,
 * 지도 마커(mapMarkerArt.ts의 SYMBOL_GLYPHS.visited)와 같은 채운 모양으로 맞춥니다.
 */
const SOLID_ICONS: ReadonlySet<IconName> = new Set<IconName>(["paw", "more"]);
/** 늘 채워 그리되 잇는 선은 남기는 아이콘입니다. 공유 중 갈래 아이콘이 하트·발바닥처럼 그림 아이콘으로 보이게 합니다. */
const FILLED_ICONS: ReadonlySet<IconName> = new Set<IconName>(["shared"]);

export default function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const isSolid = SOLID_ICONS.has(name);
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill={filled || isSolid || FILLED_ICONS.has(name) ? "currentColor" : "none"}
      stroke={isSolid ? "none" : "currentColor"}
      strokeWidth={FILLED_ICONS.has(name) ? "2" : "1.65"}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_SHAPES[name]} />
    </svg>
  );
}
