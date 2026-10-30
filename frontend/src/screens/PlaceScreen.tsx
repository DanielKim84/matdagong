import { useState } from "react";
import { VISIT_CONDITION_GROUPS, type NewPlace, type Place, type VisitCondition } from "../models/place";
import { back, go } from "../app/navigation";
import { Avatar, FoodPhoto } from "../components/BrandAssets";
import { demoTasterAvatar } from "../utils/profileMedia";
import { Rating } from "../components/PlaceTile";
import Icon, { type IconName } from "../components/Icon";
import Sheet from "../components/Sheet";
import PaginationDots from "../components/PaginationDots";
import { swipeHandlers, wrapIndex } from "../utils/swipe";

const visitGroupIcons: Record<string, IconName> = {
  "주차": "pin",
  "영업 시간": "clock",
  "응대 경험": "message",
  "이용 안내": "check",
};

const tasteGroupIcons: Record<string, IconName> = {
  CUISINE: "fork",
  TASTE: "heart",
  CAFE: "coffee",
  OCCASION: "route",
};

type Props = {
  place: Place;
  /** 아직 서버로 옮기지 못한 이전 브라우저 등록 기록입니다(services/activity.ts). 있으면 내 기록으로 보여줍니다. */
  own?: NewPlace;
  subscribedTasterIds: string[];
  liked: boolean;
  canConvertLikedToRecord: boolean;
  onLike: () => void;
  onConvertToRecord: () => void;
  onConvertToLike: () => void;
  onEditRecord: () => void;
  onMessage: (message: string) => void;
};

