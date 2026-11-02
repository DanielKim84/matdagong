import { useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState, Segmented, Skeleton, TopBar, type EmptyStateAction } from "../../components/ui";
import { kakaoPlaceFromPlace } from "../../services/places";
import { isMyTaster, type Place } from "../../models/place";
import { sharePlace } from "../../utils/placeLinks";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import PhotoViewer from "./PhotoViewer";
import PlaceConversionSheet, { type ConversionKind } from "./PlaceConversionSheet";
import PlaceHero from "./PlaceHero";
import PlaceInfoTab from "./PlaceInfoTab";
import PlaceMenusTab from "./PlaceMenusTab";
import PlaceOverview from "./PlaceOverview";
import PlaceRecordCards from "./PlaceRecordCards";
import PlaceVisitors from "./PlaceVisitors";
import { collectPhotos, countValues, placeRecords } from "./placeRecords";
import { useHeroScrolled } from "./useHeroScrolled";

type Tab = "records" | "menus" | "info";
const TABS: { value: Tab; label: string }[] = [
  { value: "records", label: "기록" },
  { value: "menus", label: "메뉴" },
  { value: "info", label: "정보" },
];

/** 맛집 상세(#place/<id>). */
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
  const photos = collectPhotos(records);
  const tagCounts = countValues(records, (record) => record.tags);

  const isLiked = app.likedPlaceIds.includes(place.id);
  const canConvertLikedToRecord = app.visitedLikedPlaceIds.includes(place.id);
  const hasOwnRecord = !!app.legacyOwnRecord || records.some(isMyTaster);

  const [tab, setTab] = useState<Tab>("records");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [conversionPrompt, setConversionPrompt] = useState<ConversionKind | null>(null);
  const heroEnd = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
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

  function showRecords() {
    setTab("records");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

      <PlaceHero place={place} photos={photos} onOpenPhoto={setViewerIndex} />
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

        {records.length > 0 && <PlaceVisitors place={place} records={records} onSelect={showRecords} />}

        <div className="r-place-tabs" ref={tabsRef}>
          <Segmented value={tab} options={TABS} onChange={setTab} label="맛집 상세 보기" />
        </div>

        {tab === "records" && (
          <section className="r-place-section r-place-section--bleed" aria-label="맛객들의 기록">
            {records.length > 0 ? (
              <PlaceRecordCards
                records={records}
                photos={photos}
                onOpenPhoto={setViewerIndex}
                onEditOwn={editOwnRecord}
                onOwnToLike={() => setConversionPrompt("like")}
              />
            ) : (
              <EmptyState
                title="아직 남겨진 맛객 기록이 없어요"
                message="다녀왔다면 첫 기록을 남겨 보세요."
                action={{ label: recordAction.label, onClick: recordAction.run, variant: "primary" }}
              />
            )}
            {tagCounts.length > 0 && (
              <div className="r-place-summary">
                <span className="r-label">이럴 때 좋아요</span>
                <div className="r-tags">
                  {tagCounts.map(({ label, count }) => (
                    <span className="r-tag" key={label}>
                      {label}
                      {count > 1 && <em>· {count}</em>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {isLiked && !canConvertLikedToRecord && !hasOwnRecord && (
              <p className="r-place-note">
                하트로 저장한 맛집은 방문 기록이 아니에요. 직접 다녀온 뒤 ‘내 기록 남기기’로 방문 기록을 남길 수 있어요.
              </p>
            )}
          </section>
        )}

        {tab === "menus" && <PlaceMenusTab records={records} photos={photos} onOpenPhoto={setViewerIndex} />}

        {tab === "info" && <PlaceInfoTab place={place} records={records} />}
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
