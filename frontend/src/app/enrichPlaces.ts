/**
 * 서버에서 받은 장소·기록·맛객 목록을 화면이 쓰는 모양으로 합칩니다. 상태 없이 입력만으로 계산합니다.
 * App이 그릴 때마다 부르며, 결과는 useAppData()로 화면에 넘어갑니다.
 */
import type { ActiveSubscription, IncomingSubscription, MyProfile } from "../models/community";
import { MY_TASTER_ID, type NewPlace, type Place, type Taster } from "../models/place";
import { compareByTrust, isTrustedTaster } from "../models/trust";

/** 이전 버전이 브라우저에만 저장했던 등록 기록을 서버로 옮기기 전까지 화면에 보여줄 장소 형태로 바꿉니다. */
function registeredPlace(item: NewPlace): Place {
  return {
    id: item.id,
    providerCode: item.providerCode,
    providerPlaceId: item.providerPlaceId,
    providerPhone: item.providerPhone,
    providerUrl: item.providerUrl,
    visibility: item.visibility,
    name: item.name,
    category: item.category ?? item.tags[0] ?? "맛객 추천",
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    recentNote: item.reason,
    recordCount: 1,
    visitConditions: item.visitConditions,
    tasters: [
      {
        tasterId: MY_TASTER_ID,
        tasterName: "맛다공이",
        tag: "내가 발견한 맛집",
        avatar: "",
        avatarVariant: 1,
        note: item.reason,
        menus: item.menus,
        photos: item.photos,
        tags: item.tags,
        tagGroups: item.tagGroups,
        visitConditions: item.visitConditions,
      },
    ],
  };
}

type PlaceSources = {
  /** 지도 검색 결과(공개 장소) */
  places: Place[];
  myPlaceRecords: Place[];
  recentPlaces: Place[];
  /** 상세 화면(#place/<id>)용으로 따로 받은 장소 */
  detail: Place | null;
  routeId: string;
  /** 이 브라우저에만 남은 이전 버전 등록 기록 전체 */
  legacyRegistered: NewPlace[];
  /** 그중 아직 서버로 옮기지 못한 기록(옮기기가 끝나면 빈 목록) */
  legacyStillLocal: NewPlace[];
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
  legacyRegistered,
  legacyStillLocal,
  communityTasters,
  subscriptions,
  incomingSubscriptions,
  myProfile,
  displayName,
  query,
  isMyTasterId,
}: PlaceSources) {
  /**
   * 장소 기록의 작성자 정보에는 예전 샘플 이름이나 사진이 남아 있을 수 있으므로,
   * 화면에 보이는 이름·사진·배경은 커뮤니티 프로필을 기준으로 맞춥니다. 내 기록은 tasterId를 MY_TASTER_ID("me")로 바꿉니다.
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
              tag: author.tag,
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

  const legacyPublic = legacyStillLocal.filter((place) => place.visibility !== "private").map(registeredPlace);
  const legacyPrivate = legacyStillLocal.filter((place) => place.visibility === "private").map(registeredPlace);
  // 아직 서버로 옮기지 못한 이전 브라우저 등록 기록입니다. 상세 화면에서 내 기록으로 보여줍니다.
  const legacyOwnRecord = legacyRegistered.find((place) => place.id === routeId);
  // 추천 취향에서 제외한 매장 조건(예: 노키즈존)이 있는 장소는 목록과 지도에서 뺍니다.
  // 내가 직접 기록한 곳은 조건과 상관없이 남깁니다(내 다이어리에 있는데 지도에서 사라지지 않게).
  const excludedConditions = new Set(myProfile?.excludedTags ?? []);
  const allPlaces = [...legacyPublic, ...places]
    .filter(
      (place) =>
        place.tasters.some((taster) => isMyTasterId(taster.tasterId)) ||
        !(place.visitConditions ?? []).some((condition) => excludedConditions.has(condition)),
    )
    .map(enrichPlace);
  // 구독 화면 확인용 일반 계정이 맛객 추천에 섞이지 않도록 공개 기록 작성자만 맛객으로 취급합니다.
  const publicTasterIds = new Set(
    [...legacyPublic, ...places].flatMap((place) =>
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
  const privateRecords = [
    ...registered.filter((place) => place.tasters.some((taster) => taster.visibility === "PRIVATE")),
    ...legacyPrivate,
  ].filter((place) => !query || `${place.name} ${place.address}`.includes(query));
  const allRegistered = [...registered, ...legacyPublic.map(enrichPlace)];
  const activePlace =
    detail?.id === routeId
      ? enrichPlace(detail)
      : ([...allPlaces, ...privateRecords].find((place) => place.id === routeId) ??
        (legacyOwnRecord ? registeredPlace(legacyOwnRecord) : undefined));
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
    myRecords: allRegistered,
    recentPlaces: recentPlaces.map(enrichPlace),
    activePlace,
    legacyOwnRecord,
    tasters: [...tasterById.values()],
    tasterById,
    subscriptionIds,
    recommendedTasters,
    /** 공개 기록이 하나라도 있으면 맛객으로 표시합니다. */
    hasPublicRecord: registered.some((place) => place.tasters.some((taster) => taster.visibility === "PUBLIC")),
    /** 수정할 내 기록(#register/<id>)을 서버 기록과 아직 옮기지 못한 브라우저 기록에서 찾습니다. */
    editablePlace: (id: string) =>
      [...allRegistered, ...legacyPrivate.map(enrichPlace)].find((place) => place.id === id),
    /** 목록 타일에는 내가 올린 사진을 우선 보여줍니다. 없으면 타일이 기본 이미지를 고릅니다. */
    photoFor: (id: string) =>
      legacyRegistered.find((place) => place.id === id)?.photos[0] ??
      [...allPlaces, ...privateRecords, ...myPlaceRecords]
        .find((place) => place.id === id)
        ?.tasters.find((taster) => isMyTasterId(taster.tasterId))?.photos?.[0],
  };
}
