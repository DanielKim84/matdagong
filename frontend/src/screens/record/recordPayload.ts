import type { TasteTag } from "../../models/community";
import type { NewPlace, RecommendedMenu, VisitCondition } from "../../models/place";
import { shortCategory } from "../../utils/format";
import type { Coordinates } from "../../utils/geo";
import type { FoodKind, MenuRow } from "./recordModel";

export type RecordPayloadInput = {
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
  const { selectedPlace, foodKind, tags, tasteTags } = input;
  return {
    id: `local-${crypto.randomUUID()}`,
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
    tags,
    tagGroups: Object.fromEntries(
      tags.map((tag) => [tag, tasteTags.find((item) => item.name === tag)?.tagGroup ?? "TASTE"]),
    ),
    visitConditions: input.visitConditions,
    photos: input.photos,
    visibility: input.visibility,
    createdAt: new Date().toISOString(),
  };
}
