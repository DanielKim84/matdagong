import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAppData } from "../../app/AppData";
import { useNotificationDialog } from "../../components/NotificationDialog";
import type { NewPlace, Place, RecommendedMenu, VisitCondition } from "../../models/place";
import { VISIT_CONDITION_GROUPS, isVisitCondition } from "../../models/place";
import { groupsForFocus } from "../../models/tasteTags";
import { isSessionExpiredError, onSessionExpiring } from "../../services/http";
import { searchKakaoPlaces } from "../../services/kakao";
import { loadPhoto } from "../../services/photos";
import {
  getQuickPlaceDrafts,
  kakaoPlaceFromPlace,
  kakaoPlaceFromQuickDraft,
  saveQuickPlaceDraft as persistQuickPlaceDraft,
  type QuickPlaceDraft,
} from "../../services/places";
import {
  LIKE_CONVERSION_HANDOFF_KEY,
  QUICK_PLACE_HANDOFF_KEY,
  clearRegisterDraft,
  readRegisterDraft,
  refreshMediaUrl,
  saveRegisterDraft,
  type RegisterDraftForm,
} from "../../services/registerDraft";
import { accountIdFromAccessToken } from "../../utils/accessToken";
import { distanceMeters, kakaoPlaceCoordinates, type Coordinates } from "../../utils/geo";

// 직접 방문한 장소만 기록하도록 현재 위치 1km 안의 장소만 검색·선택할 수 있습니다.
export const NEARBY_RADIUS_METERS = 1000;
export const MAX_PHOTOS = 10;
export const MAX_MENUS = 5;
export const HEADLINE_MAX = 60;
export const REASON_MAX = 500;

export type RecordStep = "place" | "media" | "taste" | "story" | "review";
export type FoodKind = "RESTAURANT" | "CAFE_DESSERT";
export type MenuRow = { name: string; price: string; photo?: string };

/** 다른 화면이 넘겨준 장소(하트 전환·빠른 기록)가 있으면 그 요청이 보관된 입력보다 우선합니다. */
function hasPlaceHandoff(): boolean {
  try {
    return !!sessionStorage.getItem(LIKE_CONVERSION_HANDOFF_KEY) || !!sessionStorage.getItem(QUICK_PLACE_HANDOFF_KEY);
  } catch {
    return false;
  }
}

/** 추천 이유는 한 필드로 저장합니다. 첫 줄을 한 줄 추천, 나머지를 자세한 이야기로 나눠 보여 줍니다. */
function splitReason(reason: string): { headline: string; detail: string } {
  const [first = "", ...rest] = reason.split("\n");
  if (first.length > HEADLINE_MAX) return { headline: "", detail: reason };
  return { headline: first, detail: rest.join("\n").replace(/^\n+/, "") };
}

export function joinReason(headline: string, detail: string): string {
  return [headline.trim(), detail.trim()].filter(Boolean).join("\n");
}

/** 카카오 분류("음식점 > 한식 > 해물")에서 마지막 두 단계를 짧게 보여 줍니다. */
export function shortCategory(categoryName: string): string {
  return categoryName.split(">").map((part) => part.trim()).filter((part) => part && part !== "음식점").slice(-2).join(" · ");
}