export default function PlaceScreen({ place, own, subscribedTasterIds, liked, canConvertLikedToRecord, onLike, onConvertToRecord, onConvertToLike, onEditRecord, onMessage }: Props) {
  const availableTasters = own && !place.tasters.some((taster) => taster.tasterId === "me")
    ? [...place.tasters, {
      tasterId: "me", tasterName: "내 기록", tag: "내 맛집", avatar: "", avatarVariant: 1, note: own.reason,
      menus: own.menus, photos: own.photos, tags: own.tags, visitConditions: own.visitConditions, placeCount: 1,
    }]
    : place.tasters;
  // 먼저 구독 중인 맛객을 보여주고, 같은 그룹 안에서는 취향 점수와 구독자 수로 정렬합니다.
  const rankedTasters = [...availableTasters].sort((left, right) => {
    const leftSubscribed = subscribedTasterIds.includes(left.tasterId) ? 1 : 0;
    const rightSubscribed = subscribedTasterIds.includes(right.tasterId) ? 1 : 0;
    return rightSubscribed - leftSubscribed
      || (right.matchScore ?? 0) - (left.matchScore ?? 0)
      || (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0)
      || left.tasterName.localeCompare(right.tasterName, "ko");
  });
  const [tab, setTab] = useState("소개");
  const [selectedTasterId, setSelectedTasterId] = useState(() => own || place.tasters.some((taster) => taster.tasterId === "me")
    ? "me" : rankedTasters[0]?.tasterId ?? "");
  const [tasterPickerOpen, setTasterPickerOpen] = useState(false);
  const [conversionPrompt, setConversionPrompt] = useState<"record" | "like" | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [menuViewerIndex, setMenuViewerIndex] = useState<number | null>(null);
  const tabs = ["소개", "메뉴", "사진", "위치 정보"];
  const selectedTaster = rankedTasters.find((taster) => taster.tasterId === selectedTasterId);
  const selectedTasterIsSubscribed = !!selectedTaster && subscribedTasterIds.includes(selectedTaster.tasterId);
  const hasOwnRecord = !!own || availableTasters.some((taster) => taster.tasterId === "me");
  const recommenderCount = Math.max(place.recordCount, rankedTasters.filter((taster) => taster.visibility !== "PRIVATE").length);
  // 추천 이유, 메뉴, 사진, 조건은 선택한 맛객의 개별 기록에서만 가져옵니다.
  const authorMenus = (selectedTaster?.menus ?? (selectedTasterId === "me" ? own?.menus : undefined) ?? [])
    .map((menu) => typeof menu === "string" ? { name: menu } : menu)
    .filter((menu) => menu.name.trim());
  const authorPhotos = selectedTaster?.photos ?? (selectedTasterId === "me" ? own?.photos : undefined) ?? [];
  const authorTags = selectedTaster?.tags ?? (selectedTasterId === "me" ? own?.tags : undefined) ?? [];
  const authorTagGroups = selectedTaster?.tagGroups ?? (selectedTasterId === "me" ? own?.tagGroups : undefined) ?? {};
  const tagCategoryLabels: Record<string, string> = { CUISINE: "음식 종류", TASTE: "맛과 메뉴", CAFE: "카페·디저트", OCCASION: "방문 스타일" };
  // 구분값 도입 전 저장된 기록과 샘플 기록은 이름으로 분류를 복원해 한 카드에 몰리지 않게 합니다.
  const legacyTagGroups: Record<string, string> = {
    "한식": "CUISINE", "일식": "CUISINE", "중식": "CUISINE", "양식": "CUISINE", "분식": "CUISINE", "집밥·가정식": "CUISINE", "백반": "CUISINE",
    "커피": "CAFE", "베이커리": "CAFE", "디저트": "CAFE", "차": "CAFE", "케이크": "CAFE", "브런치": "CAFE", "빙수": "CAFE",
    "가성비": "OCCASION", "혼밥": "OCCASION", "데이트": "OCCASION", "가족 외식": "OCCASION", "아이와 함께": "OCCASION", "어르신과 함께": "OCCASION", "조용한 곳": "OCCASION", "뷰 좋은 곳": "OCCASION", "주차 편리": "OCCASION", "단체 모임": "OCCASION", "반려동물 동반": "OCCASION",
  };
  const normalizedTagGroups = Object.fromEntries(authorTags.map((tag) => {
    const storedGroup = authorTagGroups[tag];
    const group = storedGroup === "MENU" ? "TASTE" : storedGroup === "VISIT" ? "OCCASION" : storedGroup;
    return [tag, group && tagCategoryLabels[group] ? group : legacyTagGroups[tag] ?? "TASTE"];
  }));
  const groupedTags = Object.entries(tagCategoryLabels).map(([group, title]) => ({
    group, title, tags: authorTags.filter((tag) => normalizedTagGroups[tag] === group),
  })).filter(({ tags }) => tags.length > 0);
  const authorConditions = selectedTaster?.visitConditions ?? (selectedTasterId === "me" ? own?.visitConditions : undefined) ?? [];
  const conditionGroups = VISIT_CONDITION_GROUPS.map((group) => ({
    title: group.title,
    conditions: group.conditions.filter((condition) => authorConditions.includes(condition)),
  })).filter((group) => group.conditions.length > 0);
  const groupedConditions = new Set(conditionGroups.flatMap((group) => group.conditions));
  const otherConditions = authorConditions.filter((condition) => !groupedConditions.has(condition));
  const kakaoPlaceUrl = place.providerPlaceId
    ? `http://m.map.kakao.com/scheme/place?id=${encodeURIComponent(place.providerPlaceId)}`
    : `http://m.map.kakao.com/scheme/look?p=${place.latitude},${place.longitude}`;
  const kakaoRouteUrl = (origin?: GeolocationCoordinates) => {
    const originQuery = origin ? `sp=${origin.latitude},${origin.longitude}&` : "";
    return `http://m.map.kakao.com/scheme/route?${originQuery}ep=${place.latitude},${place.longitude}&by=car`;
  };
  const openKakaoDirections = () => {
    const openRoute = (origin?: GeolocationCoordinates) => {
      window.location.href = origin
        ? kakaoRouteUrl(origin)
        : `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(({ coords }) => openRoute(coords), () => openRoute(), { timeout: 5000, maximumAge: 60000 });
    } else openRoute();
  };
  function avatarSource(taster: typeof rankedTasters[number]) {
    const source = taster.avatar?.trim();
    if (!source) return demoTasterAvatar(taster.tasterId) ?? undefined;
    if (/^demo-avatar:\d$/.test(source)) return source;
    if (/^(https?:|data:image\/|blob:|\/media\/)/.test(source)) return source;
    // 장소 서비스의 샘플 기록은 이미지 URL 대신 한 글자 이니셜을 avatar로 돌려주므로 기본 캐릭터를 씁니다.
    const demoAvatar = demoTasterAvatar(taster.tasterId);
    return demoAvatar ?? undefined;
  }

  function avatarFallback(taster: typeof rankedTasters[number]) {
    const fallback = demoTasterAvatar(taster.tasterId);
    return fallback && fallback !== avatarSource(taster) ? fallback : undefined;
  }

  function renderTasterBadge(tasterId: string) {
    return subscribedTasterIds.includes(tasterId) ? (
      <span className="place-taster-subscribed"><Icon name="heart" filled /> 구독 중</span>
    ) : null;
  }

  function renderSelectedTaster() {
    return (
      <div className="detail-author-selector">
        <div className="detail-author-identity">
          <Avatar src={selectedTaster ? avatarSource(selectedTaster) : undefined} fallbackSrc={selectedTaster ? avatarFallback(selectedTaster) : undefined} name={selectedTaster?.tasterName ?? "맛객"} variant={selectedTaster?.avatarVariant} />
          <span><small>현재 보고 있는 기록</small><b>{selectedTaster?.tasterName ?? "맛객 기록"}</b></span>
          {selectedTasterIsSubscribed && renderTasterBadge(selectedTaster!.tasterId)}
        </div>
        <button type="button" onClick={() => setTasterPickerOpen(true)}>맛객 변경 <Icon name="chevron" /></button>
      </div>
    );
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onMessage("맛집 링크를 복사했어요.");
    } catch {
      onMessage("주소창의 링크를 복사해 공유해 주세요.");
    }
  }

  return (
    <main className="place-screen">
      <div className={`place-hero ${authorPhotos.length ? "has-cover" : "no-cover"}`} {...swipeHandlers(
        (step) => setHeroIndex((current) => wrapIndex(current, step, authorPhotos.length)),
        { enabled: authorPhotos.length > 1, markSwiped: true },
      )}>
        {authorPhotos.length ? <div className="place-hero-slide-track" onClick={(event) => {
          const parent = event.currentTarget.parentElement as HTMLDivElement | null;
          if (parent?.dataset.swiped === "true") { parent.dataset.swiped = "false"; event.preventDefault(); return; }
          setGalleryOpen(true);
        }} onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setGalleryOpen(true);
          }
        }} role="button" tabIndex={0} aria-label="맛집 사진 목록 보기" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
          {authorPhotos.map((photo, index) => <img src={photo} alt={`${selectedTaster?.tasterName ?? "맛객"}이 등록한 ${place.name} 사진 ${index + 1}`} loading={index === heroIndex ? "eager" : "lazy"} decoding="async" key={`${photo}-${index}`} />)}
        </div> : <FoodPhoto place={place} className="place-hero-fallback" />}
        <button className="photo-back icon-button" onClick={() => back("map")} aria-label="이전 화면으로 돌아가기"><Icon name="back" /></button>
        {authorPhotos.length > 0 && <>
          {authorPhotos.length > 1 && <PaginationDots activeIndex={heroIndex} total={authorPhotos.length} onSelect={setHeroIndex} className="photo-slide-indicators--hero-below" />}
        </>}
      </div>
      <section className="place-info">
        <div className="place-summary-panel">
          <div className="place-heading">
            <h1>{place.name}</h1>
            <div>
              <button
                className={`place-like-button ${liked ? "is-liked" : ""}`}
                onClick={() => hasOwnRecord ? setConversionPrompt("like") : onLike()}
                aria-label={hasOwnRecord ? "내 맛집으로 변경" : liked ? "내 맛집에서 삭제" : "내 맛집에 추가"}
                aria-pressed={liked}
              ><Icon name="heart" filled={liked} /></button>
              <button className="place-share-button" onClick={share} aria-label="맛집 공유"><Icon name="share" /></button>
            </div>
          </div>
          <Rating count={recommenderCount} />
          <p className="place-line"><Icon name="pin" />{place.address}</p>
          {place.providerPhone && <p className="place-line"><Icon name="phone" /><a href={`tel:${place.providerPhone}`}>{place.providerPhone}</a></p>}
          {place.category && <p className="place-category-line">{place.category}</p>}
        </div>
        <div className="detail-tabs" role="tablist" aria-label="맛집 정보">
          {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        </div>
        <section className="detail-section detail-author-section">
          <div className="detail-section-heading"><h2>이 맛집을 추천한 맛객</h2><small><b>{recommenderCount}</b><i>명</i></small></div>
          {selectedTaster && renderSelectedTaster()}
        </section>
        {tab === "소개" && <>
          <section className="detail-section selected-taster-note">
            <h2>{selectedTaster ? `${selectedTaster.tasterName}님의 추천 이유` : "추천 이유"}</h2>
            <p>{selectedTaster?.note ?? own?.reason ?? place.recentNote}</p>
          </section>
          <section className="detail-section detail-record-section">
            <div className="detail-record-heading"><div><h2>맛집 스타일</h2><small>분류별로 이 맛객이 고른 특징을 확인해요.</small></div></div>
            {groupedTags.length ? <div className="place-tag-category-list">{groupedTags.map(({ group, title, tags }) => <article className={`place-tag-category place-tag-category--${group.toLowerCase()}`} key={group}>
              <header><span className="place-tag-category-icon"><Icon name={tasteGroupIcons[group] ?? "heart"} /></span><b>{title}</b><small><b>{tags.length}</b><i>개</i></small></header><div>{tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
            </article>)}</div> : <p>등록한 맛집 스타일 태그가 없어요.</p>}
          </section>
          <section className="detail-section detail-record-section">
            <div className="detail-record-heading"><div><h2>{selectedTaster ? `${selectedTaster.tasterName}님의 매장 이용 정보` : "매장 이용 정보"}</h2><small>방문 전에 확인하면 좋은 정보예요.</small></div></div>
            {authorConditions.length ? <div className="place-condition-groups">
              {conditionGroups.map((group) => <article className="place-condition-card" key={group.title}>
                <header><span><Icon name={visitGroupIcons[group.title] ?? "check"} /></span><b>{group.title}</b><small><b>{group.conditions.length}</b><i>개</i></small></header>
                <div>{group.conditions.map((condition: VisitCondition) => <span key={condition}>{condition}</span>)}</div>
              </article>)}
              {otherConditions.length > 0 && <article className="place-condition-card">
                <header><span><Icon name="check" /></span><b>기타 정보</b><small><b>{otherConditions.length}</b><i>개</i></small></header>
                <div>{otherConditions.map((condition) => <span key={condition}>{condition}</span>)}</div>
              </article>}
            </div> : <p>이 맛객이 확인한 매장 이용 정보가 아직 없어요.</p>}
          </section>
        </>}
        {tab === "메뉴" && <>
          <section className="detail-section">
            <h2>{selectedTaster ? `${selectedTaster.tasterName}님이 추천하는 메뉴` : "추천 메뉴"}</h2>
            {authorMenus.length ? <div className="recommended-menu-list">{authorMenus.map((menu, index) => <button type="button" className="recommended-menu-list-card" key={`${menu.name}-${index}`} aria-label={`${menu.name} 메뉴 사진 크게 보기`} onClick={() => setMenuViewerIndex(index)}>
              <div className="recommended-menu-list-image">{menu.photo ? <img src={menu.photo} alt={`${menu.name} 사진`} loading="lazy" decoding="async" /> : <span><Icon name="fork" /></span>}</div>
              <div className="recommended-menu-list-copy"><small>추천 메뉴</small><b>{menu.name}</b>{menu.price != null && <strong>{menu.price.toLocaleString()}원</strong>}</div>
            </button>)}</div> : <p>이 맛객이 추천 메뉴를 등록하지 않았어요.</p>}
          </section>
        </>}
        {tab === "사진" && <section className="detail-section">
          <h2>{selectedTaster ? `${selectedTaster.tasterName}님의 사진` : "맛객 사진"}</h2>
          {authorPhotos.length ? <div className="place-photo-gallery">{authorPhotos.map((photo, index) => <button type="button" onClick={() => { setHeroIndex(index); setPhotoViewerOpen(true); }} aria-label={`${index + 1}번째 사진 크게 보기`} key={`${photo}-${index}`}><img src={photo} alt={`${selectedTaster?.tasterName ?? "맛객"} 등록 사진 ${index + 1}`} loading="lazy" decoding="async" /></button>)}</div> : <div className="place-no-photos"><Icon name="image" /><p>이 맛객이 등록한 사진이 아직 없어요.</p></div>}
        </section>}
        {tab === "위치 정보" && <section className="detail-section place-location-details">
          <h2>위치 정보</h2><p>{place.address}</p>
          {place.providerPlaceId && <small className="muted-caption">카카오 장소 정보</small>}
          <small className="place-coordinate-line">위도 {place.latitude.toFixed(5)} · 경도 {place.longitude.toFixed(5)}</small>
          <div className="place-location-actions">
            <a className="outline-button" href={kakaoPlaceUrl} target="_blank" rel="noreferrer"><Icon name="pin" /> 지도에서 보기</a>
            <button type="button" className="outline-button" onClick={openKakaoDirections}><Icon name="route" /> 카카오 길찾기</button>
          </div>
        </section>}
        {(hasOwnRecord || (liked && canConvertLikedToRecord)) && <div className={`place-record-conversion ${hasOwnRecord ? "is-owner-conversion" : "is-like-conversion"}`}>
          <span>{hasOwnRecord ? "직접 작성한 기록을 수정하거나 내 맛집으로 바꿀 수 있어요." : "직접 방문한 기록이에요. 맛집 등록으로 다시 전환할 수 있어요."}</span>
          {hasOwnRecord ? <>
            <button type="button" className="outline-button" onClick={onEditRecord}>내용 수정하기</button>
            <button type="button" className="outline-button" onClick={() => setConversionPrompt("like")}>내 맛집으로 변경</button>
          </> : canConvertLikedToRecord && <button type="button" className="outline-button" onClick={() => setConversionPrompt("record")}>맛집 등록으로 변경</button>}
        </div>}
        {liked && !canConvertLikedToRecord && !hasOwnRecord && <p className="like-not-visited-note">하트로 저장한 맛집은 방문 기록이 아니에요. 직접 방문 후 맛집 등록에서 방문 기록을 남길 수 있어요.</p>}
      </section>
      {conversionPrompt && <Sheet
        title={conversionPrompt === "record" ? "방문 기록으로 바꿀까요?" : "내 맛집으로 바꿀까요?"}
        onClose={() => setConversionPrompt(null)}
        className="place-conversion-sheet"
      >
        <p>{conversionPrompt === "record"
          ? `‘${place.name}’의 장소 정보를 등록 화면에 채워둘게요. 추천 이유와 내 방문 정보를 작성해 저장하면 내 맛집에서 자동으로 빠집니다.`
          : `‘${place.name}’에 직접 작성한 추천 이유, 메뉴, 태그, 방문 정보와 사진을 삭제하고 내 맛집으로 옮깁니다.`}</p>
        <div className="sheet-actions">
          <button type="button" className="outline-button" onClick={() => setConversionPrompt(null)}>취소</button>
          <button type="button" className="primary-button" onClick={() => {
            const choice = conversionPrompt;
            setConversionPrompt(null);
            if (choice === "record") onConvertToRecord();
            else onConvertToLike();
          }}>{conversionPrompt === "record" ? "등록 화면으로 이동" : "변경하기"}</button>
        </div>
      </Sheet>}
      {galleryOpen && <Sheet title={`${place.name} 사진`} onClose={() => setGalleryOpen(false)} className="place-gallery-sheet">
        <p>{selectedTaster?.tasterName ?? "맛객"}이 이 맛집에 남긴 사진이에요.</p>
        <div className="place-photo-gallery">{authorPhotos.map((photo, index) => <button key={`${photo}-${index}`} onClick={() => { setHeroIndex(index); setGalleryOpen(false); setPhotoViewerOpen(true); }} aria-label={`${index + 1}번째 사진 크게 보기`}><img src={photo} alt={`${place.name} 사진 ${index + 1}`} /></button>)}</div>
      </Sheet>}
      {photoViewerOpen && authorPhotos.length > 0 && <Sheet title={`${place.name} 사진 ${heroIndex + 1}/${authorPhotos.length}`} onClose={() => setPhotoViewerOpen(false)} className="place-photo-viewer">
        <div className="place-photo-viewer-stage" {...swipeHandlers(
          (step) => setHeroIndex((current) => wrapIndex(current, step, authorPhotos.length)),
          { enabled: authorPhotos.length > 1 },
        )}><div className="place-photo-viewer-track" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>{authorPhotos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${place.name} 사진 ${index + 1}`} />)}</div></div>
        {authorPhotos.length > 1 && <PaginationDots activeIndex={heroIndex} total={authorPhotos.length} onSelect={setHeroIndex} />}
      </Sheet>}
      {menuViewerIndex !== null && authorMenus[menuViewerIndex] && <Sheet title={`${authorMenus[menuViewerIndex].name} 사진`} onClose={() => setMenuViewerIndex(null)} className="place-menu-viewer">
        <div className="place-menu-viewer-stage" {...swipeHandlers(
          (step) => setMenuViewerIndex((index) => wrapIndex(index!, step, authorMenus.length)),
          { enabled: authorMenus.length > 1 },
        )}>
          <div className="place-menu-viewer-photo">
            <div className="place-menu-viewer-track" style={{ transform: `translateX(-${menuViewerIndex * 100}%)` }}>{authorMenus.map((menu, index) => <div className="place-menu-viewer-slide" key={`${menu.name}-${index}`}>
              {menu.photo
                ? <img src={menu.photo} alt={`${menu.name} 사진 크게 보기`} />
                : <div><Icon name="fork" /><span>등록된 메뉴 사진이 없어요.</span></div>}
            </div>)}</div>
          </div>
          <section><b>{authorMenus[menuViewerIndex].name}</b>{authorMenus[menuViewerIndex].price != null && <strong>{authorMenus[menuViewerIndex].price!.toLocaleString()}원</strong>}</section>
        </div>
        {authorMenus.length > 1 && <PaginationDots activeIndex={menuViewerIndex ?? 0} total={authorMenus.length} onSelect={setMenuViewerIndex} label="메뉴 사진 페이지" />}
      </Sheet>}
      {tasterPickerOpen && (
        <div className="taster-picker-backdrop" onMouseDown={() => setTasterPickerOpen(false)}>
          <section className="taster-picker" role="dialog" aria-modal="true" aria-labelledby="taster-picker-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><small>{place.name}</small><h2 id="taster-picker-title">기록한 맛객 선택</h2></div><button className="icon-button" onClick={() => setTasterPickerOpen(false)} aria-label="닫기"><Icon name="close" /></button></header>
            <p>선택한 맛객의 추천 이유, 메뉴, 방문 정보와 사진을 보여드려요.</p>
            <div className="taster-picker-list">
              {rankedTasters.map((taster) => <article key={taster.tasterId} className={selectedTasterId === taster.tasterId ? "selected" : ""}>
                  <button className="taster-picker-select" aria-pressed={selectedTasterId === taster.tasterId} onClick={() => { setSelectedTasterId(taster.tasterId); setHeroIndex(0); setTasterPickerOpen(false); }}>
                  <Avatar src={avatarSource(taster)} fallbackSrc={avatarFallback(taster)} name={taster.tasterName} variant={taster.avatarVariant} />
                  <span className="taster-picker-copy"><b>{taster.tasterName}</b><small className="taster-picker-intro" title={taster.intro || undefined}>{taster.intro?.trim() || "맛있는 가게를 직접 기록하고 추천해요."}</small><small className="taster-picker-summary" aria-label={`등록한 맛집 ${taster.placeCount ?? 0}곳, 메뉴 ${taster.menus?.length ?? 0}개, 사진 ${taster.photos?.length ?? 0}장`}><Icon name="pin" /> 맛집 {taster.placeCount ?? 0} · 메뉴 {taster.menus?.length ?? 0} · 사진 {taster.photos?.length ?? 0}</small></span>
                  {renderTasterBadge(taster.tasterId)}
                  {selectedTasterId === taster.tasterId && <Icon name="check" />}
                </button>
                {taster.tasterId !== "me" && <button className="taster-picker-profile" onClick={() => go("profile", taster.tasterId)} aria-label={`${taster.tasterName} 프로필 보기`}><Icon name="chevron" /></button>}
              </article>)}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
