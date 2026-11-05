import { useState } from "react";
import Icon from "../../components/Icon";
import { EmptyState } from "../../components/ui";
import { formatDistance, shortCategory } from "../../utils/format";
import { distanceMeters, kakaoPlaceCoordinates } from "../../utils/geo";
import RecordStepTitle from "./RecordStepTitle";
import type { RecordForm } from "./useRecordForm";
import { VISIT_RADIUS_LABEL } from "../../models/place";

/** 검색어와 겹치는 부분을 강조합니다. */
function Highlight({ text, query }: { text: string; query: string }) {
  const keyword = query.trim();
  const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + keyword.length)}</mark>
      {text.slice(at + keyword.length)}
    </>
  );
}

/** 1단계 · 장소 고르기 */
export default function PlaceStep({ form }: { form: RecordForm }) {
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const { selectedPlace, location } = form;
  const query = form.placeSearch.trim();

  return (
    <section className="r-record-step" aria-label="장소 고르기">
      <RecordStepTitle>
        어디를
        <br />
        다녀오셨나요?
      </RecordStepTitle>

      {form.shouldSearchConversionPlace && form.conversionSearchName && !selectedPlace && (
        <p className="r-record-hint">
          하트로 저장한 ‘{form.conversionSearchName}’을(를) 지도에서 찾아 골라 주세요. 방문 기록으로 바뀌어요.
        </p>
      )}

      {selectedPlace ? (
        <div className="r-card r-record-picked">
          <span className="r-badge-icon">
            <Icon name="check" />
          </span>
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
          <button type="button" className="r-text-button" onClick={form.clearPlace}>
            변경
          </button>
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
            {form.isSearchingPlaces && (
              <span className="r-record-search__state" role="status">
                찾는 중
              </span>
            )}
          </label>

          {form.placeResults.length > 0 && (
            <div className="r-record-results">
              <span className="r-record-results__label">지금 있는 곳 근처</span>
              {form.placeResults.map((result, resultIndex) => (
                <button
                  type="button"
                  className="r-row r-record-result"
                  key={result.id}
                  onClick={() => form.choosePlace(result, form.shouldSearchConversionPlace, !!form.convertFromPlaceId)}
                >
                  <span className={`r-badge-icon ${resultIndex === 0 ? "" : "is-quiet"}`}>
                    <Icon name="pin" />
                  </span>
                  <span className="r-row__copy">
                    <b>
                      <Highlight text={result.place_name} query={query} />
                    </b>
                    <small>
                      {[
                        shortCategory(result.category_name),
                        result.road_address_name || result.address_name,
                        location ? formatDistance(distanceMeters(location, kakaoPlaceCoordinates(result))) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {form.hasSearched && !form.isSearchingPlaces && !form.placeResults.length && (
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

          <div className={`r-record-location ${location ? "is-ready" : ""}`}>
            <Icon name={location ? "check" : "locate"} />
            <span>{form.locationMessage}</span>
            {!location && (
              <button type="button" className="r-text-button" onClick={form.refreshLocation}>
                다시 확인
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
