import { useId, useRef, useState } from "react";
import { RETRY_LATER_MESSAGE, useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, Skeleton, TopBar, type EmptyStateAction } from "../../components/ui";
import { useScrolledPast } from "../../hooks/useScrolledPast";
import { isMyTaster, type Place } from "../../models/place";
import { kakaoPlaceUrl, openDirections, sharePlaceWithNotice } from "../../utils/placeLinks";
import { isKakaoOnlyPlaceId } from "./kakaoPlaceDetail";
import PhotoViewer from "./PhotoViewer";
import PlaceHero from "./PlaceHero";
import PlaceInfo from "./PlaceInfo";
import PlaceMenus from "./PlaceMenus";
import PlaceOverview, { placeStatuses } from "./PlaceOverview";
import PlaceRecordMenu from "./PlaceRecordMenu";
import PlaceTasterLead from "./PlaceTasterLead";
import PlaceTasterRecord from "./PlaceTasterRecord";
import PlaceTasterSwitcher from "./PlaceTasterSwitcher";
import { collectPhotos, hasCoordinates, placeGalleryPhotos, placeRecords, type PlacePhoto } from "./placeRecords";
import { usePlaceDetailActions } from "./usePlaceDetailActions";
import { usePlaceDistance } from "./usePlaceDistance";

/**
 * 맛집 상세(#place/<id>, 보드 09). 위쪽 흰 바(뒤로 · 하트 · 공유) 아래 큰 사진과 점, 이름 · "분류 · 거리 · 동네", 대표 맛객 한마디(09-01),
 * 맛객의 추천 이유(‹ 맛객 › · 한 줄 추천 · 이야기 · 이런 스타일이에요, 09-02), 대표 메뉴 · 맛집 사진(09-03),
 * 위치 · 맛객이 남긴 이용 정보 · 정보 제보(09-04), 아래 고정 버튼 줄(바로가기 · 길찾기) 순서입니다.
 * 가게 기본 정보(이름·주소·전화)는 모든 맛객이 함께 쓰고,
 * 큰 사진·추천 이유·메뉴·태그·매장 이용 정보는 고른 맛객 한 명의 것만 보여 줍니다(맛객끼리 섞지 않음). "맛집 사진"만 모든 맛객의 사진입니다.
 */
export default function PlaceDetailScreen() {
  const app = useAppData();
  const place = app.activePlace;
  if (!place) {
    const hasFailed = !app.isLoading && !!app.error;
    const home: EmptyStateAction = { label: "발견으로 돌아가기", onClick: () => go("home"), variant: "primary" };
    return (
      <main className="r-screen r-place-missing">
        <TopBar title="맛집 상세" fallback="home" />
        {app.isLoading ? (
          <Skeleton shape="line" count={3} label="맛집을 불러오고 있어요." className="r-place-skeleton" />
        ) : hasFailed ? (
          <EmptyState
            tone="error"
            title="맛집을 불러오지 못했어요"
            message={RETRY_LATER_MESSAGE}
            action={{ label: "다시 불러오기", onClick: app.actions.retry }}
            secondaryAction={home}
          />
        ) : (
          <EmptyState title="맛집 정보를 찾을 수 없어요" message="삭제되었거나 볼 수 없는 기록이에요." action={home} />
        )}
      </main>
    );
  }
  return <PlaceDetail key={place.id} place={place} />;
}

