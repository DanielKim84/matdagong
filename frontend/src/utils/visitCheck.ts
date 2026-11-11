/** 직접 다녀온 곳만 남기도록(내 기록 남기기·별로였어요) 지금 위치가 가게 근처인지 확인합니다. 서버도 같은 거리로 다시 확인합니다. */
import { VISIT_RADIUS_LABEL, VISIT_RADIUS_METERS, type Place } from "../models/place";
import { currentPosition, distanceMeters, type Coordinates } from "./geo";

/** near면 서버에 함께 보낼 지금 기기 위치를 담습니다. far: 멀리 있음, unavailable: 위치를 얻지 못함 */
type VisitCheck = { status: "near"; device: Coordinates } | { status: "far" | "unavailable" };

export async function checkVisitNow(place: Pick<Place, "latitude" | "longitude">): Promise<VisitCheck> {
  try {
    const device = await currentPosition();
    return distanceMeters(device, place) <= VISIT_RADIUS_METERS ? { status: "near", device } : { status: "far" };
  } catch {
    return { status: "unavailable" };
  }
}

/** 가게 근처가 아니어서 막을 때 함께 알리는 문구입니다. */
export function visitCheckMessage(status: "far" | "unavailable"): string {
  return status === "far"
    ? `지금 위치가 가게에서 ${VISIT_RADIUS_LABEL} 넘게 떨어져 있어요. 가게 근처에서 다시 눌러 주세요.`
    : `위치를 확인하지 못했어요. 위치 권한을 켜고 가게 근처(${VISIT_RADIUS_LABEL})에서 다시 눌러 주세요.`;
}
