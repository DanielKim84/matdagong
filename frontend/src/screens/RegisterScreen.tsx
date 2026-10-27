import { useState, type ChangeEvent, type FormEvent } from "react";
import type { NewPlace, Place, VisitCondition } from "../models/place";
import { VISIT_CONDITIONS } from "../models/place";
import { ScreenHeader } from "../components/AppChrome";
import { loadPhoto } from "../services/photos";
import Sheet from "../components/Sheet";
import MapCanvas from "../components/MapCanvas";
import Icon from "../components/Icon";

export default function RegisterScreen({
  places,
  onRegister,
}: {
  places: Place[];
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
  const [menus, setMenus] = useState<string[]>([]);
  const [menu, setMenu] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [visitConditions, setVisitConditions] = useState<VisitCondition[]>([]);
  const [tag, setTag] = useState("");
  const [visibility, setVisibility] =
    useState<NewPlace["visibility"]>("public");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPick, setMapPick] = useState<typeof coordinates>(null);

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
    if (!menu.trim()) return;
    if (menus.length >= 5) {
      setError("대표 메뉴는 5개까지 추가할 수 있어요.");
      return;
    }
    if (!menus.includes(menu.trim())) setMenus([...menus, menu.trim()]);
    setMenu("");
  }
  function addTag(value: string) {
    const next = value.trim().replace(/^#+/, "");
    if (!next || tags.includes(next)) return;
    if (tags.length >= 5) {
      setError("태그는 5개까지 추가할 수 있어요.");
      return;
    }
    setTags([...tags, next]);
    setTag("");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("맛집 이름을 입력해 주세요.");
      return;
    }
    if (!address.trim() || !coordinates) {
      setError("주소와 지도 위치를 선택해 주세요.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("추천 이유를 5글자 이상 남겨주세요.");
      return;
    }
    onRegister({
      id: `local-${crypto.randomUUID()}`,
      name: name.trim(),
      address: address.trim(),
      ...coordinates,
      reason: reason.trim(),
      menus,
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
        <div className="registration-photos">
          <label className="add-photos">
            <Icon name="camera" />
            <b>{busy ? "사진 준비 중…" : "사진 추가"}</b>
            <small>(최대 10장)</small>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={addPhotos}
              disabled={busy}
            />
          </label>
          {Array.from({ length: Math.max(6, photos.length) }, (_, index) => (
            <div className="photo-slot" key={index}>
              {photos[index] ? (
                <>
                  <img src={photos[index]} alt={`등록할 사진 ${index + 1}`} />
                  <button
                    type="button"
                    aria-label={`사진 ${index + 1} 삭제`}
                    onClick={() =>
                      setPhotos(photos.filter((_, i) => i !== index))
                    }
                  >
                    <Icon name="close" />
                  </button>
                </>
              ) : (
                <Icon name="image" />
              )}
            </div>
          ))}
        </div>
        <label className="inline-field">
          <b>맛집 이름</b>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="맛집 이름을 입력하세요."
            maxLength={60}
          />
        </label>
        <label className="inline-field address-field">
          <b>위치</b>
          <span>
            <input
              value={address}
              list="place-addresses"
              onChange={(event) => {
                setAddress(event.target.value);
                const match = places.find(
                  (place) => place.address === event.target.value,
                );
                setCoordinates(
                  match
                    ? { latitude: match.latitude, longitude: match.longitude }
                    : null,
                );
              }}
              placeholder="주소 검색해서 주소를 입력하세요."
            />
            <button
              type="button"
              aria-label="지도에서 위치 선택"
              onClick={() => {
                setMapPick(coordinates);
                setMapOpen(true);
              }}
            >
              <Icon name="search" />
            </button>
          </span>
        </label>
        <datalist id="place-addresses">
          {places.map((place) => (
            <option value={place.address} key={place.id}>
              {place.name}
            </option>
          ))}
        </datalist>
        {coordinates && (
          <small className="address-selected">
            <Icon name="check" />
            지도 위치가 선택됐어요.
          </small>
        )}
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
          <h2>
            대표 메뉴 <small>(최대 5개)</small>
          </h2>
          <div className="chip-editor">
            {menus.map((item) => (
              <button
                type="button"
                className="editable-chip"
                key={item}
                onClick={() =>
                  setMenus(menus.filter((value) => value !== item))
                }
              >
                {item}
                <Icon name="close" />
              </button>
            ))}
          </div>
          {menus.length < 5 && (
            <div className="small-input-row">
              <Icon name="plus" />
              <input
                value={menu}
                onChange={(event) => setMenu(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addMenu();
                  }
                }}
                placeholder="메뉴 추가"
                maxLength={30}
                aria-label="대표 메뉴 추가"
              />
              <button type="button" onClick={addMenu}>
                추가
              </button>
            </div>
          )}
        </section>
        <section className="form-section">
          <h2>
            태그 <small>(최대 5개)</small>
          </h2>
          <div className="suggested-tags">
            {["한식", "분위기좋음", "데이트", "주차가능"].map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={tags.includes(item)}
                className={tags.includes(item) ? "selected" : ""}
                onClick={() =>
                  tags.includes(item)
                    ? setTags(tags.filter((value) => value !== item))
                    : addTag(item)
                }
              >
                #{item}
              </button>
            ))}
          </div>
          <div className="chip-editor">
            {tags
              .filter(
                (item) =>
                  !["한식", "분위기좋음", "데이트", "주차가능"].includes(item),
              )
              .map((item) => (
                <button
                  type="button"
                  key={item}
                  className="editable-chip"
                  onClick={() =>
                    setTags(tags.filter((value) => value !== item))
                  }
                >
                  #{item}
                  <Icon name="close" />
                </button>
              ))}
          </div>
          {tags.length < 5 && (
            <div className="small-input-row custom-tag">
              <input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTag(tag);
                  }
                }}
                placeholder="직접 태그 입력"
                maxLength={15}
                aria-label="직접 태그 입력"
              />
              <button type="button" onClick={() => addTag(tag)}>
                추가
              </button>
            </div>
          )}
        </section>
        <section className="form-section visit-condition-section">
          <h2>방문 조건 <small>(확인한 항목만 선택)</small></h2>
          <p>직접 방문해 확인한 정보예요. 불친절은 등록자의 경험으로 표시돼요.</p>
          <div className="visit-condition-options">
            {VISIT_CONDITIONS.map((condition) => (
              <label key={condition}>
                <input
                  type="checkbox"
                  checked={visitConditions.includes(condition)}
                  onChange={(event) => setVisitConditions((current) =>
                    event.target.checked
                      ? [...current, condition]
                      : current.filter((item) => item !== condition),
                  )}
                />
                <span>{condition}</span>
              </label>
            ))}
          </div>
        </section>
        <fieldset className="visibility-field">
          <legend>공유 설정</legend>
          <label>
            <input
              type="radio"
              name="visibility"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            전체 공개
          </label>
          <label>
            <input
              type="radio"
              name="visibility"
              checked={visibility === "subscribers"}
              onChange={() => setVisibility("subscribers")}
            />
            내 구독자만 공개
          </label>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={busy}>
          등록하기
        </button>
        <p className="local-caption">
          체험 등록 내용은 이 브라우저에 저장돼요.
        </p>
      </form>
      {mapOpen && (
        <Sheet
          title="맛집 위치 선택"
          onClose={() => setMapOpen(false)}
          className="location-picker"
        >
          <p>지도를 움직이고 맛집이 있는 곳을 눌러주세요.</p>
          <div>
            <MapCanvas
              places={[]}
              subscriptions={[]}
              onSelect={() => {}}
              onPick={setMapPick}
              selected={mapPick}
            />
          </div>
          <small>
            {mapPick
              ? `선택한 위치: ${mapPick.latitude.toFixed(5)}, ${mapPick.longitude.toFixed(5)}`
              : "지도를 눌러 위치를 골라주세요."}
          </small>
          <button
            className="primary-button"
            disabled={!mapPick}
            onClick={() => {
              setCoordinates(mapPick);
              setMapOpen(false);
            }}
          >
            이 위치로 선택하기
          </button>
        </Sheet>
      )}
    </>
  );
}
