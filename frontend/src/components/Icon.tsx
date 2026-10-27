export type IconName =
  | "home"
  | "search"
  | "plus"
  | "bell"
  | "user"
  | "back"
  | "close"
  | "chevron"
  | "heart"
  | "bookmark"
  | "share"
  | "pin"
  | "clock"
  | "star"
  | "settings"
  | "list"
  | "filter"
  | "locate"
  | "camera"
  | "check"
  | "fork"
  | "coffee"
  | "book"
  | "message"
  | "image"
  | "route";
const shapes: Record<IconName, string> = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  search: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0m-2 6 5 5",
  plus: "M12 3v18M3 12h18",
  bell: "M5 9a7 7 0 0 1 14 0v5l2 3H3l2-3V9M9 21h6",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 22v-3a8 8 0 0 1 16 0v3",
  back: "m15 4-8 8 8 8",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m9 5 7 7-7 7",
  heart:
    "M20.8 8.8c0 5.2-8.8 11.2-8.8 11.2S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 8.8 2.3Z",
  bookmark: "M6 3h12v19l-6-4-6 4V3Z",
  share: "M12 15V2m-4 4 4-4 4 4M7 10H4v12h16V10h-3",
  pin: "M20 9c0 6-8 13-8 13S4 15 4 9a8 8 0 1 1 16 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  clock: "M12 7v5l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z",
  settings:
    "m9 3-1 3-3 1-2 4 2 2v4l3 1 2 3h4l2-3 3-1v-4l2-2-2-4-3-1-1-3H9ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
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
};

export default function Icon({
  name,
  filled = false,
}: {
  name: IconName;
  filled?: boolean;
}) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={shapes[name]} />
    </svg>
  );
}
