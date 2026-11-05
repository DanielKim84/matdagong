import { useId, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead, Skeleton, TopBar, type EmptyStateAction } from "../../components/ui";
import { useScrolledPast } from "../../hooks/useScrolledPast";
import { kakaoPlaceFromPlace } from "../../services/places";
import { VISIT_RADIUS_LABEL, isMyTaster, type Place } from "../../models/place";
import { sharePlace } from "../../utils/placeLinks";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import PhotoViewer from "./PhotoViewer";
import PlaceConversionSheet from "./PlaceConversionSheet";
import PlaceHero from "./PlaceHero";
import PlaceInfo from "./PlaceInfo";
import PlaceOverview from "./PlaceOverview";
import PlaceTasterPicker from "./PlaceTasterPicker";
import PlaceTasterRecord from "./PlaceTasterRecord";
import { collectPhotos, placeRecords } from "./placeRecords";

/**
 * 맛집 상세(#place/<id>). 가게 기본 정보(이름·주소·전화)는 모든 맛객이 함께 쓰고,
 * 사진·추천 이유·메뉴·태그·매장 이용 정보는 고른 맛객 한 명의 것만 보여 줍니다(맛객끼리 섞지 않음).
 */
export default function PlaceDetailScreen() {
  const app = useAppData();
  const place = app.activePlace;
  if (!place) {
    const hasFailed = !app.loading && !!app.error;
    const home: EmptyStateAction = { label: "발견으로 돌아가기", onClick: () => go("home"), variant: "primary" };
    return (
      <main className="r-screen r-place-missing">
        <TopBar title="맛집 상세" fallback="home" />
        {app.loading ? (
          <Skeleton shape="line" count={3} label="맛집을 불러오고 있어요." className="r-place-skeleton" />
        ) : hasFailed ? (
          <EmptyState
            tone="error"
            title="맛집을 불러오지 못했어요"
            message="잠시 후 다시 시도해 주세요."
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
  const records = placeRecords(place, app.legacyOwnRecord, app.subscriptionIds);
  const [selectedId, setSelectedId] = useState(() => records[0]?.tasterId ?? "");
  const selectedIndex = Math.max(
    0,
    records.findIndex((record) => record.tasterId === selectedId),
  );
  const selected = records[selectedIndex];
  // 사진 보기는 대표 사진 다음에 메뉴 사진이 이어지는 순서입니다. 큰 사진에는 대표 사진만 보여 주고,
  // 대표 사진이 없을 때만 메뉴 사진을 대신 씁니다.
  const photos = selected ? collectPhotos([selected]) : [];
  const mainPhotos = photos.filter((photo) => !photo.isMenu);
  const heroPhotos = mainPhotos.length ? mainPhotos : photos;
  const panelId = useId();

  const isLiked = app.likedPlaceIds.includes(place.id);
  const canConvertLikedToRecord = app.visitedLikedPlaceIds.includes(place.id);
  const isDisliked = app.dislikedPlaceIds.includes(place.id);
  const hasOwnRecord = !!app.legacyOwnRecord || records.some(isMyTaster);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const heroEnd = useRef<HTMLDivElement>(null);
  const recordsRef = useRef<HTMLElement>(null);
  // 큰 사진이 화면 밖으로 나가면 위쪽 버튼 줄에 바탕과 가게 이름을 깔아 줍니다.
  const isScrolled = useScrolledPast(heroEnd);

  const notify = (message: string) => actions.notify({ kind: "info", title: "맛다공에서 알려드려요", message });

  async function share() {
    const result = await sharePlace(place);
    if (result === "copied") notify("맛집 링크를 복사했어요.");
    else if (result === "failed") notify("주소창의 링크를 복사해 공유해 주세요.");
  }

  /**
   * 다녀온 근거(빠른 저장, 입맛에 맞았던 하트, 별로였던 곳)가 있으면 이 가게를 채운 채 기록하기의 사진·메뉴 단계부터 엽니다.
   * 근거가 없으면 기록 화면에 들어가지 않고, 직접 다녀온 곳만 기록할 수 있다고 알립니다.
   */
  function startNewRecord() {
    const hasVisitProof = app.visitProofPlaceIds.includes(place.id) || app.visitedLikedPlaceIds.includes(place.id);
    const kakaoPlace = kakaoPlaceFromPlace(place);
    if (!hasVisitProof || !kakaoPlace) {
      actions.notify({
        kind: "info",
        title: "직접 다녀온 곳만 기록할 수 있어요",
        message: `가게에 들렀을 때 ‘빠른 저장’을 해 두거나, 기록하기에서 지금 위치 ${VISIT_RADIUS_LABEL} 안의 가게를 골라 기록해 주세요.`,
      });
      return;
    }
    writeStorageJson(STORAGE_KEYS.placeDetailHandoff, { place: kakaoPlace }, "session");
    go("register");
  }

  function editOwnRecord() {
    go("register", place.id);
  }

  function selectTaster(tasterId: string) {
    setSelectedId(tasterId);
    setViewerIndex(null);
  }

  function selectByOffset(offset: number) {
    const next = records[selectedIndex + offset];
    if (!next) return;
    selectTaster(next.tasterId);
    recordsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const recordAction = hasOwnRecord
    ? { label: "내 기록 수정", run: editOwnRecord }
    : isLiked && canConvertLikedToRecord
      ? { label: "방문 기록으로 바꾸기", run: () => setIsConversionOpen(true) }
      : { label: "내 기록 남기기", run: startNewRecord };

  return (
    <main className="r-screen r-place">
      <TopBar
        variant="float"
        title={place.name}
        isScrolled={isScrolled}
        right={
          <button type="button" className="r-icon-button r-icon-button--float" onClick={share} aria-label="맛집 공유">
            <Icon name="share" />
          </button>
        }
      />

      <PlaceHero
        key={selected?.tasterId ?? "none"}
        place={place}
        photos={heroPhotos}
        caption={selected && heroPhotos.length > 0 ? `${selected.tasterName}님의 사진` : undefined}
        onOpenPhoto={setViewerIndex}
      />
      <div ref={heroEnd} aria-hidden="true" />

      <div className="r-place-body">
        <PlaceOverview
          place={place}
          isLiked={isLiked}
          isVisitedLike={canConvertLikedToRecord}
          hasOwnRecord={hasOwnRecord}
        />

        <section className="r-place-section r-place-records" ref={recordsRef} aria-labelledby="place-records-title">
          <SectionHead
            title="맛객 기록"
            titleId="place-records-title"
            meta={records.length > 0 && `${records.length}명`}
            className="r-place-records__head"
          />
          {records.length > 1 && (
            <p className="r-place-records__hint">
              맛객을 고르면 그 맛객이 남긴 사진·메뉴·태그·매장 정보를 볼 수 있어요.
            </p>
          )}
          {selected ? (
            <>
              {records.length > 1 && (
                <PlaceTasterPicker
                  records={records}
                  selectedId={selected.tasterId}
                  panelId={panelId}
                  onSelect={selectTaster}
                />
              )}
              <PlaceTasterRecord
                key={selected.tasterId}
                record={selected}
                placeId={place.id}
                panelId={panelId}
                photos={photos}
                onOpenPhoto={setViewerIndex}
                onPrevious={selectedIndex > 0 ? () => selectByOffset(-1) : undefined}
                onNext={selectedIndex < records.length - 1 ? () => selectByOffset(1) : undefined}
                onChangeOwnVisibility={(visibility) => void actions.changeOwnRecordVisibility(place, visibility)}
                // 서버에 내 기록이 있을 때만 지울 수 있습니다(이 브라우저에만 남은 이전 기록은 제외).
                onDeleteOwn={place.tasters.some(isMyTaster) ? () => actions.deleteOwnRecord(place) : undefined}
              />
            </>
          ) : (
            // 기록 없이 하트만 남은 곳(가볼 곳으로 저장했거나, 기록했던 맛객이 기록을 내린 곳)도 무엇인지 알 수 있게 안내합니다.
            <EmptyState
              title={
                canConvertLikedToRecord
                  ? "다녀온 곳으로 저장했어요 · 아직 기록 없음"
                  : isLiked
                    ? "가볼 곳으로 저장한 곳이에요"
                    : "아직 남겨진 맛객 기록이 없어요"
              }
              message={
                canConvertLikedToRecord
                  ? "사진과 추천 이유를 남기면 내 기록이 돼요. 기록했던 맛객이 기록을 내렸다면 가게 정보만 보여요."
                  : "지금 볼 수 있는 맛객 기록이 없어요. 아직 아무도 기록하지 않았거나, 기록했던 맛객이 기록을 내린 곳이에요. 가게 정보는 아래에서 볼 수 있어요."
              }
              action={{ label: recordAction.label, onClick: recordAction.run, variant: "primary" }}
            />
          )}
          {selected && isLiked && !canConvertLikedToRecord && !hasOwnRecord && (
            <p className="r-place-note">
              가 보고 싶은 곳으로 저장했어요. 다녀왔다면 ‘내 기록 남기기’로 기록하거나, 가게에서 빠른 저장을 한 뒤
              하트를 다시 눌러 입맛에 맞았는지 고를 수 있어요.
            </p>
          )}
          {isDisliked && !isLiked && !hasOwnRecord && (
            <p className="r-place-note r-place-note--disliked">
              다녀왔는데 별로였던 곳으로 남겼어요. 이 맛집을 기록한 맛객과의 신뢰에 반영돼요.
              <button type="button" className="r-text-button" onClick={() => void actions.undoDislike(place.id)}>
                되돌리기
              </button>
            </p>
          )}
        </section>

        <PlaceInfo place={place} />
      </div>

      {/* 화면의 동작은 한 번씩만 둡니다. 내 기록이 있는 곳은 이미 내 맛집이라 하트를 빼고 수정만 둡니다(공개 범위는 기록 카드에서). */}
      <div className="r-action-bar r-place-actionbar">
        {!hasOwnRecord && (
          <button
            type="button"
            className={`r-button r-button--secondary r-place-actionbar__save ${isLiked ? "is-liked" : ""}`}
            onClick={() => void actions.chooseLike(place.id)}
            aria-label={isLiked ? "가볼 곳·다녀온 곳 저장 바꾸기" : "가볼 곳에 저장"}
            aria-pressed={isLiked}
          >
            <Icon name="heart" filled={isLiked} />
          </button>
        )}
        <button type="button" className="r-button r-button--primary r-place-actionbar__main" onClick={recordAction.run}>
          <Icon name={hasOwnRecord ? "book" : "plus"} />
          {recordAction.label}
        </button>
      </div>

      {viewerIndex !== null && photos.length > 0 && (
        <PhotoViewer
          photos={photos}
          startIndex={viewerIndex}
          placeName={place.name}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {isConversionOpen && <PlaceConversionSheet place={place} onClose={() => setIsConversionOpen(false)} />}
    </main>
  );
}
