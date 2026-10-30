import { useEffect, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { back, go } from "../../app/navigation";
import type { Place } from "../../models/place";
import { kakaoPlaceFromPlace } from "../../services/places";
import { QUICK_PLACE_HANDOFF_KEY } from "../../services/registerDraft";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { Segmented, TopBar } from "../../components/ui";
import PlaceHero from "./PlaceHero";
import PlaceRecordCards from "./PlaceRecordCards";
import PhotoViewer from "./PhotoViewer";
import {
  avatarFallback,
  avatarSource,
  collectPhotos,
  countValues,
  formatPrice,
  hasCoordinates,
  kakaoPlaceUrl,
  MY_RECORD_ID,
  openKakaoDirections,
  photoIndexOf,
  placeRecords,
  summarizeMenus,
} from "./placeRecords";

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
    const failed = !app.loading && !!app.error;
    return (
      <main className="r-screen r-place-missing">
        <TopBar title="맛집 상세" fallback="home" />
        {app.loading ? (
          <div className="r-place-skeleton" aria-busy="true" aria-label="맛집을 불러오고 있어요">
            <span className="r-place-skeleton__hero" />
            <span className="r-place-skeleton__line" />
            <span className="r-place-skeleton__line r-place-skeleton__line--short" />
          </div>
        ) : (
          <div className="r-empty">
            <b>{failed ? "맛집을 불러오지 못했어요" : "맛집 정보를 찾을 수 없어요"}</b>
            <p>{failed ? "잠시 후 다시 시도해 주세요." : "삭제되었거나 볼 수 없는 기록이에요."}</p>
            {failed && <button type="button" className="r-button r-button--pill r-button--secondary" onClick={app.actions.retry}>다시 시도</button>}
            <button type="button" className="r-button r-button--pill r-button--primary" onClick={() => go("home")}>발견으로 돌아가기</button>
          </div>
        )}
      </main>
    );
  }
  return <PlaceDetail key={place.id} place={place} />;
}

