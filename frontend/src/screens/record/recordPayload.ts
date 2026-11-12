import type { TasteTag } from "../../models/community";
import { KAKAO_PROVIDER_CODE, type NewPlace, type RecommendedMenu, type VisitCondition } from "../../models/place";
import type { TasteTagGroup } from "../../models/tasteTags";
import type { Coordinates } from "../../utils/geo";
import type { MenuRow } from "./recordModel";

type RecordPayloadInput = {
  selectedPlace: KakaoPlaceResult;
  coordinates: Coordinates;
  name: string;
  address: string;
  reason: string;
  menus: MenuRow[];
  tags: string[];
  tasteTags: TasteTag[];
  visitConditions: VisitCondition[];
  photos: string[];
  visibility: NewPlace["visibility"];
};

/** 이름이 있는 메뉴만 남기고, 콤마를 지운 가격을 숫자로 바꿉니다. */
function recommendedMenus(menus: MenuRow[]): RecommendedMenu[] {
  return menus
    .filter((item) => item.name.trim())
    .map((item) => {
      const price = item.price.replaceAll(",", "");
      return {
        name: item.name.trim(),
        ...(price && Number.isFinite(Number(price)) ? { price: Number(price) } : {}),
        ...(item.photo ? { photo: item.photo } : {}),
      };
    });
}

/** 기록하기 입력을 서버에 보낼 새 기록으로 만듭니다. */
export function buildNewPlace(input: RecordPayloadInput): NewPlace {
  const { selectedPlace, tasteTags } = input;
  // 분류는 태그 사전에서 정합니다. 사전에 없는 이름은 분류를 지어내지 않고 보내지 않습니다(서버가 분류 없는 태그를 거부함).
  const tagGroups: Record<string, TasteTagGroup> = {};
  input.tags.forEach((tag) => {
    const group = tasteTags.find((item) => item.name === tag && item.tagGroup !== "VISIT")?.tagGroup;
    if (group) tagGroups[tag] = group;
  });
  return {
    providerCode: KAKAO_PROVIDER_CODE,
    providerPlaceId: selectedPlace.id,
    roadAddress: selectedPlace.road_address_name || undefined,
    lotAddress: selectedPlace.address_name || undefined,
    providerPhone: selectedPlace.phone || undefined,
    providerUrl: selectedPlace.place_url || undefined,
    name: input.name.trim(),
    // 분류는 카카오가 준 글자("음식점 > 한식 > 국밥") 그대로 저장하고, 화면에서만 categoryLabel로 줄여 보여 줍니다.
    category: selectedPlace.category_name || "음식점",
    address: input.address.trim(),
    ...input.coordinates,
    reason: input.reason.trim(),
    menus: recommendedMenus(input.menus),
    tags: Object.keys(tagGroups),
    tagGroups,
    visitConditions: input.visitConditions,
    photos: input.photos,
    visibility: input.visibility,
  };
}
