import { useState } from "react";
import Icon from "../../components/Icon";
import SearchHighlight from "../../components/SearchHighlight";
import { EmptyState } from "../../components/ui";
import { placeNeighborhood, VISIT_RADIUS_LABEL } from "../../models/place";
import { formatDistance, shortCategory } from "../../utils/format";
import { distanceMeters, kakaoPlaceAddress, kakaoPlaceCoordinates } from "../../utils/geo";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";

/**
 * 1단계 · 장소 선택(보드 11-01): 회색 검색창 "가게 이름을 검색해 보세요", 그 아래 가게 줄(사진 칸 · 이름 · "분류 · 거리 · 동네").
 * 검색어가 없으면 지금 위치 근처 음식점·카페를, 있으면 1km 안 검색 결과를 보여 주고, 고른 줄은 연한 코랄로 표시합니다(다음으로 넘어감).
 */
export default function PlaceStep({ form }: { form: RecordForm }) {
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const { selectedPlace, location } = form;
  const query = form.placeSearch.trim();
  const listed = query ? form.placeResults : form.nearbyPlaces;
  // 고른 가게가 지금 목록에 없으면(임시 저장에서 고름 등) 맨 위에 붙여 무엇을 골랐는지 보이게 합니다.
  const rows =
    selectedPlace && !listed.some((result) => result.id === selectedPlace.id) ? [selectedPlace, ...listed] : listed;

  return (
    <section className="r-record-step" aria-label="장소 고르기">
      <RecordStepTitle lead="직접 다녀온 가게를 선택해 주세요.">1 · 장소 선택</RecordStepTitle>

      <label className="r-record-search">
        <Icon name="search" />
        <span className="visually-hidden">가게 이름 검색</span>
        <input
          value={form.placeSearch}
          placeholder="가게 이름을 검색해 보세요"
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
        {form.isSearchingPlaces && (
          <span className="r-record-search__state" role="status">
            찾는 중
          </span>
        )}
      </label>

      {rows.length > 0 && (
        <div className="r-record-results" role="radiogroup" aria-label={query ? "검색 결과" : "지금 있는 곳 근처"}>
          {rows.map((result) => {
            const isOn = selectedPlace?.id === result.id;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={isOn}
                className={`r-record-result ${isOn ? "is-on" : ""}`}
                key={result.id}
                onClick={() => form.choosePlace(result)}
              >
                <span className="r-record-result__thumb" aria-hidden="true">
                  <Icon name={/카페|디저트|베이커리/.test(result.category_name) ? "coffee" : "fork"} />
                </span>
                <span className="r-record-result__copy">
                  <b>
                    <SearchHighlight text={result.place_name} query={query} />
                  </b>
                  <small>
                    {[
                      shortCategory(result.category_name),
                      location ? formatDistance(distanceMeters(location, kakaoPlaceCoordinates(result))) : "",
                      placeNeighborhood({ address: kakaoPlaceAddress(result), lotAddress: null }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {query && form.hasSearched && !form.isSearchingPlaces && !form.placeResults.length && (
        <EmptyState
          className="r-record-empty"
          title={`${VISIT_RADIUS_LABEL} 안에서 ‘${query}’을(를) 찾지 못했어요`}
          message="가게 근처에서 다시 검색하거나, 이름을 조금 다르게 적어 보세요."
        />
      )}

      {form.drafts.length > 0 && (
        <div className="r-record-drafts">
          <button
            type="button"
            className="r-record-drafts__toggle"
            aria-expanded={isDraftsOpen}
            onClick={() => setIsDraftsOpen((isOpen) => !isOpen)}
          >
            <span>임시 저장한 장소 이어서 쓰기</span>
            <b>{form.drafts.length}</b>
          </button>
          {isDraftsOpen && (
            <div className="r-record-drafts__list">
              {form.drafts.map((item) => (
                <button
                  type="button"
                  className="r-row"
                  key={`${item.providerCode}:${item.providerPlaceId}`}
                  onClick={() => {
                    form.chooseQuickDraft(item);
                    setIsDraftsOpen(false);
                  }}
                >
                  <span className="r-badge-icon is-quiet">
                    <Icon name="clock" />
                  </span>
                  <span className="r-row__copy">
                    <b>{item.placeName}</b>
                    <small>{item.address}</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!location && (
        <div className="r-record-location">
          <Icon name="locate" />
          <span>{form.locationMessage}</span>
          <button type="button" className="r-text-button" onClick={form.refreshLocation}>
            다시 확인
          </button>
        </div>
      )}
    </section>
  );
}
