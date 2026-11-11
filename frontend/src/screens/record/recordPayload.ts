import type { TasteTag } from "../../models/community";
import type { NewPlace, RecommendedMenu, VisitCondition } from "../../models/place";
import type { TasteTagGroup } from "../../models/tasteTags";
import { shortCategory } from "../../utils/format";
import type { Coordinates } from "../../utils/geo";
import type { FoodKind, MenuRow } from "./recordModel";

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
  foodKind: FoodKind;
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
  const { selectedPlace, foodKind, tasteTags } = input;
  // 분류는 태그 사전에서 정합니다. 사전에 없는 이름(빠진 옛 태그)은 분류를 지어내지 않고 보내지 않습니다.
  const tagGroups: Record<string, TasteTagGroup> = {};
  input.tags.forEach((tag) => {
    const group = tasteTags.find((item) => item.name === tag && item.tagGroup !== "VISIT")?.tagGroup;
    if (group) tagGroups[tag] = group;
  });
  return {
    providerCode: "KAKAO",
    providerPlaceId: selectedPlace.id,
    roadAddress: selectedPlace.road_address_name || undefined,
    lotAddress: selectedPlace.address_name || undefined,
    providerPhone: selectedPlace.phone || undefined,
    providerUrl: selectedPlace.place_url || undefined,
    name: input.name.trim(),
    category: foodKind === "CAFE_DESSERT" ? "카페 · 디저트" : shortCategory(selectedPlace.category_name) || "음식점",
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
