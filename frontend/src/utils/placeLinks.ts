/** 맛집을 밖으로 여는 주소(카카오맵 장소·길찾기)와 이 앱의 상세 주소 공유입니다. */
import { RETRY_LATER_MESSAGE, type AppNotice } from "../app/AppData";
import type { Place } from "../models/place";

// 길찾기 출발지는 오래 기다리지 않고(5초), 1분 안에 얻은 위치면 그대로 씁니다.
const ORIGIN_LOCATION_OPTIONS: PositionOptions = { timeout: 5000, maximumAge: 60_000 };

/** 이 앱에서 장소 상세(#place/<id>)를 여는 주소입니다. 공유·복사에 씁니다. */
function placeUrl(place: Pick<Place, "id">): string {
  return `${window.location.origin}${window.location.pathname}#place/${encodeURIComponent(place.id)}`;
}

/** 카카오맵 앱·웹에서 장소를 엽니다. 카카오 장소 ID가 없으면 좌표로 엽니다. */
export function kakaoPlaceUrl(place: Pick<Place, "providerPlaceId" | "latitude" | "longitude">): string {
  return place.providerPlaceId
    ? `http://m.map.kakao.com/scheme/place?id=${encodeURIComponent(place.providerPlaceId)}`
    : `http://m.map.kakao.com/scheme/look?p=${place.latitude},${place.longitude}`;
}

/** 현재 위치를 얻으면 출발지를 넣어 카카오맵 길찾기를 열고, 실패하면 도착지만 넣어 엽니다. */
export function openDirections(place: Pick<Place, "name" | "latitude" | "longitude">): void {
  const openRoute = (origin?: GeolocationCoordinates) => {
    window.location.href = origin
      ? `http://m.map.kakao.com/scheme/route?sp=${origin.latitude},${origin.longitude}&ep=${place.latitude},${place.longitude}&by=car`
      : `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
  };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => openRoute(coords),
      () => openRoute(),
      ORIGIN_LOCATION_OPTIONS,
    );
  } else openRoute();
}

/** shared: 공유 창으로 보냄, copied: 링크 복사, cancelled: 사용자가 공유 창을 닫음, failed: 둘 다 못 함 */
type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** 장소 링크를 공유하거나(지원 기기) 복사합니다. 화면에서는 안내까지 함께 띄우는 sharePlaceWithNotice를 씁니다. */
async function sharePlace(place: Pick<Place, "id" | "name">): Promise<ShareResult> {
  const url = placeUrl(place);
  try {
    if (navigator.share) {
      await navigator.share({ title: place.name, text: `맛다공에서 본 ${place.name}`, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") return "cancelled";
    return "failed";
  }
}

/**
 * 장소를 공유하고, 링크를 복사했거나 실패했을 때 안내를 띄웁니다. 피드 카드와 맛집 상세가 같은 문구를 쓰도록 여기서만 정합니다.
 * 공유 창으로 보냈거나 사용자가 닫았으면 따로 알리지 않습니다.
 */
export async function sharePlaceWithNotice(
  place: Pick<Place, "id" | "name">,
  notify: (notice: AppNotice) => void,
): Promise<void> {
  const result = await sharePlace(place);
  if (result === "copied") {
    notify({ kind: "success", title: "링크를 복사했어요", message: `${place.name} 링크를 붙여 넣어 공유해 보세요.` });
  } else if (result === "failed") {
    notify({ kind: "error", title: "공유하지 못했어요", message: RETRY_LATER_MESSAGE });
  }
}