function PlaceDetail({ place }: { place: Place }) {
  const app = useAppData();
  const { actions } = app;
  const own = app.legacyOwnRecord;
  const subscribedIds = app.subscriptionIds;
  const records = placeRecords(place, own, subscribedIds);
  const photos = collectPhotos(records);
  const menus = summarizeMenus(records);
  const tagCounts = countValues(records, (record) => record.tags);
  const conditionCounts = countValues(records, (record) => record.visitConditions);
  const placeConditions = conditionCounts.length ? [] : place.visitConditions ?? [];

  const liked = app.likedPlaceIds.includes(place.id);
  const canConvertLikedToRecord = app.visitedLikedPlaceIds.includes(place.id);
  const hasOwnRecord = !!own || records.some((record) => record.tasterId === MY_RECORD_ID);
  const visitors = records.filter((record) => record.visibility !== "PRIVATE");
  const visitorCount = Math.max(place.recordCount, visitors.length);
  const subscribedCount = visitors.filter((record) => subscribedIds.includes(record.tasterId)).length;
  const matchedCount = visitors.filter((record) => record.tasterId !== MY_RECORD_ID
    && !subscribedIds.includes(record.tasterId) && (record.matchScore ?? 0) > 0).length;
  const canRoute = hasCoordinates(place);
  const phone = place.providerPhone?.trim();
  const altAddress = [place.roadAddress, place.lotAddress].find((address) => address && address !== place.address);

  const [tab, setTab] = useState<Tab>("records");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [conversionPrompt, setConversionPrompt] = useState<"record" | "like" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const heroEnd = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // 큰 사진이 화면 밖으로 나가면 위쪽 버튼 줄에 바탕과 가게 이름을 깔아 줍니다.
  useEffect(() => {
    const target = heroEnd.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(entry.boundingClientRect.top < 64), { rootMargin: "-64px 0px 0px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const notify = (message: string, title = "맛다공에서 알려드려요") => actions.notify({ kind: "info", title, message });

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: place.name, text: `${place.name} · 맛다공 맛객 기록`, url });
        return;
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("맛집 링크를 복사했어요.");
    } catch {
      notify("주소창의 링크를 복사해 공유해 주세요.");
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(place.address);
      notify("주소를 복사했어요.");
    } catch {
      notify("주소를 길게 눌러 복사해 주세요.");
    }
  }

  function save() {
    // 직접 쓴 기록이 있는 맛집은 하트가 '내 맛집으로 변경'이 됩니다(기록 삭제를 동반하므로 한 번 더 묻습니다).
    if (hasOwnRecord) setConversionPrompt("like");
    else void actions.toggleLike(place.id);
  }

  function startNewRecord() {
    const selected = kakaoPlaceFromPlace(place);
    if (selected) {
      try {
        sessionStorage.setItem(QUICK_PLACE_HANDOFF_KEY, JSON.stringify(selected));
      } catch { /* 저장소를 못 쓰면 등록 화면에서 장소를 다시 고릅니다. */ }
    } else notify("기록 화면에서 이 가게를 검색해 선택해 주세요.");
    go("register");
  }

  const recordAction = hasOwnRecord
    ? { label: "내 기록 수정", short: "기록 수정", run: () => go("register", place.id) }
    : liked && canConvertLikedToRecord
      ? { label: "방문 기록으로 바꾸기", short: "기록하기", run: () => setConversionPrompt("record") }
      : { label: "내 기록 남기기", short: "기록하기", run: startNewRecord };
  const saveLabel = hasOwnRecord ? "내 맛집으로 변경" : liked ? "내 맛집에서 삭제" : "내 맛집에 저장";

  function showRecords() {
    setTab("records");
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="r-screen r-place">
      <div className={`r-place-float ${scrolled ? "is-scrolled" : ""}`}>
        <div className="r-place-float__bar">
          <button type="button" className="r-place-glass" onClick={() => back("home")} aria-label="이전 화면으로 돌아가기"><Icon name="back" /></button>
          <b className="r-place-float__title" aria-hidden={!scrolled}>{place.name}</b>
          <button type="button" className="r-place-glass" onClick={share} aria-label="맛집 공유"><Icon name="share" /></button>
          <button type="button" className={`r-place-glass ${liked ? "is-liked" : ""}`} onClick={save} aria-label={saveLabel} aria-pressed={liked}>
            <Icon name="heart" filled={liked} />
          </button>
        </div>
      </div>

      <PlaceHero place={place} photos={photos} onOpenPhoto={setViewerIndex} />
      <div ref={heroEnd} aria-hidden="true" />

      <div className="r-place-body">
        <header className="r-place-title">
          <h1 className="r-display">{place.name}</h1>
          <div className="r-place-pills">
            {place.category && <span className="r-place-pill">{place.category}</span>}
            {place.visibility === "private" && <span className="r-place-pill">비공개 기록</span>}
            {hasOwnRecord && <span className="r-place-pill is-accent">내가 다녀온 곳</span>}
            {!hasOwnRecord && liked && <span className="r-place-pill is-accent">내 맛집</span>}
          </div>
          {place.address && (
            <p className="r-place-address">
              <Icon name="pin" />
              <span>{place.address}</span>
              <a href={kakaoPlaceUrl(place)} target="_blank" rel="noreferrer">카카오맵</a>
            </p>
          )}
        </header>

        <nav className="r-place-quick" aria-label="빠른 동작">
          <button type="button" className="r-place-quick__item" onClick={() => openKakaoDirections(place)} disabled={!canRoute}>
            <span className="r-place-quick__icon is-primary"><Icon name="route" /></span>길찾기
          </button>
          <button type="button" className={`r-place-quick__item ${liked ? "is-on" : ""}`} onClick={save} aria-pressed={liked} aria-label={saveLabel}>
            <span className="r-place-quick__icon"><Icon name="heart" filled={liked} /></span>{liked ? "저장됨" : "저장"}
          </button>
          {phone ? (
            <a className="r-place-quick__item" href={`tel:${phone}`} aria-label={`전화 걸기 ${phone}`}>
              <span className="r-place-quick__icon"><Icon name="phone" /></span>전화
            </a>
          ) : (
            <button type="button" className="r-place-quick__item" disabled aria-label="전화번호 정보 없음">
              <span className="r-place-quick__icon"><Icon name="phone" /></span>전화
            </button>
          )}
          <button type="button" className="r-place-quick__item" onClick={recordAction.run}>
            <span className="r-place-quick__icon"><Icon name="book" /></span>{recordAction.short}
          </button>
        </nav>

        {records.length > 0 && (
          <button type="button" className="r-card r-place-visitors" onClick={showRecords}>
            <span className="r-avatar-stack" aria-hidden="true">
              {records.slice(0, 3).map((record) => (
                <Avatar key={record.tasterId} src={avatarSource(record)} fallbackSrc={avatarFallback(record)} name={record.tasterName} variant={record.avatarVariant} />
              ))}
            </span>
            <span className="r-place-visitors__copy">
              <b>{visitorCount > 0 ? `맛객 ${visitorCount}명이 다녀왔어요` : "아직 나만 아는 맛집이에요"}</b>
              {(subscribedCount > 0 || matchedCount > 0) && (
                <small>{[subscribedCount > 0 && `구독 ${subscribedCount}명`, matchedCount > 0 && `취향 맞는 맛객 ${matchedCount}명`].filter(Boolean).join(" · ")}</small>
              )}
            </span>
            <Icon name="chevron" />
          </button>
        )}

        <div className="r-place-tabs" ref={tabsRef}>
          <Segmented value={tab} options={TABS} onChange={setTab} label="맛집 상세 보기" />
        </div>

        {tab === "records" && (
          <section className="r-place-section r-place-section--bleed" aria-label="맛객들의 기록">
            {records.length > 0 ? (
              <PlaceRecordCards
                records={records}
                photos={photos}
                subscribedIds={subscribedIds}
                onOpenPhoto={setViewerIndex}
                onSubscribe={actions.openSubscription}
                onEditOwn={() => go("register", place.id)}
                onOwnToLike={() => setConversionPrompt("like")}
              />
            ) : (
              <div className="r-empty">
                <b>아직 남겨진 맛객 기록이 없어요</b>
                <p>다녀왔다면 첫 기록을 남겨 보세요.</p>
                <button type="button" className="r-button r-button--pill r-button--primary" onClick={recordAction.run}>{recordAction.label}</button>
              </div>
            )}
            {tagCounts.length > 0 && (
              <div className="r-place-summary">
                <span className="r-label">이럴 때 좋아요</span>
                <div className="r-tags">
                  {tagCounts.map(({ label, count }) => (
                    <span className="r-tag" key={label}>{label}{count > 1 && <em>· {count}</em>}</span>
                  ))}
                </div>
              </div>
            )}
            {liked && !canConvertLikedToRecord && !hasOwnRecord && (
              <p className="r-place-note">하트로 저장한 맛집은 방문 기록이 아니에요. 직접 다녀온 뒤 ‘내 기록 남기기’로 방문 기록을 남길 수 있어요.</p>
            )}
          </section>
        )}

        {tab === "menus" && (
          <section className="r-place-section" aria-label="추천 메뉴">
            <span className="r-label">맛객들이 추천한 메뉴</span>
            {menus.length > 0 ? (
              <div className="r-place-menus">
                {menus.map((menu) => {
                  const photoIndex = photoIndexOf(photos, menu.photo);
                  const body = <>
                    <span className="r-place-menu__photo">
                      {menu.photo ? <img src={menu.photo} alt="" loading="lazy" decoding="async" /> : <Icon name="fork" />}
                    </span>
                    <span className="r-place-menu__copy">
                      <b>{menu.name}</b>
                      {menu.price != null && <strong>{formatPrice(menu.price)}</strong>}
                      <small>맛객 {menu.count}명 추천</small>
                    </span>
                  </>;
                  return photoIndex >= 0
                    ? <button type="button" className="r-card r-place-menu" key={menu.name} onClick={() => setViewerIndex(photoIndex)} aria-label={`${menu.name} 사진 크게 보기`}>{body}</button>
                    : <div className="r-card r-place-menu" key={menu.name}>{body}</div>;
                })}
              </div>
            ) : (
              <div className="r-empty"><b>아직 추천 메뉴가 없어요</b><p>맛객이 메뉴를 남기면 여기에 모아 보여 드려요.</p></div>
            )}
          </section>
        )}

        {tab === "info" && (
          <section className="r-place-section" aria-label="매장 정보">
            <span className="r-label">매장 정보</span>
            <div className="r-card r-place-info">
              <div className="r-place-info__row">
                <Icon name="pin" />
                <span className="r-place-info__text">
                  {place.address || "주소 정보가 없어요"}
                  {altAddress && <small>{altAddress}</small>}
                </span>
                {place.address && <button type="button" onClick={copyAddress}>복사</button>}
              </div>
              <div className="r-place-info__row">
                <Icon name="phone" />
                {phone
                  ? <a className="r-place-info__text" href={`tel:${phone}`}>{phone}</a>
                  : <span className="r-place-info__text r-muted">전화번호 정보가 없어요</span>}
              </div>
              <a className="r-place-info__row" href={kakaoPlaceUrl(place)} target="_blank" rel="noreferrer">
                <Icon name="map" />
                <span className="r-place-info__text">카카오맵에서 보기</span>
                <Icon name="chevron" />
              </a>
            </div>

            <span className="r-label">맛객들이 확인한 방문 정보</span>
            {conditionCounts.length > 0 || placeConditions.length > 0 ? (
              <div className="r-place-pills">
                {conditionCounts.map(({ label, count }) => <span className="r-place-pill" key={label}>{label} · {count}명</span>)}
                {placeConditions.map((condition) => <span className="r-place-pill" key={condition}>{condition}</span>)}
              </div>
            ) : (
              <p className="r-place-note">아직 맛객들이 남긴 방문 정보가 없어요.</p>
            )}

            <button type="button" className="r-place-report" onClick={() => notify("잘못된 정보 제보는 준비 중이에요.", "준비 중인 기능이에요")}>
              잘못된 정보 알려주기
            </button>
          </section>
        )}
      </div>

      <div className="r-action-bar r-place-actionbar">
        <button
          type="button"
          className={`r-button r-button--secondary r-place-actionbar__save ${liked ? "is-liked" : ""}`}
          onClick={save}
          aria-label={saveLabel}
          aria-pressed={liked}
        ><Icon name="heart" filled={liked} /></button>
        <button type="button" className="r-button r-button--primary r-place-actionbar__main" onClick={recordAction.run}>
          <Icon name={hasOwnRecord ? "book" : "plus"} />{recordAction.label}
        </button>
      </div>

      {viewerIndex !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} startIndex={viewerIndex} placeName={place.name} onClose={() => setViewerIndex(null)} />
      )}

      {conversionPrompt && (
        <Sheet
          title={conversionPrompt === "record" ? "방문 기록으로 바꿀까요?" : "내 맛집으로 바꿀까요?"}
          onClose={() => setConversionPrompt(null)}
          className="r-place-sheet"
        >
          <p>{conversionPrompt === "record"
            ? `‘${place.name}’의 장소 정보를 기록 화면에 채워 둘게요. 추천 이유와 방문 정보를 적어 저장하면 내 맛집에서 자동으로 빠져요.`
            : `‘${place.name}’에 직접 남긴 추천 이유, 메뉴, 태그, 방문 정보와 사진을 삭제하고 내 맛집으로 옮겨요.`}</p>
          <div className="r-place-sheet__actions">
            <button type="button" className="r-button r-button--secondary" onClick={() => setConversionPrompt(null)}>취소</button>
            <button type="button" className="r-button r-button--primary" onClick={() => {
              const choice = conversionPrompt;
              setConversionPrompt(null);
              if (choice === "record") actions.startRecordConversion(place);
              else void actions.convertRecordToLike(place);
            }}>{conversionPrompt === "record" ? "기록 화면으로 이동" : "변경하기"}</button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