function PlaceDetail({ place }: { place: Place }) {
  const app = useAppData();
  const { actions } = app;
  const records = placeRecords(place, app.subscriptionIds);
  const [selectedId, setSelectedId] = useState(() => records[0]?.tasterId ?? "");
  const selectedIndex = Math.max(
    0,
    records.findIndex((record) => record.tasterId === selectedId),
  );
  const selected = records[selectedIndex];
  // 사진 보기는 대표 사진 다음에 메뉴 사진이 이어지는 순서입니다. 큰 사진에는 대표 사진만 보여 주고,
  // 대표 사진이 없을 때만 메뉴 사진을 대신 씁니다.
  const photos = selected ? collectPhotos(selected) : [];
  const mainPhotos = photos.filter((photo) => !photo.isMenu);
  const heroPhotos = mainPhotos.length ? mainPhotos : photos;
  // "맛집 사진"은 모든 맛객의 대표 사진입니다(보드 09-03).
  const galleryPhotos = placeGalleryPhotos(records);
  const panelId = useId();
  const distance = usePlaceDistance(place);

  const isLiked = app.likedPlaceIds.includes(place.id);
  // 다녀온 곳: 빠른 저장·기록한 적 있는 곳. 위치 확인 없이 언제든 기록할 수 있습니다.
  const isVisited = app.visitedPlaceIds.includes(place.id);
  const isDisliked = app.dislikedPlaceIds.includes(place.id);
  const hasOwnRecord = records.some(isMyTaster);
  // 내 지도 검색에서 고른, 맛다공에 아직 없는 카카오 가게입니다. 하트를 누르면 그때 맛다공 장소로 저장합니다.
  const isKakaoOnly = isKakaoOnlyPlaceId(place.id);
  const { isBusy, startNewRecord, toggleLike } = usePlaceDetailActions(place, isVisited);

  // 사진 보기: 고른 맛객의 사진(큰 사진·대표 메뉴) 또는 모든 맛객의 "맛집 사진" 중 어느 쪽을 몇 번째부터 보는지입니다.
  const [viewer, setViewer] = useState<{ photos: PlacePhoto[]; index: number } | null>(null);
  const heroEnd = useRef<HTMLDivElement>(null);
  // 큰 사진이 화면 밖으로 나가면 위쪽 바에 가게 이름을 보여 줍니다.
  const isScrolled = useScrolledPast(heroEnd);

  function selectTaster(tasterId: string) {
    setSelectedId(tasterId);
    setViewer(null);
  }

  // 다녀온 곳(내 기록이 있거나, 빠른 저장·별로였어요로 다녀온 곳)은 이미 가 본 곳이라 하트(가볼 곳 저장)를 두지 않고,
  // 반대로 내 기록 남기기는 기록 없이 다녀온 곳에만 둡니다(안 가 본 곳은 저장, 가 본 곳은 기록). 위쪽 "다녀온 곳" 뱃지가 그 이유를 알려 줍니다.
  // 내 기록이 있으면 수정·공개 범위·지우기는 "맛객의 추천 이유" 오른쪽 ⋯ 메뉴(PlaceRecordMenu)에서 합니다.
  const hasVisited = hasOwnRecord || isVisited || isDisliked;
  const ownRecord = records.find(isMyTaster);
  const canSave = !hasVisited;

  return (
    <main className="r-screen r-place" data-scrolled={isScrolled}>
      <TopBar
        title={place.name}
        right={
          <>
            {canSave && (
              <button
                type="button"
                className={`r-icon-button r-place-like ${isLiked ? "is-liked" : ""}`}
                onClick={() => void toggleLike()}
                disabled={isBusy}
                aria-label={isLiked ? "하트 풀기" : "가볼 곳에 저장"}
                aria-pressed={isLiked}
              >
                <Icon name="heart" filled={isLiked} />
              </button>
            )}
            {/* 맛다공에 아직 없는 카카오 가게는 다른 사람이 열 수 있는 주소가 없어 공유를 숨깁니다. */}
            {!isKakaoOnly && (
              <button
                type="button"
                className="r-icon-button"
                onClick={() => void sharePlaceWithNotice(place, actions.notify)}
                aria-label="맛집 공유"
              >
                <Icon name="share" />
              </button>
            )}
          </>
        }
      />

      <PlaceHero
        key={selected?.tasterId ?? "none"}
        place={place}
        photos={heroPhotos}
        onOpenPhoto={(index) => setViewer({ photos: heroPhotos, index })}
      />
      <div ref={heroEnd} aria-hidden="true" />

      <div className="r-place-body">
        <PlaceOverview
          place={place}
          distance={distance}
          statuses={placeStatuses({
            hasOwnRecord,
            isOwnPrivate: ownRecord?.visibility === "PRIVATE",
            isDisliked,
            isVisited,
            isLiked,
          })}
        />
        {records[0] && <PlaceTasterLead record={records[0]} />}

        <section className="r-place-section r-place-records" aria-labelledby="place-records-title">
          <div className="r-place-records__head">
            <h2 className="r-place-section__title" id="place-records-title">
              맛객의 추천 이유
            </h2>
            {selected && (
              <PlaceRecordMenu
                key={selected.tasterId}
                record={selected}
                placeId={place.id}
                onEditOwn={() => go("register", place.id)}
                onChangeOwnVisibility={(visibility) => void actions.changeOwnRecordVisibility(place, visibility)}
                onDeleteOwn={() => actions.deleteOwnRecord(place)}
              />
            )}
          </div>
          {selected ? (
            <>
              <PlaceTasterSwitcher records={records} selectedIndex={selectedIndex} onSelect={selectTaster} />
              <PlaceTasterRecord key={selected.tasterId} record={selected} panelId={panelId} />
            </>
          ) : (
            // 기록 없이 하트만 남은 곳(가볼 곳으로 저장했거나, 기록했던 맛객이 기록을 내린 곳)도 무엇인지 알 수 있게 안내합니다.
            <EmptyState
              title={
                isVisited
                  ? "다녀온 곳이에요 · 아직 기록 없음"
                  : isLiked
                    ? "가볼 곳으로 저장한 곳이에요"
                    : "아직 남겨진 맛객 기록이 없어요"
              }
              message={
                isVisited
                  ? "위치와 상관없이 언제든 사진과 추천 이유를 남겨 내 기록으로 만들 수 있어요."
                  : isKakaoOnly
                    ? "아직 이 가게를 기록한 맛객이 없어요. 하트를 누르면 가볼 곳에 저장돼요. 가게 정보는 아래에서 볼 수 있어요."
                    : "지금 볼 수 있는 맛객 기록이 없어요. 아직 아무도 기록하지 않았거나, 기록했던 맛객이 기록을 내린 곳이에요. 가게 정보는 아래에서 볼 수 있어요."
              }
            />
          )}
          {selected && isLiked && !isVisited && !hasOwnRecord && (
            <p className="r-place-note">
              가볼 곳으로 저장했어요. 다녀오면 내 지도의 ‘기록하기’로 빠른 저장이나 기록을 남길 수 있어요.
            </p>
          )}
          {isDisliked && !isLiked && !hasOwnRecord && (
            <p className="r-place-note r-place-note--disliked">
              다녀왔는데 별로였던 곳이라 발견·내 지도의 지도에서 뺐어요. 이 맛집을 추천한 맛객과의 신뢰에도 반영돼요.
              <button type="button" className="r-text-button" onClick={() => void actions.undoDislike(place.id)}>
                되돌리기
              </button>
            </p>
          )}
          {/* 내 기록 남기기는 기록 없이 다녀온 곳에서만 둡니다. */}
          {hasVisited && !hasOwnRecord && (
            <button
              type="button"
              className="r-button r-button--soft r-button--block r-place-records__write"
              onClick={() => void startNewRecord()}
              disabled={isBusy}
            >
              <Icon name="pencil" />
              {isBusy ? "확인하고 있어요…" : "내 기록 남기기"}
            </button>
          )}
        </section>

        {selected && (
          <PlaceMenus record={selected} photos={photos} onOpenPhoto={(index) => setViewer({ photos, index })} />
        )}

        {galleryPhotos.length > 0 && (
          <section className="r-place-section r-place-gallery" aria-labelledby="place-gallery-title">
            <h2 className="r-place-section__title" id="place-gallery-title">
              맛집 사진
            </h2>
            <PlaceHero
              place={place}
              photos={galleryPhotos}
              onOpenPhoto={(index) => setViewer({ photos: galleryPhotos, index })}
            />
          </section>
        )}

        <PlaceInfo place={place} conditions={selected?.visitConditions ?? []} />
      </div>

      {/* 보드 09-03 아래 버튼 줄: 바로가기(카카오맵 가게 화면) · 길찾기 */}
      <div className="r-action-bar r-place-actionbar">
        <a className="r-button r-button--secondary" href={kakaoPlaceUrl(place)} target="_blank" rel="noreferrer">
          <Icon name="external" />
          바로가기
        </a>
        <button
          type="button"
          className="r-button r-button--primary r-place-actionbar__main"
          onClick={() => openDirections(place)}
          disabled={!hasCoordinates(place)}
        >
          <Icon name="route" />
          길찾기
        </button>
      </div>

      {viewer && (
        <PhotoViewer
          photos={viewer.photos}
          startIndex={viewer.index}
          placeName={place.name}
          onClose={() => setViewer(null)}
        />
      )}
    </main>
  );
}
