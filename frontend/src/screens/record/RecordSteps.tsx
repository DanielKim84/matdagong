import { useState, type ReactNode } from "react";
import Icon from "../../components/Icon";
import TasteTagPicker from "../../components/TasteTagPicker";
import { Segmented } from "../../components/ui";
import { VISIT_CONDITION_GROUPS } from "../../models/place";
import { groupsForFocus } from "../../models/tasteTags";
import { distanceMeters, kakaoPlaceCoordinates } from "../../utils/geo";
import {
  HEADLINE_MAX,
  MAX_MENUS,
  MAX_PHOTOS,
  REASON_MAX,
  formatPrice,
  shortCategory,
  type FoodKind,
  type RecordForm,
  type RecordStep,
} from "./useRecordForm";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

/** 검색어와 겹치는 부분을 강조합니다. */
function Highlight({ text, query }: { text: string; query: string }) {
  const keyword = query.trim();
  const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + keyword.length)}</mark>{text.slice(at + keyword.length)}</>;
}

function StepTitle({ children, lead }: { children: ReactNode; lead?: string }) {
  return (
    <div className="r-record-title">
      <h1 className="r-display">{children}</h1>
      {lead && <p className="r-muted">{lead}</p>}
    </div>
  );
}

function FieldHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="r-record-field-head">
      <h2>{title}</h2>
      {note && <small>{note}</small>}
    </div>
  );
}