/** 천 단위 구분을 보여 주고, 저장할 때 콤마를 지워 숫자로 바꿉니다. */
export function formatPrice(value: string): string {
  return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 기록하기(새 기록·수정)의 입력 상태와 검증·사진 처리·저장 로직입니다.
 * 예전 등록 화면(RegisterScreen)의 동작을 그대로 옮겼고, 화면은 단계별로 나눠 이 훅을 씁니다.
 */
export function useRecordForm({ editPlace, editPlaceId }: { editPlace?: Place; editPlaceId?: string }) {
  const app = useAppData();
  const { places, likedPlaceIds, visitedLikedPlaceIds, tasteTags, accessToken } = app;
  const defaultFocus = app.myProfile?.tasterFocus ?? "BOTH";
  const { confirm } = useNotificationDialog();

  const editRecord = editPlace?.tasters.find((taster) => taster.tasterId === "me");
  const editing = !!editPlace && !!editRecord;
  const draftEditPlaceId = editing && editPlace ? editPlace.id : null;
  // 수정할 기록을 아직 불러오는 중이면 보관한 입력을 복원하거나 저장하지 않습니다.
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
  const [coordinates, setCoordinates] = useState<Coordinates | null>(() => draft
    ? draft.coordinates
    : editPlace ? { latitude: editPlace.latitude, longitude: editPlace.longitude } : null);
  const [initialReason] = useState(() => splitReason(draft ? draft.reason : editRecord?.note ?? ""));
  const [headline, setHeadlineValue] = useState(initialReason.headline);
  const [detail, setDetail] = useState(initialReason.detail);
  const reason = joinReason(headline, detail);
  const [menus, setMenus] = useState<MenuRow[]>(() => {
    if (draft) {
      return draft.menus.map((menu) => menu.photo ? { ...menu, photo: refreshMediaUrl(menu.photo, currentMenuPhotos) } : menu);
    }
    const existing = (editRecord?.menus ?? []).map((menu) => typeof menu === "string"
      ? { name: menu, price: "" }
      : { name: menu.name, price: menu.price?.toLocaleString("ko-KR") ?? "", photo: menu.photo });
    return existing.length ? existing : [{ name: "", price: "" }];
  });
  const [tags, setTags] = useState<string[]>(() => draft ? draft.tags : editRecord?.tags ?? []);
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>(() => draft
    ? draft.visitConditions.filter(isVisitCondition)
    : (editRecord?.visitConditions ?? []) as VisitCondition[]);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<KakaoPlaceResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("현재 위치를 확인하고 있어요.");
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(() => draft?.activeDraftId ?? null);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlaceResult | null>(() => draft
    ? draft.selectedPlace
    : editPlace ? kakaoPlaceFromPlace(editPlace) : null);
  const [convertFromPlaceId, setConvertFromPlaceId] = useState<string | null>(() => draft?.convertFromPlaceId ?? null);
  const [visitedConfirmed, setVisitedConfirmed] = useState(() => draft?.visitedConfirmed ?? false);
  const [visitPromptOpen, setVisitPromptOpen] = useState(false);
  const [conversionNeedsPlaceSearch, setConversionNeedsPlaceSearch] = useState(() => draft?.conversionNeedsPlaceSearch ?? false);
  const [conversionSearchName, setConversionSearchName] = useState(() => draft?.conversionSearchName ?? "");
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  // 늦게 도착한 이전 검색 결과가 최신 결과를 덮지 않도록 요청 순번을 셉니다.
  const searchSeq = useRef(0);
  const [foodKind, setFoodKind] = useState<FoodKind>(() => draft ? draft.foodKind
    : editPlace?.category?.includes("카페") || editPlace?.category?.includes("디저트") || defaultFocus === "CAFE_DESSERT" ? "CAFE_DESSERT" : "RESTAURANT");
  const [visibility, setVisibility] = useState<NewPlace["visibility"]>(() => draft
    ? draft.visibility
    : editRecord?.visibility === "PUBLIC" ? "public" : "private");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  // 수정인데 카카오 장소 ID가 없는 예전 기록이면 장소부터 다시 고르게 합니다.
  const [needsPlaceStep] = useState(() => !editing || !selectedPlace);
  const steps: RecordStep[] = needsPlaceStep
    ? ["place", "media", "taste", "story", "review"]
    : ["media", "taste", "story", "review"];

  const visibleTasteTags = tasteTags.filter((item) =>
    groupsForFocus(foodKind).includes(item.tagGroup) && item.tagGroup !== "VISIT");
  const selectedLikedPlace = selectedPlace
    ? places.find((place) => likedPlaceIds.includes(place.id)
      && (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === selectedPlace.id)
    : undefined;
  const existingVenue = selectedPlace
    ? places.find((place) => (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === selectedPlace.id)
    : undefined;

  // 로그인 만료 알림은 렌더 밖에서 오므로 최신 입력을 ref로 넘깁니다.
  const draftForm: RegisterDraftForm = {
    editPlaceId: draftEditPlaceId, selectedPlace, name, address, coordinates, reason, menus, tags, visitConditions,
    foodKind, visibility, photos, convertFromPlaceId, visitedConfirmed, conversionNeedsPlaceSearch, conversionSearchName, activeDraftId,
  };
  const [initialDraftSnapshot] = useState(() => JSON.stringify(draftForm));
  const dirty = JSON.stringify(draftForm) !== initialDraftSnapshot;
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
    setLocationMessage("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("직접 방문한 곳만 기록할 수 있도록 현재 위치 1km 안에서 찾아요.");
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
          return;
        }
        if (conversion.sourcePlaceId && conversion.searchName) {
          setConvertFromPlaceId(conversion.sourcePlaceId);
          setConversionNeedsPlaceSearch(true);
          setConversionSearchName(conversion.searchName);
          setPlaceSearch(conversion.searchName);
          return;
        }
      } catch { /* 잘못된 전환 정보는 비우고 일반 등록 화면을 엽니다. */ }
    }
    // 빠른 기록에서 넘어온 장소는 임시 목록 조회와 관계없이 즉시 채웁니다.
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
    if (!needsPlaceStep) return;
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
      if (active) setDrafts(items);
    })().catch(() => { if (active) setDrafts([]); });
    return () => { active = false; };
  }, [accessToken]);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    if (files.length + photos.length > MAX_PHOTOS) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요.`);
      return;
    }
    setBusy(true);
    try {
      const images = await Promise.all(files.map(loadPhoto));
      setPhotos((current) => [...current, ...images]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 불러오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhotoAt(index: number) {
    if (!await confirm({ title: "사진을 삭제할까요?", message: `사진 ${index + 1}가 등록할 사진 목록에서 제외됩니다.`, confirmLabel: "삭제할게요", tone: "danger" })) return;
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  }

  /** 고른 사진을 맨 앞으로 옮겨 대표 사진으로 씁니다. */
  function makeCoverPhoto(index: number) {
    setPhotos((current) => index <= 0 || index >= current.length ? current : [current[index], ...current.filter((_, photoIndex) => photoIndex !== index)]);
  }

  function addMenu() {
    if (menus.length >= MAX_MENUS) {
      setError(`대표 메뉴는 ${MAX_MENUS}개까지 추가할 수 있어요.`);
      return;
    }
    setMenus((current) => [...current, { name: "", price: "" }]);
  }

  function updateMenu(index: number, patch: Partial<MenuRow>) {
    setMenus((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function setMenuPhoto(index: number, file: File) {
    try {
      const photo = await loadPhoto(file);
      updateMenu(index, { photo });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메뉴 사진을 불러오지 못했어요.");
    }
  }

  async function removeMenu(index: number) {
    const item = menus[index];
    if (!item) return;
    if ((item.name.trim() || item.price || item.photo)
      && !await confirm({ title: "메뉴를 삭제할까요?", message: `‘${item.name.trim() || `메뉴 ${index + 1}`}’ 항목을 목록에서 삭제합니다.`, confirmLabel: "삭제할게요", tone: "danger" })) return;
    setMenus((current) => current.length > 1
      ? current.filter((_, rowIndex) => rowIndex !== index)
      : [{ name: "", price: "" }]);
  }

  async function findPlaces(keyword = placeSearch, quiet = false) {
    const query = keyword.trim();
    if (query.length < 2) {
      if (!quiet) setError("가게 이름이나 주소를 두 글자 이상 입력해 주세요.");
      return;
    }
    if (!location) {
      if (!quiet) setError("현재 위치를 확인한 뒤 주변 장소를 검색해 주세요.");
      return;
    }
    const seq = ++searchSeq.current;
    setSearchingPlaces(true);
    setError("");
    try {
      const nearby = (await searchKakaoPlaces(query, location, NEARBY_RADIUS_METERS))
        .filter((result) => distanceMeters(location, kakaoPlaceCoordinates(result)) <= NEARBY_RADIUS_METERS);
      if (seq !== searchSeq.current) return;
      setPlaceResults(nearby);
      setSearched(true);
    } catch (cause) {
      if (seq === searchSeq.current) setError(cause instanceof Error ? cause.message : "장소를 찾지 못했어요.");
    } finally {
      if (seq === searchSeq.current) setSearchingPlaces(false);
    }
  }

  function changePlaceSearch(value: string) {
    setPlaceSearch(value);
    setSearched(false);
    if (!value.trim()) setPlaceResults([]);
  }

  // 입력을 멈추면 주변 장소를 자동으로 찾습니다. 위치가 없으면 검색하지 않습니다.
  useEffect(() => {
    if (selectedPlace || !location || placeSearch.trim().length < 2) return;
    const timer = window.setTimeout(() => void findPlaces(placeSearch, true), 450);
    return () => window.clearTimeout(timer);
  }, [placeSearch, location, selectedPlace]);

  function choosePlace(result: KakaoPlaceResult, fromDraft = false, confirmedVisit = false): boolean {
    if (!fromDraft && (!location || distanceMeters(location, kakaoPlaceCoordinates(result)) > NEARBY_RADIUS_METERS)) {
      setError("현재 위치에서 1km 안에 있는 장소만 등록할 수 있어요.");
      return false;
    }
    const likedPlace = places.find((place) => likedPlaceIds.includes(place.id)
      && (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === result.id);
    const hasVisitRecord = confirmedVisit || (!!likedPlace && visitedLikedPlaceIds.includes(likedPlace.id));
    searchSeq.current += 1;
    setSearchingPlaces(false);
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
    setSearched(false);
    setError("");
    return true;
  }

  function chooseQuickDraft(item: QuickPlaceDraft) {
    choosePlace(kakaoPlaceFromQuickDraft(item), true);
    setActiveDraftId(item.providerPlaceId);
  }

  function clearPlace() {
    setSelectedPlace(null);
    setVisitedConfirmed(false);
    setVisitPromptOpen(false);
    if (!conversionNeedsPlaceSearch) setConvertFromPlaceId(null);
    setActiveDraftId(null);
    setName("");
    setAddress("");
    setCoordinates(null);
  }

  function confirmVisit() {
    setVisitedConfirmed(true);
    setVisitPromptOpen(false);
  }

  function cancelLikedPlaceRegistration() {
    clearPlace();
    setError("직접 방문하기 전에는 이 장소의 맛집 기록을 작성할 수 없어요.");
  }

  function chooseFoodKind(next: FoodKind) {
    setFoodKind(next);
    const visibleGroups = groupsForFocus(next);
    // 분야를 바꾸면 화면에서 숨겨지는 그룹의 태그는 등록 데이터에서도 제외합니다.
    setTags((current) => current.filter((tagName) =>
      tasteTags.some((item) => item.name === tagName && visibleGroups.includes(item.tagGroup))));
  }

  function toggleVisitCondition(condition: VisitCondition) {
    const group = VISIT_CONDITION_GROUPS.find((item) => item.conditions.includes(condition));
    setVisitConditions((current) => {
      if (current.includes(condition)) return current.filter((item) => item !== condition);
      const withoutSiblingChoice = group?.exclusive
        ? current.filter((item) => !group.conditions.includes(item))
        : current;
      return [...withoutSiblingChoice, condition];
    });
  }

  function setHeadline(value: string) {
    // 한 줄 추천에는 줄바꿈을 넣지 않습니다(저장할 때 첫 줄로 구분하기 때문).
    setHeadlineValue(value.replace(/\n/g, " "));
  }

  /** 단계별 필수값을 검사해 문제가 있으면 안내 문구를 돌려줍니다. */
  function validateStep(step: RecordStep): string {
    if (step === "place") {
      if (!selectedPlace || !address.trim() || !coordinates) return "카카오 지도에서 실제 장소를 검색해 선택해 주세요.";
      if (conversionNeedsPlaceSearch && conversionSearchName
        && !selectedPlace.place_name.replaceAll(" ", "").includes(conversionSearchName.replaceAll(" ", ""))) {
        return `‘${conversionSearchName}’와 같은 장소를 선택해 주세요.`;
      }
      if (!editing && places.some((place) => (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === selectedPlace.id
        && place.tasters.some((taster) => taster.tasterId === "me"))) {
        return "이미 내 맛집으로 등록한 장소예요. 다른 카카오 장소를 선택해 주세요.";
      }
      if ((convertFromPlaceId || selectedLikedPlace) && !visitedConfirmed) {
        return "이 장소에 직접 방문한 뒤 기록하는 경우에만 내 맛집에서 전환할 수 있어요.";
      }
    }
    if (step === "media") {
      if (busy) return "사진을 준비하고 있어요. 잠시만 기다려 주세요.";
      if (photos.length === 0) return "맛집 사진을 한 장 이상 등록해 주세요.";
    }
    if (step === "story") {
      if (reason.trim().length < 5) return "추천 이유를 5글자 이상 남겨주세요.";
      if (reason.length > REASON_MAX) return `추천 이유는 ${REASON_MAX}자까지 남길 수 있어요.`;
    }
    return "";
  }

  /** 모든 단계를 다시 검사하고 저장합니다. 성공하면 true, 실패하면 문제가 있는 단계를 돌려줍니다. */
  async function submit(): Promise<{ ok: true; placeId: string } | { ok: false; step?: RecordStep }> {
    const invalidStep = (["place", "media", "taste", "story"] as RecordStep[]).find((step) => validateStep(step));
    if (invalidStep) {
      setError(validateStep(invalidStep));
      return { ok: false, step: invalidStep };
    }
    if (!selectedPlace || !coordinates) return { ok: false, step: "place" };
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
      category: foodKind === "CAFE_DESSERT" ? "카페 · 디저트" : shortCategory(selectedPlace.category_name) || "음식점",
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
    setError("");
    try {
      const saved = await app.actions.register(newPlace, convertFromPlaceId ?? selectedLikedPlace?.id,
        (convertFromPlaceId || selectedLikedPlace) ? visitedConfirmed : false, true);
      clearRegisterDraft();
      setConvertFromPlaceId(null);
      setConversionNeedsPlaceSearch(false);
      setConversionSearchName("");
      if (activeDraftId) setDrafts((current) => current.filter((item) => item.providerPlaceId !== activeDraftId));
      return { ok: true, placeId: saved.id };
    } catch (cause) {
      if (isSessionExpiredError(cause)) {
        // 저장 버튼을 누른 시점의 입력을 보관하고, 재로그인 뒤 이 화면에서 복원합니다.
        persistDraft(true);
        setError("로그인 시간이 지나 다시 로그인하고 있어요. 입력한 내용은 로그인 뒤 이 화면에서 복원돼요.");
        return { ok: false };
      }
      setError(cause instanceof Error ? cause.message : "맛집 기록을 저장하지 못했어요.");
      return { ok: false };
    } finally {
      setSaving(false);
    }
  }

  return {
    editing, steps, dirty, draftNotice, dismissDraftNotice: () => setDraftNotice(null),
    error, setError, busy, saving,
    // 장소
    location, locationMessage, refreshLocation, placeSearch, changePlaceSearch, placeResults, searched, searchingPlaces,
    findPlaces, choosePlace, chooseQuickDraft, clearPlace, selectedPlace, name, address, existingVenue,
    drafts, activeDraftId, convertFromPlaceId, selectedLikedPlace, conversionNeedsPlaceSearch, conversionSearchName,
    visitPromptOpen, confirmVisit, cancelLikedPlaceRegistration,
    // 사진·메뉴
    photos, addPhotos, removePhotoAt, makeCoverPhoto, menus, addMenu, updateMenu, setMenuPhoto, removeMenu,
    // 취향·방문 조건
    foodKind, chooseFoodKind, tags, setTags, visibleTasteTags, visitConditions, toggleVisitCondition,
    // 추천 이유·공개 범위
    headline, setHeadline, detail, setDetail, reason, visibility, setVisibility,
    validateStep, submit,
  };
}

export type RecordForm = ReturnType<typeof useRecordForm>;
