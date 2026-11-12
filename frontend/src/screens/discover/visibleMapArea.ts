import type { VisibleBounds } from "./discoverModel";

/**
 * 지도 범위에서 위·아래에 떠 있는 부품이 가린 부분을 뺀, 눈에 실제로 보이는 지도 범위입니다(발견·내 지도 공용).
 * 지도는 화면 전체에 깔리고 그 위에 검색창·칩(위)과 카드·목록 시트(아래)가 떠 있어, 지도가 알려 주는 범위를 그대로 쓰면
 * 가려진 곳의 맛집까지 카드·목록에 나옵니다. 화면 몇 km 안에서는 위도가 세로 위치에 거의 비례하므로 가려진 높이 비율만큼 깎습니다.
 * 왼쪽·오른쪽은 가리는 부품이 없어 그대로 둡니다.
 */
export function visibleMapArea(bounds: MapBounds, root: HTMLElement | null, top: HTMLElement | null): VisibleBounds {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  const full = {
    south: southWest.getLat(),
    west: southWest.getLng(),
    north: northEast.getLat(),
    east: northEast.getLng(),
  };
  const screen = root?.getBoundingClientRect();
  if (!root || !screen?.height) return full;

  const topEdge = top ? top.getBoundingClientRect().bottom : screen.top;
  const bottomEdge = Math.min(screen.bottom, ...coveringTops(root));
  const hiddenTop = clampRatio((topEdge - screen.top) / screen.height);
  const hiddenBottom = clampRatio((screen.bottom - bottomEdge) / screen.height);
  // 위아래가 거의 다 가려졌으면(시트를 끝까지 올린 채 지도를 옮긴 경우 등) 깎지 않고 지도 범위를 그대로 씁니다.
  if (hiddenTop + hiddenBottom >= 0.9) return full;
  const span = full.north - full.south;
  return { ...full, north: full.north - span * hiddenTop, south: full.south + span * hiddenBottom };
}

/** 접힌 시트일 때 지도 위에 떠 있는 덩어리 중 실제로 지도를 덮는 것(카드 줄, 안내 카드, 불러오는 중 카드)입니다. */
const FLOAT_COVERS = ".r-discover-carousel, .r-discover__float-card, .r-discover-float-skeleton";
/**
 * 카드 줄 높이(사진 96px + 카드 안쪽 여백·테두리 + 줄 위아래 여백). 처음 범위를 잴 때는 카드가 아직 없어서, 곧 생길 카드 자리를
 * 가린 것으로 미리 봅니다. 그러지 않으면 카드가 덮을 자리의 맛집까지 첫 카드에 섞입니다.
 * 그래서 발견·내 지도는 지역에 카드가 없을 때도 안내 카드를 띄워 이 자리를 늘 실제 부품으로 채웁니다.
 */
const CARD_STRIP_PX = 138;

/**
 * 아래에서 지도를 가리는 부품(목록 시트, 떠 있는 카드)의 위쪽 끝입니다. 시트를 올리면 떠 있는 덩어리는 사라지므로(inert)
 * 그때는 시트만 셉니다. 내 지도의 기록하기 버튼 줄은 오른쪽 버튼 하나뿐이라 지도를 가린 것으로 보지 않습니다.
 */
function coveringTops(root: HTMLElement): number[] {
  const sheet = root.querySelector<HTMLElement>(".r-discover-sheet");
  const float = root.querySelector<HTMLElement>(".r-discover__float");
  const isFloatShown = !!float && !float.inert;
  const covers = isFloatShown ? [...float.querySelectorAll<HTMLElement>(FLOAT_COVERS)] : [];
  const tops = [sheet, ...covers].flatMap((element) =>
    element && element.offsetHeight > 0 ? [element.getBoundingClientRect().top] : [],
  );
  if (isFloatShown && !covers.length) tops.push(float.getBoundingClientRect().bottom - CARD_STRIP_PX);
  return tops;
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}
