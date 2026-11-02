import { useId, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead, Skeleton, TopBar, type EmptyStateAction } from "../../components/ui";
import { kakaoPlaceFromPlace } from "../../services/places";
import { isMyTaster, type Place } from "../../models/place";
import { sharePlace } from "../../utils/placeLinks";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import PhotoViewer from "./PhotoViewer";
import PlaceConversionSheet, { type ConversionKind } from "./PlaceConversionSheet";
import PlaceHero from "./PlaceHero";
import PlaceInfo from "./PlaceInfo";
import PlaceOverview from "./PlaceOverview";
import PlaceTasterPicker from "./PlaceTasterPicker";
import PlaceTasterRecord from "./PlaceTasterRecord";
import { collectPhotos, placeRecords } from "./placeRecords";
import { useHeroScrolled } from "./useHeroScrolled";

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
  const hasOwnRecord = !!app.legacyOwnRecord || records.some(isMyTaster);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [conversionPrompt, setConversionPrompt] = useState<ConversionKind | null>(null);
  const heroEnd = useRef<HTMLDivElement>(null);
  const recordsRef = useRef<HTMLElement>(null);
  // 큰 사진이 화면 밖으로 나가면 위쪽 버튼 줄에 바탕과 가게 이름을 깔아 줍니다.
  const isScrolled = useHeroScrolled(heroEnd);

  const notify = (message: string) => actions.notify({ kind: "info", title: "맛다공에서 알려드려요", message });

  async function share() {
    const result = await sharePlace(place);
    if (result === "copied") notify("맛집 링크를 복사했어요.");
    else if (result === "failed") notify("주소창의 링크를 복사해 공유해 주세요.");
  }

  function save() {
    // 직접 쓴 기록이 있는 맛집은 하트가 '내 맛집으로 변경'이 됩니다(기록 삭제를 동반하므로 한 번 더 묻습니다).
    if (hasOwnRecord) setConversionPrompt("like");
    else void actions.toggleLike(place.id);
  }

  function startNewRecord() {
    const selected = kakaoPlaceFromPlace(place);
    // 저장소를 못 쓰면 등록 화면에서 장소를 다시 고릅니다.
    if (selected) writeStorageJson(STORAGE_KEYS.quickPlaceHandoff, selected, "session");
    else notify("기록 화면에서 이 가게를 검색해 선택해 주세요.");
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
    ? { label: "내 기록 수정", short: "기록 수정", run: editOwnRecord }
    : isLiked && canConvertLikedToRecord
      ? { label: "방문 기록으로 바꾸기", short: "기록하기", run: () => setConversionPrompt("record") }
      : { label: "내 기록 남기기", short: "기록하기", run: startNewRecord };
  const saveLabel = hasOwnRecord ? "내 맛집으로 변경" : isLiked ? "내 맛집에서 삭제" : "내 맛집에 저장";

  return (
    <main className="r-screen r-place">
      <TopBar
        variant="float"
        title={place.name}
        isScrolled={isScrolled}
        right={
          <>
            <button type="button" className="r-icon-button r-icon-button--float" onClick={share} aria-label="맛집 공유">
              <Icon name="share" />
            </button>
            <button
              type="button"
              className={`r-icon-button r-icon-button--float r-place-like ${isLiked ? "is-liked" : ""}`}
              onClick={save}
              aria-label={saveLabel}
              aria-pressed={isLiked}
            >
              <Icon name="heart" filled={isLiked} />
            </button>
          </>
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
          hasOwnRecord={hasOwnRecord}
          saveLabel={saveLabel}
          recordAction={recordAction}
          onSave={save}
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
                panelId={panelId}
                photos={photos}
                onOpenPhoto={setViewerIndex}
                onPrevious={selectedIndex > 0 ? () => selectByOffset(-1) : undefined}
                onNext={selectedIndex < records.length - 1 ? () => selectByOffset(1) : undefined}
                onEditOwn={editOwnRecord}
                onOwnToLike={() => setConversionPrompt("like")}
              />
            </>
          ) : (
            <EmptyState
              title="아직 남겨진 맛객 기록이 없어요"
              message="다녀왔다면 첫 기록을 남겨 보세요."
              action={{ label: recordAction.label, onClick: recordAction.run, variant: "primary" }}
            />
          )}
          {isLiked && !canConvertLikedToRecord && !hasOwnRecord && (
            <p className="r-place-note">
              하트로 저장한 맛집은 방문 기록이 아니에요. 직접 다녀온 뒤 ‘내 기록 남기기’로 방문 기록을 남길 수 있어요.
            </p>
          )}
        </section>

        <PlaceInfo place={place} />
      </div>

      <div className="r-action-bar r-place-actionbar">
        <button
          type="button"
          className={`r-button r-button--secondary r-place-actionbar__save ${isLiked ? "is-liked" : ""}`}
          onClick={save}
          aria-label={saveLabel}
          aria-pressed={isLiked}
        >
          <Icon name="heart" filled={isLiked} />
        </button>
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

      {conversionPrompt && (
        <PlaceConversionSheet place={place} kind={conversionPrompt} onClose={() => setConversionPrompt(null)} />
      )}
    </main>
  );
}
