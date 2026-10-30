import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { NewPlace, Place, RecommendedMenu, VisitCondition } from "../models/place";
import type { FoodFocus, TasteTag } from "../services/community";
import { VISIT_CONDITION_GROUPS, isVisitCondition } from "../models/place";
import { ScreenHeader } from "../components/AppChrome";
import { Avatar } from "../components/BrandAssets";
import { loadPhoto } from "../services/photos";
import { searchKakaoPlaces } from "../services/kakao";
import Icon from "../components/Icon";
import TasteTagPicker from "../components/TasteTagPicker";
import { groupsForFocus } from "../models/tasteTags";
import { getQuickPlaceDrafts, kakaoPlaceFromPlace, kakaoPlaceFromQuickDraft, saveQuickPlaceDraft as persistQuickPlaceDraft, type QuickPlaceDraft } from "../services/places";
import TasteTagRequestSheet from "./TasteTagRequestSheet";
import type { TagRequest, TagRequestInput } from "../services/community";
import Sheet from "../components/Sheet";
import { useNotificationDialog } from "../components/NotificationDialog";
import { isSessionExpiredError, onSessionExpiring } from "../services/http";
import {
  LIKE_CONVERSION_HANDOFF_KEY,
  QUICK_PLACE_HANDOFF_KEY,
  clearRegisterDraft,
  readRegisterDraft,
  refreshMediaUrl,
  saveRegisterDraft,
  type RegisterDraftForm,
} from "../services/registerDraft";
import { accountIdFromAccessToken } from "../utils/accessToken";
import { distanceMeters, kakaoPlaceCoordinates, type Coordinates } from "../utils/geo";

// 직접 방문한 장소만 기록하도록 현재 위치 1km 안의 장소만 검색·선택할 수 있습니다.
const NEARBY_RADIUS_METERS = 1000;

/** 다른 화면이 넘겨준 장소(하트 전환·빠른 기록)가 있으면 그 요청이 보관된 입력보다 우선합니다. */
function hasPlaceHandoff(): boolean {
  try {
    return !!sessionStorage.getItem(LIKE_CONVERSION_HANDOFF_KEY) || !!sessionStorage.getItem(QUICK_PLACE_HANDOFF_KEY);
  } catch {
    return false;
  }
}

