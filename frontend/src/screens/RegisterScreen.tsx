import { useState, type ChangeEvent, type FormEvent } from "react";
import type { NewPlace, Place, RecommendedMenu, VisitCondition } from "../models/place";
import type { FoodFocus, TasteTag } from "../services/community";
import { VISIT_CONDITIONS } from "../models/place";
import { ScreenHeader } from "../components/AppChrome";
import { Avatar, BrandArt } from "../components/BrandAssets";
import { loadPhoto } from "../services/photos";
import { searchKakaoPlaces } from "../services/kakao";
import Icon from "../components/Icon";
import TasteTagPicker from "../components/TasteTagPicker";
import { groupsForFocus } from "../models/tasteTags";

export default function RegisterScreen({
  places,
  tasteTags,
  defaultFocus,
  onRegister,
}: {
  places: Place[];
  tasteTags: TasteTag[];
  defaultFocus: FoodFocus;
  onRegister: (place: NewPlace) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [menus, setMenus] = useState<{ name: string; price: string }[]>([{ name: "", price: "" }]);
  const [tags, setTags] = useState<string[]>([]);
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>([]);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<KakaoPlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlaceResult | null>(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [foodKind, setFoodKind] = useState<"RESTAURANT" | "CAFE_DESSERT">(
    defaultFocus === "CAFE_DESSERT" ? "CAFE_DESSERT" : "RESTAURANT",
  );
  const [visibility, setVisibility] =
    useState<NewPlace["visibility"]>("private");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const visibleTasteTags = tasteTags.filter((item) =>
    groupsForFocus(foodKind).includes(item.tagGroup) && item.tagGroup !== "VISIT",
  );

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
    setSearchingPlaces(true);
    setError("");
    setPlaceResults([]);
    try {
      setPlaceResults(await searchKakaoPlaces(placeSearch.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "장소를 찾지 못했어요.");
    } finally {
      setSearchingPlaces(false);
    }
  }
  function choosePlace(result: KakaoPlaceResult) {
    setSelectedPlace(result);
    setName(result.place_name);
    setAddress(result.road_address_name || result.address_name);
    setCoordinates({ latitude: Number(result.y), longitude: Number(result.x) });
    setPlaceResults([]);
    setPlaceSearch("");
    setError("");
  }
  function chooseFoodKind(next: "RESTAURANT" | "CAFE_DESSERT") {
    setFoodKind(next);
    const visibleGroups = groupsForFocus(next);
    // 분야를 바꾸면 화면에서 숨겨지는 그룹의 태그는 등록 데이터에서도 제외합니다.
    setTags((current) => current.filter((name) =>
      tasteTags.some((item) => item.name === name && visibleGroups.includes(item.tagGroup)),
    ));
  }
  const existingVenue = selectedPlace
    ? places.find((place) => place.providerPlaceId === selectedPlace.id)
    : undefined;
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPlace || !address.trim() || !coordinates) {
      setError("카카오 지도에서 실제 장소를 검색해 선택해 주세요.");
      return;
    }
    if (places.some((place) => place.providerPlaceId === selectedPlace.id
      && place.tasters.some((taster) => taster.tasterId === "me"))) {
      setError("이미 내 맛집으로 등록한 장소예요. 다른 카카오 장소를 선택해 주세요.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("추천 이유를 5글자 이상 남겨주세요.");
      return;
    }
    const recommendedMenus: RecommendedMenu[] = menus
      .filter((item) => item.name.trim())
      .map((item) => {
        const price = item.price.replaceAll(",", "");
        return {
          name: item.name.trim(),
          ...(price && Number.isFinite(Number(price)) ? { price: Number(price) } : {}),
        };
      });
    onRegister({
      id: `local-${crypto.randomUUID()}`,
      providerPlaceId: selectedPlace.id,
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
      visitConditions,
      photos,
      visibility,
      createdAt: new Date().toISOString(),
    });
  }
  return (
    <>
      <ScreenHeader title="맛집 등록" />
      <form className="registration-form" onSubmit={submit}>
        <section className={`registration-photo-gallery ${photos.length ? "has-photos" : ""}`} aria-label="맛집 사진">
          {photos.length ? (
            <>
              <figure className="registration-photo-cover">
                <img src={photos[0]} alt="대표 맛집 사진" />
                <span>대표 사진</span>
                <button type="button" aria-label="대표 사진 삭제" onClick={() => setPhotos((current) => current.slice(1))}><Icon name="close" /></button>
              </figure>
              <div className="registration-photo-strip">
                {photos.slice(1).map((photo, index) => (
                  <div className="photo-slot" key={`${photo.slice(-24)}-${index}`}>
                    <img src={photo} alt={`등록할 사진 ${index + 2}`} />
                    <button type="button" aria-label={`사진 ${index + 2} 삭제`}
                      onClick={() => setPhotos((current) => current.filter((_, i) => i !== index + 1))}>
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
              <small>최대 10장 · 음식과 공간 사진을 함께 올릴 수 있어요</small>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} disabled={busy} />
            </label>
          )}
        </section>
        <section className="register-place-picker">
          <header><span><BrandArt name="map" /></span><div><b>어느 맛집을 다녀오셨나요?</b><small>카카오 지도에 등록된 장소를 선택하면 이름과 위치가 정확히 저장돼요.</small></div></header>
          <div className="register-place-search">
            <Icon name="search" />
            <input aria-label="가게 이름 또는 주소 검색" value={placeSearch}
              onChange={(event) => {
                setPlaceSearch(event.target.value);
                setPlaceResults([]);
                setSelectedPlace(null);
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
                <button type="button" role="option" aria-selected={selectedPlace?.id === result.id} key={result.id} onClick={() => choosePlace(result)}>
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
              <button type="button" onClick={() => { setSelectedPlace(null); setName(""); setAddress(""); setCoordinates(null); }}>변경</button>
            </div>
          )}
          {!selectedPlace && !placeResults.length && <small className="register-place-help">직접 이름이나 주소만 적는 대신, 검색 결과에서 장소를 골라 주세요.</small>}
          {coordinates && <small className="address-selected"><Icon name="pin" />{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</small>}
        </section>
        <section className="register-related-fields">
          <fieldset className="register-food-kind">
            <legend>장소 분야</legend>
            <button type="button" aria-pressed={foodKind === "RESTAURANT"} onClick={() => chooseFoodKind("RESTAURANT")}><Icon name="fork" /><span><b>음식점</b><small>식사와 메뉴 기록</small></span></button>
            <button type="button" aria-pressed={foodKind === "CAFE_DESSERT"} onClick={() => chooseFoodKind("CAFE_DESSERT")}><Icon name="coffee" /><span><b>카페·디저트</b><small>커피와 디저트 기록</small></span></button>
          </fieldset>
          <section className="form-section registration-taste-tags">
            <header><span className="registration-mascot"><Avatar name="맛다공" variant={6} /><i><Icon name="sparkle" /></i></span><div><h2>맛·메뉴 태그</h2><small>장소 분야에 어울리는 태그를 골라 주세요. 비워 두어도 등록할 수 있어요.</small></div></header>
            <TasteTagPicker options={visibleTasteTags}
              value={tags} onChange={setTags} groupsToShow={groupsForFocus(foodKind).filter((group) => group !== "VISIT")} />
            {!visibleTasteTags.length && <p className="tag-load-error" role="status">{tasteTags.length ? "이 분야에 등록된 태그가 아직 없어요. 태그 없이 맛집을 등록할 수 있어요." : "태그 목록을 불러오지 못했어요. 태그 없이 맛집을 등록할 수 있어요."}</p>}
          </section>
        </section>
        <section className="register-recommendation-fields">
          <label className="reason-field">
            <b>추천 이유</b>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              placeholder="이 맛집을 추천하는 이유를 자세히 적어주세요. (예: 메뉴, 분위기, 한줄 팁 등)"
              rows={4}
            />
            <small>{reason.length}/500</small>
          </label>
          <section className="form-section">
            <h2>내가 추천하는 메뉴 <small>(최대 5개 · 가격 선택 입력)</small></h2>
            <div className="recommended-menu-rows">
              {menus.map((item, index) => (
                <div className="recommended-menu-row" key={index}>
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
                  {menus.length > 1 && <button type="button" className="recommended-menu-remove" aria-label={`메뉴 ${index + 1} 삭제`} onClick={() => setMenus((current) => current.filter((_, rowIndex) => rowIndex !== index))}><Icon name="close" /></button>}
                </div>
              ))}
            </div>
            {menus.length < 5 && <button type="button" className="recommended-menu-add" onClick={addMenu}><Icon name="plus" /> 메뉴 한 줄 추가</button>}
          </section>
        </section>
        <section className="form-section visit-condition-section">
          <h2>방문 조건 <small>(확인한 항목만 선택)</small></h2>
          <p>직접 방문해 확인한 정보예요. 불친절은 등록자의 경험으로 표시돼요.</p>
          <div className="visit-condition-options">
            {VISIT_CONDITIONS.map((condition) => (
              <label key={condition} className={visitConditions.includes(condition) ? "selected" : ""}>
                <input
                  type="checkbox"
                  checked={visitConditions.includes(condition)}
                  onChange={(event) => setVisitConditions((current) =>
                    event.target.checked
                      ? [...current, condition]
                      : current.filter((item) => item !== condition),
                  )}
                />
                <span><i aria-hidden="true"><Icon name="check" /></i>{condition}</span>
              </label>
            ))}
          </div>
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
        <button className="primary-button" type="submit" disabled={busy}>
          등록하기
        </button>
      </form>
    </>
  );
}
