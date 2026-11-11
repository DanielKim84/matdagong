/**
 * 서버에서 받은 장소·기록·맛객 목록을 화면이 쓰는 모양으로 합칩니다. 상태 없이 입력만으로 계산합니다.
 * App이 그릴 때마다 부르며, 결과는 useAppData()로 화면에 넘어갑니다.
 */
import type { ActiveSubscription, IncomingSubscription, MyProfile } from "../models/community";
import { MY_TASTER_ID, type Place, type Taster } from "../models/place";
import { compareByTrust, isTrustedTaster } from "../models/trust";

type PlaceSources = {
  /** 지도 검색 결과(공개 장소) */
  places: Place[];
  myPlaceRecords: Place[];
  recentPlaces: Place[];
  /** 상세 화면(#place/<id>)용으로 따로 받은 장소 */
  detail: Place | null;
  routeId: string;
  communityTasters: Taster[];
  subscriptions: ActiveSubscription[];
  incomingSubscriptions: IncomingSubscription[];
  myProfile: MyProfile | null;
  displayName: string;
  /** 지도 검색어. 비공개 기록도 같은 검색어로 거릅니다. */
  query: string;
  isMyTasterId: (tasterId: string) => boolean;
};

export function enrichPlaces({
  places,
  myPlaceRecords,
  recentPlaces,
  detail,
  routeId,
  communityTasters,
  subscriptions,
  incomingSubscriptions,
  myProfile,
  displayName,
  query,
  isMyTasterId,
}: PlaceSources) {
  /**
   * 장소 응답에는 작성자 사진·캐릭터가 없고(services/places가 기본값으로 둠) 이름도 기록할 때의 값일 수 있으므로,
   * 화면에 보이는 이름·사진·배경은 커뮤니티 프로필로 채웁니다. 프로필을 찾지 못한 맛객은 기본 캐릭터로 남습니다.
   * 내 기록은 tasterId를 MY_TASTER_ID("me")로 바꿉니다.
   */
  function enrichPlace(place: Place): Place {
    return {
      ...place,
      tasters: place.tasters.map((author) => {
        if (isMyTasterId(author.tasterId))
          return {
            ...author,
            tasterId: MY_TASTER_ID,
            tasterName: myProfile?.nickname ?? displayName,
            avatar: myProfile?.profileImgUrl ?? "",
            avatarVariant: myProfile?.avatarVariant ?? author.avatarVariant,
          };
        const profile = communityTasters.find((taster) => taster.tasterId === author.tasterId);
        return profile
          ? {
              ...author,
              ...profile,
              note: author.note,
              menus: author.menus,
              photos: author.photos,
              tags: author.tags,
              tagGroups: author.tagGroups,
              visitConditions: author.visitConditions,
              visibility: author.visibility,
            }
          : author;
      }),
    };
  }

  // 추천 취향에서 제외한 매장 조건(예: 노키즈존)이 있는 장소는 목록과 지도에서 뺍니다. 이름으로 비교하므로
  // 제외 태그(커뮤니티 VISIT 태그)와 기록의 매장 이용 정보(models/place VISIT_CONDITIONS)는 같은 이름이어야 합니다.
  // 내가 직접 기록한 곳은 조건과 상관없이 남깁니다(내 다이어리에 있는데 지도에서 사라지지 않게).
  const excludedConditions = new Set(myProfile?.excludedTags ?? []);
  const allPlaces = places
    .filter(
      (place) =>
        place.tasters.some((taster) => isMyTasterId(taster.tasterId)) ||
        !(place.visitConditions ?? []).some((condition) => excludedConditions.has(condition)),
    )
    .map(enrichPlace);
  // 구독만 하고 공개 기록이 없는 계정이 맛객 추천에 섞이지 않도록 공개 기록 작성자만 맛객으로 취급합니다.
  const publicTasterIds = new Set(
    places.flatMap((place) =>
      place.tasters.filter((taster) => taster.visibility !== "PRIVATE").map((taster) => taster.tasterId),
    ),
  );
  const profileAccountIds = new Set([
    ...subscriptions.map((subscription) => subscription.targetAccountId),
    ...incomingSubscriptions.map((subscription) => subscription.subscriberAccountId),
  ]);
  const registered = myPlaceRecords
    .filter((place) => place.tasters.some((taster) => isMyTasterId(taster.tasterId)))
    .map(enrichPlace);
  const privateRecords = registered
    .filter((place) => place.tasters.some((taster) => taster.visibility === "PRIVATE"))
    .filter((place) => !query || `${place.name} ${place.address}`.includes(query));
  const activePlace =
    detail?.id === routeId
      ? enrichPlace(detail)
      : [...allPlaces, ...privateRecords].find((place) => place.id === routeId);
  const tasterById = new Map(allPlaces.flatMap((place) => place.tasters).map((taster) => [taster.tasterId, taster]));
  // 공개 작성자와 현재 구독 관계가 있는 계정은 지도에 장소가 없어도 프로필을 열 수 있습니다.
  communityTasters
    .filter((taster) => publicTasterIds.has(taster.tasterId) || profileAccountIds.has(taster.tasterId))
    .forEach((taster) => tasterById.set(taster.tasterId, taster));
  const subscriptionIds = subscriptions.map((subscription) => subscription.targetAccountId);
  const recommendedTasters = communityTasters
    .filter((taster) => publicTasterIds.has(taster.tasterId))
    .filter(
      (taster) =>
        ((taster.matchScore ?? 0) > 0 || isTrustedTaster(taster)) && !subscriptionIds.includes(taster.tasterId),
    )
    .sort(compareByTrust);

  return {
    places: allPlaces,
    privatePlaces: privateRecords,
    myRecords: registered,
    recentPlaces: recentPlaces.map(enrichPlace),
    activePlace,
    tasters: [...tasterById.values()],
    tasterById,
    subscriptionIds,
    recommendedTasters,
    /** 공개 기록이 하나라도 있으면 맛객으로 표시합니다. */
    hasPublicRecord: registered.some((place) => place.tasters.some((taster) => taster.visibility === "PUBLIC")),
    /** 수정할 내 기록(#register/<id>)을 내 기록에서 찾습니다. */
    editablePlace: (id: string) => registered.find((place) => place.id === id),
    /** 목록 타일에는 내가 올린 사진을 우선 보여줍니다. 없으면 타일이 기본 이미지를 고릅니다. */
    photoFor: (id: string) =>
      [...allPlaces, ...privateRecords, ...myPlaceRecords]
        .find((place) => place.id === id)
        ?.tasters.find((taster) => isMyTasterId(taster.tasterId))?.photos?.[0],
  };
}