export default function RegisterScreen({
  places,
  likedPlaceIds,
  visitedLikedPlaceIds,
  editPlace,
  editPlaceId,
  tasteTags,
  defaultFocus,
  accessToken,
  onRegister,
  onRequest,
  onLoadRequests,
}: {
  places: Place[];
  likedPlaceIds: string[];
  visitedLikedPlaceIds: string[];
  editPlace?: Place;
  /** 주소의 수정 대상 ID입니다. 기록을 아직 불러오는 중이면 editPlace 없이 이 값만 있습니다. */
  editPlaceId?: string;
  tasteTags: TasteTag[];
  defaultFocus: FoodFocus;
  accessToken: string;
  onRegister: (place: NewPlace, convertFromPlaceId?: string, visitedConfirmed?: boolean) => Promise<void>;
  onRequest: (input: TagRequestInput) => Promise<TagRequest>;
  onLoadRequests: () => Promise<TagRequest[]>;
}) {
  const { confirm } = useNotificationDialog();
  const editRecord = editPlace?.tasters.find((taster) => taster.tasterId === "me");
  const editing = !!editPlace && !!editRecord;
  const draftEditPlaceId = editing && editPlace ? editPlace.id : null;
  // 수정할 기록을 아직 불러오는 중이면 빈 폼이 잠시 보이므로 보관한 입력을 복원하거나 저장하지 않습니다.
  const editLoading = !!editPlaceId && !editing;
  const accountId = accountIdFromAccessToken(accessToken);
  // 로그인 만료로 보관해 둔 입력은 같은 계정·같은 등록 대상일 때 한 번만 복원합니다.
  const [restoredDraft] = useState(() =>
    editLoading || hasPlaceHandoff() ? null : readRegisterDraft(accountId, draftEditPlaceId));
  const draft = restoredDraft?.form;
  // 비공개 기록 사진은 짧게 유효한 서명 주소이므로, 복원할 때 새로 받은 기록의 주소가 있으면 그것을 씁니다.
  const currentRecordPhotos = editRecord?.photos ?? [];
  const currentMenuPhotos = (editRecord?.menus ?? []).flatMap((menu) => typeof menu !== "string" && menu.photo ? [menu.photo] : []);
  const [draftNotice, setDraftNotice] = useState<string | null>(() => !restoredDraft ? null
    : restoredDraft.photosOmitted
      ? "로그인이 만료되기 전 입력한 내용을 복원했어요. 저장 공간이 부족해 새로 추가한 사진은 복원하지 못했어요. 사진을 다시 추가해 주세요."
      : "로그인이 만료되기 전 입력한 내용을 복원했어요.");
  const [photos, setPhotos] = useState<string[]>(() => draft
    ? draft.photos.map((photo) => refreshMediaUrl(photo, currentRecordPhotos))
    : editRecord?.photos ?? []);
  const [name, setName] = useState(() => draft ? draft.name : editPlace?.name ?? "");
  const [address, setAddress] = useState(() => draft ? draft.address : editPlace?.address ?? "");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(() => draft ? draft.coordinates : editPlace ? { latitude: editPlace.latitude, longitude: editPlace.longitude } : null);
  const [reason, setReason] = useState(() => draft ? draft.reason : editRecord?.note ?? "");
  const [menus, setMenus] = useState<{ name: string; price: string; photo?: string }[]>(() => {
    if (draft) {
      return draft.menus.map((menu) => menu.photo ? { ...menu, photo: refreshMediaUrl(menu.photo, currentMenuPhotos) } : menu);
    }
    const existing = (editRecord?.menus ?? []).map((menu) => typeof menu === "string" ? { name: menu, price: "" } : { name: menu.name, price: menu.price?.toLocaleString("ko-KR") ?? "", photo: menu.photo });
    return existing.length ? existing : [{ name: "", price: "" }];
  });
  const [tags, setTags] = useState<string[]>(() => draft ? draft.tags : editRecord?.tags ?? []);
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>(() => draft
    ? draft.visitConditions.filter(isVisitCondition)
    : (editRecord?.visitConditions ?? []) as VisitCondition[]);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<KakaoPlaceResult[]>([]);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("현재 위치를 확인하고 있어요.");
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(() => draft?.activeDraftId ?? null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [infoPickerOpen, setInfoPickerOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlaceResult | null>(() => draft ? draft.selectedPlace : editPlace ? kakaoPlaceFromPlace(editPlace) : null);
  const [convertFromPlaceId, setConvertFromPlaceId] = useState<string | null>(() => draft?.convertFromPlaceId ?? null);
  const [visitedConfirmed, setVisitedConfirmed] = useState(() => draft?.visitedConfirmed ?? false);
  const [visitPromptOpen, setVisitPromptOpen] = useState(false);
  const [conversionNeedsPlaceSearch, setConversionNeedsPlaceSearch] = useState(() => draft?.conversionNeedsPlaceSearch ?? false);
  const [conversionSearchName, setConversionSearchName] = useState(() => draft?.conversionSearchName ?? "");
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [foodKind, setFoodKind] = useState<"RESTAURANT" | "CAFE_DESSERT">(() => draft ? draft.foodKind
    : editPlace?.category?.includes("카페") || editPlace?.category?.includes("디저트") || defaultFocus === "CAFE_DESSERT" ? "CAFE_DESSERT" : "RESTAURANT",
  );
  const [visibility, setVisibility] =
    useState<NewPlace["visibility"]>(() => draft ? draft.visibility : editRecord?.visibility === "PUBLIC" ? "public" : "private");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const visibleTasteTags = tasteTags.filter((item) =>
    groupsForFocus(foodKind).includes(item.tagGroup) && item.tagGroup !== "VISIT",
  );
  const selectedLikedPlace = selectedPlace
    ? places.find((place) => likedPlaceIds.includes(place.id)
      && (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === selectedPlace.id)
    : undefined;

  // 로그인 만료 알림은 렌더 밖에서 오므로 최신 입력을 ref로 넘깁니다.
  const draftForm: RegisterDraftForm = {
    editPlaceId: draftEditPlaceId, selectedPlace, name, address, coordinates, reason, menus, tags, visitConditions,
    foodKind, visibility, photos, convertFromPlaceId, visitedConfirmed, conversionNeedsPlaceSearch, conversionSearchName, activeDraftId,
  };
  const [initialDraftSnapshot] = useState(() => JSON.stringify(draftForm));
  const latestDraftForm = useRef(draftForm);
  useEffect(() => {
    latestDraftForm.current = draftForm;
  });

  /** 작성 중인 입력이 있으면 재로그인 뒤 복원할 수 있도록 탭 저장소에 보관합니다. */
  function persistDraft(force = false) {
    if (editLoading) return;
    const form = latestDraftForm.current;
    // 처음 연 상태 그대로라면 보관할 입력이 없습니다. 복원한 입력은 수정하지 않았어도 다시 보관합니다.
    if (!force && !restoredDraft && JSON.stringify(form) === initialDraftSnapshot) return;
    saveRegisterDraft(form, accountId);
  }

  // persistDraft는 ref로 최신 입력을 읽으므로 처음 한 번만 구독해도 됩니다.
  useEffect(() => onSessionExpiring(() => persistDraft()), []);

  useEffect(() => {
    // 복원한 입력은 한 번만 쓰고 지웁니다. 다시 만료되면 그때의 입력을 새로 보관합니다.
    if (restoredDraft) clearRegisterDraft();
  }, [restoredDraft]);

  // 하트로 저장만 한 장소를 고르면 직접 방문했는지 먼저 확인합니다.
  const selectedLikedPlaceId = selectedLikedPlace?.id;
  useEffect(() => {
    if (selectedLikedPlaceId && !visitedLikedPlaceIds.includes(selectedLikedPlaceId) && !visitedConfirmed) {
      setVisitPromptOpen(true);
    }
  }, [selectedLikedPlaceId, visitedLikedPlaceIds, visitedConfirmed]);

  function refreshLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("이 기기에서는 현재 위치를 확인할 수 없어요.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("현재 위치 기준 1km 안의 장소만 검색해요.");
      },
      () => setLocationMessage("주변 장소를 찾으려면 위치 권한을 허용해 주세요."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    // 다른 화면에서 새 등록을 요청했다면 이전에 보관한 입력은 더 이상 복원하지 않습니다.
    if (hasPlaceHandoff()) clearRegisterDraft();
    const conversionValue = sessionStorage.getItem(LIKE_CONVERSION_HANDOFF_KEY);
    if (conversionValue) {
      sessionStorage.removeItem(LIKE_CONVERSION_HANDOFF_KEY);
      try {
        const conversion = JSON.parse(conversionValue) as { sourcePlaceId: string; place?: KakaoPlaceResult | null; searchName?: string };
        if (conversion.sourcePlaceId && conversion.place?.id && conversion.place.place_name && conversion.place.x && conversion.place.y) {
          choosePlace(conversion.place, true, true);
          setConvertFromPlaceId(conversion.sourcePlaceId);
          setLocationMessage("장소 정보를 불러왔어요. 추천 이유와 방문 기록을 작성해 주세요.");
          return;
        }
        if (conversion.sourcePlaceId && conversion.searchName) {
          setConvertFromPlaceId(conversion.sourcePlaceId);
          setConversionNeedsPlaceSearch(true);
          setConversionSearchName(conversion.searchName);
          setPlaceSearch(conversion.searchName);
          setLocationMessage("장소를 지도에서 확인해 기록을 이어가세요.");
          return;
        }
      } catch { /* 잘못된 전환 정보는 비우고 일반 등록 화면을 엽니다. */ }
    }
    // 빠른 기록에서 넘어온 장소는 임시 목록 조회와 관계없이 즉시 입력란에 채웁니다.
    const selectedValue = sessionStorage.getItem(QUICK_PLACE_HANDOFF_KEY);
    if (!selectedValue) return;
    sessionStorage.removeItem(QUICK_PLACE_HANDOFF_KEY);
    try {
      const selected = JSON.parse(selectedValue) as KakaoPlaceResult;
      if (selected.id && selected.place_name && selected.x && selected.y) {
        choosePlace(selected, true);
        setActiveDraftId(selected.id);
      }
    } catch { /* 손상된 일회성 이동 값은 무시하고 일반 등록 화면을 엽니다. */ }
  }, []);

  useEffect(() => {
    if (editing) return;
    refreshLocation();
  }, []);

  useEffect(() => {
    if (editing) return;
    let active = true;
    (async () => {
      // 이전 버전이 이 브라우저(localStorage)에만 저장한 빠른 기록을 계정 임시 목록으로 한 번 옮깁니다.
      // 아직 옮기지 못한 사용자의 데이터를 잃지 않도록 남겨 둔 이전용 코드입니다.
      const legacyValue = localStorage.getItem("matdagong.place-quick-drafts.v1");
      if (legacyValue) {
        try {
          const legacy: unknown = JSON.parse(legacyValue);
          if (Array.isArray(legacy)) {
            await Promise.all(legacy.filter((item) => item && typeof item === "object" && "place" in item)
              .map((item) => persistQuickPlaceDraft(accessToken, (item as { place: KakaoPlaceResult }).place)));
          }
          localStorage.removeItem("matdagong.place-quick-drafts.v1");
        } catch { /* 전송에 실패하면 브라우저 임시 데이터를 보존해 다음 진입 때 다시 시도합니다. */ }
      }
      const items = await getQuickPlaceDrafts(accessToken);
      if (active) {
        setDrafts(items);
      }
    })().catch(() => { if (active) setDrafts([]); });
    return () => { active = false; };
  }, [accessToken]);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length + photos.length > 10) {
      setError("사진은 최대 10장까지 등록할 수 있어요.");
      return;
    }
    setBusy(true);
    try {
      const images = await Promise.all(files.map(loadPhoto));
      setPhotos((current) => [...current, ...images]);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "사진을 불러오지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  function addMenu() {
    if (menus.length >= 5) {
      setError("대표 메뉴는 5개까지 추가할 수 있어요.");
      return;
    }
    setMenus((current) => [...current, { name: "", price: "" }]);
  }
  // 입력하는 동안 천 단위 구분을 보여주고, 저장할 때 콤마를 제거해 숫자로 변환한다.
  function formatPrice(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  async function findPlaces() {
    if (placeSearch.trim().length < 2) {
      setError("가게 이름이나 주소를 두 글자 이상 입력해 주세요.");
      return;
    }
    if (!location) {
      setError("현재 위치를 확인한 뒤 주변 장소를 검색해 주세요.");
      return;
    }
    setSearchingPlaces(true);
    setError("");
    setPlaceResults([]);
    try {
      const nearby = (await searchKakaoPlaces(placeSearch.trim(), location, NEARBY_RADIUS_METERS))
        .filter((result) => distanceMeters(location, kakaoPlaceCoordinates(result)) <= NEARBY_RADIUS_METERS);
      setPlaceResults(nearby);
      if (!nearby.length) setError("현재 위치에서 1km 안에 검색 결과가 없어요. 가게 근처에서 다시 검색해 주세요.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "장소를 찾지 못했어요.");
    } finally {
      setSearchingPlaces(false);
    }
  }
  function choosePlace(result: KakaoPlaceResult, fromDraft = false, confirmedVisit = false) {
    if (!fromDraft && (!location || distanceMeters(location, kakaoPlaceCoordinates(result)) > NEARBY_RADIUS_METERS)) {
      setError("현재 위치에서 1km 안에 있는 장소만 등록할 수 있어요.");
      return;
    }
    const likedPlace = places.find((place) => likedPlaceIds.includes(place.id)
      && (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === result.id);
    const hasVisitRecord = confirmedVisit || (!!likedPlace && visitedLikedPlaceIds.includes(likedPlace.id));
    setSelectedPlace(result);
    setVisitedConfirmed(hasVisitRecord);
    setVisitPromptOpen(!!likedPlace && !hasVisitRecord);
    if (!conversionNeedsPlaceSearch) setConvertFromPlaceId(null);
    setActiveDraftId(null);
    setName(result.place_name);
    setAddress(result.road_address_name || result.address_name);
    setCoordinates({ latitude: Number(result.y), longitude: Number(result.x) });
    setPlaceResults([]);
    setPlaceSearch("");
    setError("");
  }

  function cancelLikedPlaceRegistration() {
    setVisitPromptOpen(false);
    setSelectedPlace(null);
    setVisitedConfirmed(false);
    setActiveDraftId(null);
    setName("");
    setAddress("");
    setCoordinates(null);
    setError("직접 방문하기 전에는 이 장소의 맛집 기록을 작성할 수 없어요.");
  }

  function chooseFoodKind(next: "RESTAURANT" | "CAFE_DESSERT") {
    setFoodKind(next);
    const visibleGroups = groupsForFocus(next);
    // 분야를 바꾸면 화면에서 숨겨지는 그룹의 태그는 등록 데이터에서도 제외합니다.
    setTags((current) => current.filter((name) =>
      tasteTags.some((item) => item.name === name && visibleGroups.includes(item.tagGroup)),
    ));
  }
  function toggleVisitCondition(condition: VisitCondition, checked: boolean) {
    const group = VISIT_CONDITION_GROUPS.find((item) => item.conditions.includes(condition));
    setVisitConditions((current) => {
      if (!checked) return current.filter((item) => item !== condition);
      const withoutSiblingChoice = group?.exclusive
        ? current.filter((item) => !group.conditions.includes(item))
        : current;
      return withoutSiblingChoice.includes(condition) ? withoutSiblingChoice : [...withoutSiblingChoice, condition];
    });
  }
  const existingVenue = selectedPlace
    ? places.find((place) => (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === selectedPlace.id)
    : undefined;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlace || !address.trim() || !coordinates) {
      setError("카카오 지도에서 실제 장소를 검색해 선택해 주세요.");
      return;
    }
    if (photos.length === 0) {
      setError("맛집 사진을 한 장 이상 등록해 주세요.");
      return;
    }
    if (conversionNeedsPlaceSearch && conversionSearchName
      && !selectedPlace.place_name.replaceAll(" ", "").includes(conversionSearchName.replaceAll(" ", ""))) {
      setError(`‘${conversionSearchName}’와 같은 장소를 선택해 주세요.`);
      return;
    }
    if (!editing && places.some((place) => (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === selectedPlace.id
      && place.tasters.some((taster) => taster.tasterId === "me"))) {
      setError("이미 내 맛집으로 등록한 장소예요. 다른 카카오 장소를 선택해 주세요.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("추천 이유를 5글자 이상 남겨주세요.");
      return;
    }
    if ((convertFromPlaceId || selectedLikedPlace) && !visitedConfirmed) {
      setError("이 장소에 직접 방문한 뒤 기록하는 경우에만 내 맛집에서 전환할 수 있어요.");
      return;
    }
    const recommendedMenus: RecommendedMenu[] = menus
      .filter((item) => item.name.trim())
      .map((item) => {
        const price = item.price.replaceAll(",", "");
        return {
          name: item.name.trim(),
          ...(price && Number.isFinite(Number(price)) ? { price: Number(price) } : {}),
          ...(item.photo ? { photo: item.photo } : {}),
        };
      });
    const newPlace: NewPlace = {
      id: `local-${crypto.randomUUID()}`,
      providerCode: "KAKAO",
      providerPlaceId: selectedPlace.id,
      roadAddress: selectedPlace.road_address_name || undefined,
      lotAddress: selectedPlace.address_name || undefined,
      providerPhone: selectedPlace.phone || undefined,
      providerUrl: selectedPlace.place_url || undefined,
      name: name.trim(),
      category: foodKind === "CAFE_DESSERT"
        ? "카페 · 디저트"
        : selectedPlace.category_name.split(">").map((part) => part.trim()).filter((part) => part && part !== "음식점").slice(-2).join(" · ") || "음식점",
      address: address.trim(),
      ...coordinates,
      reason: reason.trim(),
      menus: recommendedMenus,
      tags,
      tagGroups: Object.fromEntries(tags.map((tag) => [tag, tasteTags.find((item) => item.name === tag)?.tagGroup ?? "TASTE"])),
      visitConditions,
      photos,
      visibility,
      createdAt: new Date().toISOString(),
    };
    setSaving(true);
    try {
      await onRegister(newPlace, convertFromPlaceId ?? selectedLikedPlace?.id,
        (convertFromPlaceId || selectedLikedPlace) ? visitedConfirmed : false);
      clearRegisterDraft();
      setConvertFromPlaceId(null);
      setConversionNeedsPlaceSearch(false);
      setConversionSearchName("");
      if (activeDraftId) setDrafts((current) => current.filter((draft) => draft.providerPlaceId !== activeDraftId));
    } catch (cause) {
      if (isSessionExpiredError(cause)) {
        // 등록 버튼을 누른 시점의 입력을 보관하고, 재로그인 뒤 이 화면에서 복원합니다.
        persistDraft(true);
        setError("로그인 시간이 지나 다시 로그인하고 있어요. 입력한 내용은 로그인 뒤 이 화면에서 복원돼요.");
        return;
      }
      setError(cause instanceof Error ? cause.message : "맛집 기록을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <ScreenHeader title={editing ? "맛집 수정하기" : "맛집 등록"} />
      <form className="registration-form" onSubmit={submit}>
        {draftNotice && (
          <div className="register-draft-restored" role="status">
            <Icon name="check" />
            <span>{draftNotice}</span>
            <button type="button" onClick={() => setDraftNotice(null)}>확인</button>
          </div>
        )}
        <section className={`registration-photo-gallery ${photos.length ? "has-photos" : ""}`} aria-label="맛집 사진">
          {photos.length ? (
            <>
              <figure className="registration-photo-cover">
                <img src={photos[0]} alt="대표 맛집 사진" />
                <span>대표 사진</span>
                <button type="button" aria-label="대표 사진 삭제" onClick={async () => {
                  if (!await confirm({ title: "대표 사진을 삭제할까요?", message: "삭제한 사진은 등록 화면에서 제외됩니다.", confirmLabel: "삭제할게요", tone: "danger" })) return;
                  setPhotos((current) => current.slice(1));
                }}><Icon name="close" /></button>
              </figure>
              <div className="registration-photo-strip">
                {photos.slice(1).map((photo, index) => (
                  <div className="photo-slot" key={`${photo.slice(-24)}-${index}`}>
                    <img src={photo} alt={`등록할 사진 ${index + 2}`} />
                    <button type="button" aria-label={`사진 ${index + 2} 삭제`}
                      onClick={async () => {
                        if (!await confirm({ title: "사진을 삭제할까요?", message: `사진 ${index + 2}가 등록할 사진 목록에서 제외됩니다.`, confirmLabel: "삭제할게요", tone: "danger" })) return;
                        setPhotos((current) => current.filter((_, i) => i !== index + 1));
                      }}>
                      <Icon name="close" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && <label className="add-photos add-photos-compact">
                  <Icon name="plus" /><b>사진 추가</b>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={busy} />
                </label>}
              </div>
            </>
          ) : (
            <label className="registration-photo-empty">
              <span><Icon name="camera" /></span>
              <b>{busy ? "사진 준비 중…" : "맛집의 분위기를 사진으로 남겨보세요"}</b>
              <small>필수 입력 · 사진 1장 이상 · 최대 10장까지 등록할 수 있어요</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={busy} />
            </label>
          )}
        </section>
        {!editing && <section className="register-place-picker">
          <header><span className="register-place-symbol"><Icon name="pin" /></span><div><b>어느 맛집을 다녀오셨나요? <em className="required-mark">필수</em></b><small>직접 방문한 장소인지 확인할 수 있도록 현재 위치 주변만 검색해요.</small></div></header>
          {drafts.length > 0 && <div className="saved-places-entry"><button type="button" aria-expanded={draftsOpen} onClick={() => setDraftsOpen((open) => !open)}><Icon name="clock" /> 임시 저장한 장소 불러오기 <b>{drafts.length}</b><Icon name="chevron" /></button>
            {draftsOpen && <div className="quick-place-drafts" aria-label="임시 저장 장소 목록">{drafts.map((draft) => <div className="quick-place-draft" key={`${draft.providerCode}:${draft.providerPlaceId}`}>
              <button className="quick-place-draft-select" type="button" onClick={() => { choosePlace(kakaoPlaceFromQuickDraft(draft), true); setActiveDraftId(draft.providerPlaceId); setDraftsOpen(false); }}><span><b>{draft.placeName}</b><small>{draft.address}</small></span><Icon name="chevron" /></button>
            </div>)}</div>}
          </div>}
          <div className={`register-location-status ${location ? "is-ready" : ""}`}><Icon name="locate" /><span>{locationMessage}</span>{!location && <button type="button" onClick={refreshLocation}>다시 확인</button>}</div>
          <div className="register-place-search">
            <Icon name="search" />
            <input aria-label="가게 이름 또는 주소 검색" value={placeSearch}
              onChange={(event) => {
                setPlaceSearch(event.target.value);
                setPlaceResults([]);
                setSelectedPlace(null);
                setVisitedConfirmed(false);
                if (!conversionNeedsPlaceSearch) setConvertFromPlaceId(null);
                setActiveDraftId(null);
                setName(""); setAddress(""); setCoordinates(null);
              }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void findPlaces(); } }}
              placeholder="가게 이름이나 주소 검색" />
            <button type="button" onClick={() => void findPlaces()} disabled={searchingPlaces}>
              {searchingPlaces ? "찾는 중" : "검색"}
            </button>
          </div>
          {placeResults.length > 0 && (
            <div className="register-place-results" role="listbox" aria-label="장소 검색 결과">
              {placeResults.map((result) => (
                <button type="button" role="option" aria-selected={selectedPlace?.id === result.id} key={result.id} onClick={() => choosePlace(result, conversionNeedsPlaceSearch, !!convertFromPlaceId)}>
                  <span><b>{result.place_name}</b><small>{result.category_name.split(">").map((part) => part.trim()).filter(Boolean).slice(-2).join(" · ")}</small><small>{result.road_address_name || result.address_name}</small></span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          )}
          {selectedPlace && (
            <div className="register-place-selected">
              <span><Icon name="check" /></span>
              <div><b>{selectedPlace.place_name}</b><small>{address}</small><small>{existingVenue ? `이미 ${existingVenue.recordCount}개의 맛객 기록이 있는 장소예요.` : "지도 장소로 확인됨 · 장소 ID를 기록해 중복 장소를 구분해요."}</small></div>
              <button type="button" onClick={() => { setSelectedPlace(null); if (!conversionNeedsPlaceSearch) setConvertFromPlaceId(null); setName(""); setAddress(""); setCoordinates(null); }}>변경</button>
            </div>
          )}
          {selectedPlace && (convertFromPlaceId || selectedLikedPlace) && <div className="liked-place-visit-confirmation is-confirmed">
            <span className="liked-place-visit-check"><Icon name="check" /></span>
            <span><b>직접 방문 확인 완료</b><small>등록을 마치면 내 맛집 하트 저장이 방문 기록으로 전환돼요.</small></span>
          </div>}
          {!selectedPlace && !placeResults.length && <small className="register-place-help">직접 이름이나 주소만 적는 대신, 검색 결과에서 장소를 골라 주세요.</small>}
          {coordinates && <small className="address-selected"><Icon name="pin" />{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</small>}
        </section>}
        <section className="register-related-fields">
          <fieldset className="register-food-kind">
            <legend>장소 분야</legend>
            <button type="button" aria-pressed={foodKind === "RESTAURANT"} onClick={() => chooseFoodKind("RESTAURANT")}><Icon name="fork" /><span><b>음식점</b><small>식사와 메뉴 기록</small></span></button>
            <button type="button" aria-pressed={foodKind === "CAFE_DESSERT"} onClick={() => chooseFoodKind("CAFE_DESSERT")}><Icon name="coffee" /><span><b>카페·디저트</b><small>커피와 디저트 기록</small></span></button>
          </fieldset>
          <section className="form-section registration-taste-tags">
            <header><span className="registration-mascot"><Avatar name="맛다공" variant={6} /><i><Icon name="sparkle" /></i></span><div><h2>맛과 메뉴</h2><small>이 맛집을 나타내는 태그를 골라 주세요. 비워 두어도 등록할 수 있어요.</small></div></header>
            <TasteTagPicker options={visibleTasteTags}
              value={tags} onChange={setTags} groupsToShow={groupsForFocus(foodKind).filter((group) => group !== "VISIT")} />
            {!visibleTasteTags.length && <p className="tag-load-error" role="status">{tasteTags.length ? "이 분야에 등록된 태그가 아직 없어요. 태그 없이 맛집을 등록할 수 있어요." : "태그 목록을 불러오지 못했어요. 태그 없이 맛집을 등록할 수 있어요."}</p>}
          </section>
          <section className="form-section visit-condition-section">
            <header className="place-info-heading"><div><h2>매장 이용 정보 <small>선택 입력</small></h2><p>영업시간, 대기, 주차처럼 직접 확인한 내용을 남겨 주세요.</p></div>
              <button type="button" className="place-info-propose" onClick={() => setProposalOpen(true)}>정보 제안</button></header>
            <button className="place-info-picker-trigger" type="button" onClick={() => setInfoPickerOpen(true)}>
              <span><Icon name="check" /><b>{visitConditions.length ? `${visitConditions.length}개 정보 선택됨` : "매장 이용 정보 선택"}</b></span><Icon name="chevron" />
            </button>
            {visitConditions.length > 0 && <div className="place-info-selected">{visitConditions.map((condition) => <span key={condition}>{condition}</span>)}</div>}
          </section>
        </section>
        <section className="register-recommendation-fields">
          <label className="reason-field">
            <b>추천 이유 <em className="required-mark">필수</em></b>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
              placeholder="이 맛집을 추천하는 이유를 자세히 적어주세요. (예: 메뉴, 분위기, 한줄 팁 등)"
              rows={4}
            />
            <small>{reason.length}/500</small>
          </label>
          <section className="form-section">
            <h2>내가 추천하는 메뉴 <small>(선택 입력 · 최대 5개 · 사진과 가격은 선택 입력)</small></h2>
            <div className="recommended-menu-rows">
              {menus.map((item, index) => (
                <div className={`recommended-menu-row${menus.length > 1 ? " has-remove" : ""}`} key={index}>
                  <label>
                    <span>메뉴명</span>
                    <input value={item.name} maxLength={30} placeholder="예: 들기름 막국수"
                      aria-label={`추천 메뉴 ${index + 1} 이름`}
                      onChange={(event) => setMenus((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))}
                      onKeyDown={(event) => { if (event.key === "Enter" && index === menus.length - 1 && menus.length < 5) { event.preventDefault(); addMenu(); } }} />
                  </label>
                  <label className="recommended-menu-price">
                    <span>가격</span>
                    <input type="text" inputMode="numeric" value={item.price} placeholder="선택"
                      aria-label={`추천 메뉴 ${index + 1} 가격`}
                      onChange={(event) => setMenus((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, price: formatPrice(event.target.value) } : row))} />
                    <i>원</i>
                  </label>
                  <div className="recommended-menu-photo-field">
                    <span>메뉴 사진</span>
                    <label className={`recommended-menu-photo${item.photo ? " has-photo" : ""}`}>
                      {item.photo ? <img src={item.photo} alt={`${item.name || `메뉴 ${index + 1}`} 사진 미리보기`} /> : <><Icon name="camera" /><span>추가</span></>}
                      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`추천 메뉴 ${index + 1} 사진`}
                        onChange={async (event) => {
                          const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
                          try { const photo = await loadPhoto(file); setMenus((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, photo } : row)); }
                          catch (cause) { setError(cause instanceof Error ? cause.message : "메뉴 사진을 불러오지 못했어요."); }
                        }} />
                      {item.photo && <button type="button" aria-label={`메뉴 ${index + 1} 사진 삭제`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenus((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, photo: undefined } : row)); }}><Icon name="close" /></button>}
                    </label>
                  </div>
                  {menus.length > 1 && <button type="button" className="recommended-menu-remove" aria-label={`메뉴 ${index + 1} 삭제`} onClick={async () => {
                    if (!await confirm({ title: "메뉴를 삭제할까요?", message: `‘${item.name.trim() || `메뉴 ${index + 1}`}’ 항목을 목록에서 삭제합니다.`, confirmLabel: "삭제할게요", tone: "danger" })) return;
                    setMenus((current) => current.filter((_, rowIndex) => rowIndex !== index));
                  }}><Icon name="close" /></button>}
                  {menus.length === 1 && <span className="recommended-menu-remove-spacer" aria-hidden="true" />}
                </div>
              ))}
            </div>
            {menus.length < 5 && <button type="button" className="recommended-menu-add" onClick={addMenu}><Icon name="plus" /> 메뉴 한 줄 추가</button>}
          </section>
        </section>
        <fieldset className="visibility-field">
          <legend>이 기록을 보여줄 범위</legend>
          <label className={visibility === "private" ? "selected" : ""}>
            <input type="radio" name="visibility" checked={visibility === "private"} onChange={() => setVisibility("private")} />
            <span><b>나만 기록</b><small>내 맛집 목록에서만 볼 수 있어요</small></span>
            <i><Icon name="check" /></i>
          </label>
          <label className={visibility === "public" ? "selected" : ""}>
            <input type="radio" name="visibility" checked={visibility === "public"} onChange={() => setVisibility("public")} />
            <span><b>공개 추천</b><small>다른 사람의 맛집 탐색에 보여요</small></span>
            <i><Icon name="check" /></i>
          </label>
          <small className="visibility-like-note">다른 맛객의 맛집은 하트를 눌러 내 맛집에 모아둘 수 있어요.</small>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={busy || saving}>
          {saving ? editing ? "맛집 기록 수정 중…" : "맛집 기록 저장 중…" : editing ? "수정하기" : "등록하기"}
        </button>
      </form>
      {infoPickerOpen && <Sheet title="매장 이용 정보" onClose={() => setInfoPickerOpen(false)} className="place-info-sheet">
        <p>직접 확인한 정보만 선택해 주세요. 필요한 항목이 없다면 제안으로 남길 수 있어요.</p>
        <div className="place-info-groups">{VISIT_CONDITION_GROUPS.map((group) => <section className="place-info-group" key={group.title}>
          <header><b>{group.title}</b><small>{group.hint}</small></header>
          <div className="visit-condition-options" role="group" aria-label={group.title}>{group.conditions.map((condition) => <label key={condition} className={visitConditions.includes(condition) ? "selected" : ""}>
            <input type="checkbox" checked={visitConditions.includes(condition)} onChange={(event) => toggleVisitCondition(condition, event.target.checked)} />
            <span><i aria-hidden="true"><Icon name="check" /></i>{condition}</span>
          </label>)}</div>
        </section>)}</div>
        <button type="button" className="primary-button" onClick={() => setInfoPickerOpen(false)}>선택 완료{visitConditions.length ? ` · ${visitConditions.length}` : ""}</button>
      </Sheet>}
      {proposalOpen && <TasteTagRequestSheet requestType="PLACE_INFO" onClose={() => setProposalOpen(false)} onRequest={onRequest} onLoad={onLoadRequests} />}
      {visitPromptOpen && selectedPlace && <Sheet title="내 맛집에 저장한 장소예요" onClose={cancelLikedPlaceRegistration} className="place-conversion-sheet">
        <p>‘{selectedPlace.place_name}’은 하트로 저장했지만, 아직 직접 방문한 기록은 없어요. 실제로 방문한 경우에만 맛집 기록을 작성할 수 있습니다. 방문 확인 후 계속할까요?</p>
        <div className="sheet-actions">
          <button type="button" className="outline-button" onClick={cancelLikedPlaceRegistration}>다른 장소 선택</button>
          <button type="button" className="primary-button" onClick={() => { setVisitedConfirmed(true); setVisitPromptOpen(false); }}>직접 방문했어요</button>
        </div>
      </Sheet>}
    </>
  );
}