/* ── 1단계 · 장소 ── */
export function PlaceStep({ form }: { form: RecordForm }) {
  const [draftsOpen, setDraftsOpen] = useState(false);
  const { selectedPlace, location } = form;
  const query = form.placeSearch.trim();

  return (
    <section className="r-record-step" aria-label="장소 고르기">
      <StepTitle>어디를<br />다녀오셨나요?</StepTitle>

      {form.conversionNeedsPlaceSearch && form.conversionSearchName && !selectedPlace && (
        <p className="r-record-hint">하트로 저장한 ‘{form.conversionSearchName}’을(를) 지도에서 찾아 골라 주세요. 방문 기록으로 바뀌어요.</p>
      )}

      {selectedPlace ? (
        <div className="r-card r-record-picked">
          <span className="r-badge-icon"><Icon name="check" /></span>
          <div className="r-record-picked__copy">
            <b>{selectedPlace.place_name}</b>
            <small>{[shortCategory(selectedPlace.category_name), form.address].filter(Boolean).join(" · ")}</small>
            <small className="r-record-picked__note">
              {form.existingVenue
                ? `이미 ${form.existingVenue.recordCount}개의 맛객 기록이 있는 장소예요.`
                : "카카오 지도에서 확인한 장소예요."}
            </small>
            {(form.convertFromPlaceId || form.selectedLikedPlace) && (
              <span className="r-tag r-tag--amber">직접 방문 확인 · 내 맛집 하트가 방문 기록으로 바뀌어요</span>
            )}
          </div>
          <button type="button" className="r-record-text-button" onClick={form.clearPlace}>변경</button>
        </div>
      ) : (
        <>
          <label className="r-record-search">
            <Icon name="search" />
            <span className="visually-hidden">가게 이름 검색</span>
            <input
              value={form.placeSearch}
              placeholder="가게 이름이나 주소 검색"
              enterKeyHint="search"
              autoComplete="off"
              onChange={(event) => form.changePlaceSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void form.findPlaces();
                }
              }}
            />
            {form.searchingPlaces && <span className="r-record-search__state" role="status">찾는 중</span>}
          </label>

          {form.placeResults.length > 0 && (
            <div className="r-record-results">
              <span className="r-record-results__label">지금 있는 곳 근처</span>
              {form.placeResults.map((result, resultIndex) => {
                const distance = location ? Math.round(distanceMeters(location, kakaoPlaceCoordinates(result))) : null;
                return (
                  <button type="button" className="r-row r-record-result" key={result.id}
                    onClick={() => form.choosePlace(result, form.conversionNeedsPlaceSearch, !!form.convertFromPlaceId)}>
                    <span className={`r-badge-icon ${resultIndex === 0 ? "" : "is-quiet"}`}><Icon name="pin" /></span>
                    <span className="r-row__copy">
                      <b><Highlight text={result.place_name} query={query} /></b>
                      <small>{[shortCategory(result.category_name), result.road_address_name || result.address_name, distance !== null ? `${distance}m` : ""].filter(Boolean).join(" · ")}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {form.searched && !form.searchingPlaces && !form.placeResults.length && (
            <div className="r-empty r-record-empty">
              <b>1km 안에서 ‘{query}’을(를) 찾지 못했어요</b>
              <p>가게 근처에서 다시 검색하거나, 이름을 조금 다르게 적어 보세요.</p>
            </div>
          )}

          {form.drafts.length > 0 && (
            <div className="r-record-drafts">
              <button type="button" className="r-record-drafts__toggle" aria-expanded={draftsOpen} onClick={() => setDraftsOpen((open) => !open)}>
                <span>임시 저장한 장소 이어서 쓰기</span>
                <b>{form.drafts.length}</b>
              </button>
              {draftsOpen && (
                <div className="r-record-drafts__list">
                  {form.drafts.map((item) => (
                    <button type="button" className="r-row" key={`${item.providerCode}:${item.providerPlaceId}`}
                      onClick={() => { form.chooseQuickDraft(item); setDraftsOpen(false); }}>
                      <span className="r-badge-icon is-quiet"><Icon name="clock" /></span>
                      <span className="r-row__copy"><b>{item.placeName}</b><small>{item.address}</small></span>
                      <Icon name="chevron" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={`r-record-location ${location ? "is-ready" : ""}`}>
            <Icon name={location ? "check" : "locate"} />
            <span>{form.locationMessage}</span>
            {!location && <button type="button" className="r-record-text-button" onClick={form.refreshLocation}>다시 확인</button>}
          </div>
        </>
      )}
    </section>
  );
}

/* ── 2단계 · 사진과 메뉴 ── */
export function MediaStep({ form }: { form: RecordForm }) {
  const { photos, menus } = form;
  return (
    <section className="r-record-step" aria-label="사진과 메뉴">
      <StepTitle lead="첫 번째 사진이 기록의 대표 사진이 돼요.">사진과 메뉴를<br />남겨 주세요</StepTitle>

      <div className="r-record-field">
        <FieldHead title="사진" note={`필수 · ${photos.length}/${MAX_PHOTOS}`} />
        <div className="r-record-photos">
          {photos.length < MAX_PHOTOS && (
            <label className={`r-record-photo-add ${form.busy ? "is-busy" : ""}`}>
              <Icon name="camera" />
              <span>{form.busy ? "준비 중…" : "사진 추가"}</span>
              <input className="visually-hidden" type="file" accept={PHOTO_ACCEPT} multiple disabled={form.busy || form.saving}
                onChange={(event) => void form.addPhotos(event)} />
            </label>
          )}
          {photos.map((photo, index) => (
            <div className="r-record-photo" key={`${photo.slice(-24)}-${index}`}>
              <button type="button" className="r-record-photo__image" aria-label={index === 0 ? `사진 ${index + 1}, 대표 사진` : `사진 ${index + 1}을 대표 사진으로 지정`}
                onClick={() => form.makeCoverPhoto(index)}>
                <img src={photo} alt="" loading="lazy" />
              </button>
              {index === 0 && <span className="r-record-photo__cover">대표</span>}
              <button type="button" className="r-record-photo__remove" aria-label={`사진 ${index + 1} 삭제`} disabled={form.busy || form.saving}
                onClick={() => void form.removePhotoAt(index)}>
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
        {photos.length > 1 && <small className="r-record-help">사진을 누르면 대표 사진으로 바꿀 수 있어요.</small>}
      </div>

      <div className="r-record-field">
        <FieldHead title="추천 메뉴" note={`선택 · 최대 ${MAX_MENUS}개`} />
        <div className="r-record-dishes">
          {menus.map((item, index) => (
            <div className="r-card r-record-dish" key={index}>
              <div className="r-record-dish__media">
                <label className="r-record-dish__photo">
                  {item.photo ? <img src={item.photo} alt={`${item.name || `메뉴 ${index + 1}`} 사진`} /> : <><Icon name="camera" /><small>사진</small></>}
                  <input className="visually-hidden" type="file" accept={PHOTO_ACCEPT} aria-label={`추천 메뉴 ${index + 1} 사진`}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void form.setMenuPhoto(index, file);
                    }} />
                </label>
                {item.photo && (
                  <button type="button" className="r-record-dish__photo-remove" aria-label={`메뉴 ${index + 1} 사진 삭제`}
                    onClick={() => form.updateMenu(index, { photo: undefined })}>
                    <Icon name="close" />
                  </button>
                )}
              </div>
              <div className="r-record-dish__fields">
                <input value={item.name} maxLength={30} placeholder="메뉴 이름 (예: 해물찜)" aria-label={`추천 메뉴 ${index + 1} 이름`}
                  onChange={(event) => form.updateMenu(index, { name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && index === menus.length - 1 && menus.length < MAX_MENUS) {
                      event.preventDefault();
                      form.addMenu();
                    }
                  }} />
                <span className="r-record-dish__price">
                  <input type="text" inputMode="numeric" value={item.price} placeholder="가격 (선택)" aria-label={`추천 메뉴 ${index + 1} 가격`}
                    onChange={(event) => form.updateMenu(index, { price: formatPrice(event.target.value) })} />
                  <i>원</i>
                </span>
              </div>
              {(menus.length > 1 || item.name || item.price || item.photo) && (
                <button type="button" className="r-icon-button r-record-dish__remove" aria-label={`메뉴 ${index + 1} 삭제`} onClick={() => void form.removeMenu(index)}>
                  <Icon name="close" />
                </button>
              )}
            </div>
          ))}
        </div>
        {menus.length < MAX_MENUS && (
          <button type="button" className="r-record-dashed" onClick={form.addMenu}><Icon name="plus" />메뉴 추가</button>
        )}
      </div>
    </section>
  );
}

/* ── 3단계 · 취향 태그와 방문 조건 ── */
export function TasteStep({ form, onRequest }: { form: RecordForm; onRequest: (type: "TAG" | "PLACE_INFO") => void }) {
  return (
    <section className="r-record-step" aria-label="취향 태그와 방문 조건">
      <StepTitle lead="모두 선택 입력이에요. 고른 태그는 취향이 맞는 사람에게 추천할 때 쓰여요.">어떤 곳이었나요?</StepTitle>

      <Segmented<FoodKind>
        label="장소 분야"
        value={form.foodKind}
        onChange={form.chooseFoodKind}
        options={[{ value: "RESTAURANT", label: "음식점" }, { value: "CAFE_DESSERT", label: "카페·디저트" }]}
      />

      <div className="r-record-field">
        <FieldHead title="이럴 때 좋아요" note={form.tags.length ? `${form.tags.length}개 선택` : "선택"} />
        {form.visibleTasteTags.length ? (
          <div className="r-record-tags">
            <TasteTagPicker options={form.visibleTasteTags} value={form.tags} onChange={form.setTags}
              groupsToShow={groupsForFocus(form.foodKind).filter((group) => group !== "VISIT")} />
          </div>
        ) : (
          <p className="r-record-help" role="status">
            이 분야에서 고를 수 있는 태그가 아직 없어요. 태그 없이도 기록할 수 있어요.
          </p>
        )}
        <button type="button" className="r-record-text-button" onClick={() => onRequest("TAG")}>찾는 태그가 없나요? 태그 제안하기</button>
      </div>

      <div className="r-record-field">
        <FieldHead title="방문 조건" note="직접 확인한 것만" />
        {VISIT_CONDITION_GROUPS.map((group) => (
          <div className="r-record-condition" key={group.title} role="group" aria-label={group.title}>
            <span className="r-record-condition__title">{group.title}<small>{group.exclusive ? "하나만" : "여러 개"}</small></span>
            <div className="r-chips r-chips--wrap">
              {group.conditions.map((condition) => {
                const on = form.visitConditions.includes(condition);
                return (
                  <button type="button" key={condition} className={`r-chip ${on ? "is-on" : ""}`} aria-pressed={on}
                    onClick={() => form.toggleVisitCondition(condition)}>
                    {on && <Icon name="check" />}{condition}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button type="button" className="r-record-text-button" onClick={() => onRequest("PLACE_INFO")}>필요한 정보가 없나요? 정보 제안하기</button>
      </div>
    </section>
  );
}

/* ── 4단계 · 추천 이유와 공개 범위 ── */
export function StoryStep({ form }: { form: RecordForm }) {
  const [detailOpen, setDetailOpen] = useState(() => !!form.detail);
  const detailMax = Math.max(0, REASON_MAX - 1 - form.headline.trim().length);
  return (
    <section className="r-record-step" aria-label="추천 이유와 공개 범위">
      <StepTitle>한 줄로 추천한다면?</StepTitle>

      <label className="r-card r-record-headline">
        <span className="visually-hidden">한 줄 추천</span>
        <textarea className="r-display" rows={2} value={form.headline} maxLength={HEADLINE_MAX}
          placeholder="예: 홍합이 반, 국물이 반. 공깃밥은 꼭 두 개."
          onChange={(event) => form.setHeadline(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setDetailOpen(true);
            }
          }} />
        <small>{form.headline.length} / {HEADLINE_MAX}</small>
      </label>

      {detailOpen ? (
        <label className="r-record-detail">
          <span>자세한 이야기 <small>선택</small></span>
          <textarea rows={5} value={form.detail} maxLength={Math.max(detailMax, form.detail.length)} autoFocus={!form.detail}
            placeholder="메뉴 맛, 분위기, 다시 간다면 꼭 할 것처럼 직접 느낀 이야기를 남겨 주세요."
            onChange={(event) => form.setDetail(event.target.value)} />
          <small>{form.reason.length} / {REASON_MAX}</small>
        </label>
      ) : (
        <button type="button" className="r-record-dashed" onClick={() => setDetailOpen(true)}>
          <Icon name="plus" />자세한 이야기 더 쓰기 (선택)
        </button>
      )}

      <fieldset className="r-record-field r-record-visibility">
        <legend><span className="r-record-field-head"><h2>공개 범위</h2></span></legend>
        {([
          { value: "public", title: "공개 추천", text: "다른 맛객의 발견과 피드에 보여요." },
          { value: "private", title: "나만 보기", text: "내 기록에서만 볼 수 있어요." },
        ] as const).map((option) => (
          <label key={option.value} className={`r-card r-record-option ${form.visibility === option.value ? "is-on" : ""}`}>
            <input className="visually-hidden" type="radio" name="record-visibility" checked={form.visibility === option.value}
              onChange={() => form.setVisibility(option.value)} />
            <span className="r-record-option__copy"><b>{option.title}</b><small>{option.text}</small></span>
            <span className="r-record-option__mark" aria-hidden="true"><Icon name="check" /></span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

/* ── 5단계 · 확인 ── */
export function ReviewStep({ form, onEdit }: { form: RecordForm; onEdit: (step: RecordStep) => void }) {
  const menuNames = form.menus.map((item) => item.name.trim()).filter(Boolean);
  const headline = form.headline.trim() || form.reason.split("\n")[0];
  const rows: { step: RecordStep; label: string; value: string }[] = [
    ...(form.steps.includes("place") ? [{ step: "place" as const, label: "장소", value: form.name || "선택 안 함" }] : []),
    { step: "media", label: "사진", value: `${form.photos.length}장` },
    { step: "media", label: "추천 메뉴", value: menuNames.length ? menuNames.join(", ") : "없음" },
    { step: "taste", label: "태그", value: form.tags.length ? form.tags.join(", ") : "없음" },
    { step: "taste", label: "방문 조건", value: form.visitConditions.length ? form.visitConditions.join(", ") : "없음" },
    { step: "story", label: "공개 범위", value: form.visibility === "public" ? "공개 추천" : "나만 보기" },
  ];
  return (
    <section className="r-record-step" aria-label="기록 확인">
      <StepTitle lead="저장하기 전에 한 번 더 확인해 주세요.">{form.editing ? "이대로 고칠까요?" : "이대로 남길까요?"}</StepTitle>

      <article className="r-card r-record-preview">
        {form.photos[0]
          ? <img src={form.photos[0]} alt={`${form.name} 대표 사진`} />
          : <span className="r-record-preview__empty"><Icon name="image" /></span>}
        <div>
          <b>{form.name}</b>
          {headline && <span className="r-display">&ldquo;{headline}&rdquo;</span>}
          {form.detail.trim() && form.headline.trim() && <p>{form.detail.trim()}</p>}
          {form.tags.length > 0 && <div className="r-tags">{form.tags.slice(0, 4).map((tag) => <span className="r-tag" key={tag}>{tag}</span>)}</div>}
        </div>
      </article>

      <div className="r-record-summary">
        {rows.map((row) => (
          <div className="r-record-summary__row" key={row.label}>
            <span>{row.label}</span>
            <b>{row.value}</b>
            <button type="button" className="r-record-text-button" aria-label={`${row.label} 수정`} onClick={() => onEdit(row.step)}>수정</button>
          </div>
        ))}
      </div>
    </section>
  );
}
