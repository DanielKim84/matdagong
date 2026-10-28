import { useState } from "react";
import type { NewPlace, Place, VisitCondition } from "../models/place";
import { back, go } from "../app/navigation";
import { Avatar, FoodPhoto } from "../components/BrandAssets";
import { Rating } from "../components/PlaceTile";
import Icon from "../components/Icon";

type Props = {
  place: Place;
  own?: NewPlace;
  liked: boolean;
  onLike: () => void;
  onMessage: (message: string) => void;
};

export default function PlaceScreen({ place, own, liked, onLike, onMessage }: Props) {
  const [tab, setTab] = useState("소개");
  const [selectedTasterId, setSelectedTasterId] = useState(() => own ? "me" : place.tasters[0]?.tasterId ?? "");
  const tabs = ["소개", "메뉴·방문", "사진", "위치 정보"];
  const selectedTaster = place.tasters.find((taster) => taster.tasterId === selectedTasterId);
  // 추천 이유, 메뉴, 사진, 조건은 선택한 맛객의 개별 기록에서만 가져옵니다.
  const authorMenus = (selectedTaster?.menus ?? (selectedTasterId === "me" ? own?.menus : undefined) ?? [])
    .map((menu) => typeof menu === "string" ? { name: menu } : menu)
    .filter((menu) => menu.name.trim());
  const authorPhotos = selectedTaster?.photos ?? (selectedTasterId === "me" ? own?.photos : undefined) ?? [];
  const authorTags = selectedTaster?.tags ?? (selectedTasterId === "me" ? own?.tags : undefined) ?? [];
  const authorConditions = selectedTaster?.visitConditions ?? (selectedTasterId === "me" ? own?.visitConditions : undefined) ?? [];
  const kakaoUrl = place.providerUrl;

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
      <div className={`place-hero ${authorPhotos.length ? "has-cover" : "no-cover"}`}>
        {authorPhotos[0] ? <img src={authorPhotos[0]} alt={`${selectedTaster?.tasterName ?? "맛객"}이 등록한 ${place.name} 사진`} /> : <><FoodPhoto place={place} className="place-hero-fallback" /><div className="place-cover-empty"><span><Icon name="camera" /></span><b>{place.name}</b><small>맛객의 사진이 아직 없어요</small></div></>}
        <button className="photo-back icon-button" onClick={() => back("map")} aria-label="이전 화면으로 돌아가기"><Icon name="back" /></button>
        <div className="hero-photo-actions">
          <button aria-label="사진 보기" onClick={() => setTab("사진")}><Icon name="image" /></button>
        </div>
        {authorPhotos.length > 0 && <span className="photo-count"><Icon name="image" />1/{authorPhotos.length}</span>}
      </div>
      <section className="place-info">
        <div className="place-heading">
          <h1>{place.name}</h1>
          <div>
            <button className={liked ? "red" : ""} onClick={onLike} aria-label={liked ? "내 맛집에서 삭제" : "내 맛집에 추가"} aria-pressed={liked}><Icon name="heart" filled={liked} /></button>
            <button onClick={share} aria-label="맛집 공유"><Icon name="share" /></button>
          </div>
        </div>
        <Rating count={place.recordCount} />
        <p className="place-line"><Icon name="pin" />{place.address}</p>
        {place.providerPhone && <p className="place-line"><Icon name="phone" /><a href={`tel:${place.providerPhone}`}>{place.providerPhone}</a></p>}
        {place.category && <p className="place-category-line">{place.category}</p>}
        <div className="detail-tabs" role="tablist" aria-label="맛집 정보">
          {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}
        </div>
        {tab === "소개" && <>
          <section className="detail-section">
            <h2>이 맛집을 추천한 맛객</h2>
            <div className="place-tasters">
              {place.tasters.map((taster) => <article key={taster.tasterId} className={selectedTasterId === taster.tasterId ? "selected" : ""}>
                <button className="place-taster-record" aria-pressed={selectedTasterId === taster.tasterId} onClick={() => setSelectedTasterId(taster.tasterId)}>
                  <Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                  <span><b>{taster.tasterName}</b><small>{taster.tag}</small></span>
                  {selectedTasterId === taster.tasterId && <Icon name="check" />}
                </button>
                <button className="place-taster-profile" onClick={() => go("profile", taster.tasterId)} aria-label={`${taster.tasterName} 프로필 보기`}><Icon name="chevron" /></button>
              </article>)}
            </div>
          </section>
          <section className="detail-section selected-taster-note">
            <h2>{selectedTaster ? `${selectedTaster.tasterName}님의 추천 이유` : "추천 이유"}</h2>
            <p>{selectedTaster?.note ?? own?.reason ?? place.recentNote}</p>
            {authorTags.length > 0 && <div className="place-hashtags">{authorTags.slice(0, 5).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          </section>
          {authorPhotos.length > 0 && <section className="detail-section">
            <div className="detail-section-heading"><h2>사진 미리보기</h2><button onClick={() => setTab("사진")}>사진 전체 보기 <Icon name="chevron" /></button></div>
            <div className="place-photo-grid">{authorPhotos.slice(0, 3).map((photo, index) => <img src={photo} alt={`${selectedTaster?.tasterName ?? "맛객"} 등록 사진 ${index + 1}`} key={`${photo}-${index}`} />)}</div>
          </section>}
        </>}
        {tab === "메뉴·방문" && <>
          <section className="detail-section"><h2>{selectedTaster ? `${selectedTaster.tasterName}님이 추천하는 메뉴` : "추천 메뉴"}</h2>
            {authorMenus.length ? <ul className="menu-list">{authorMenus.map((menu, index) => <li key={`${menu.name}-${index}`}><span>{menu.name}</span>{menu.price != null && <b>{menu.price.toLocaleString()}원</b>}</li>)}</ul> : <p>이 맛객이 추천 메뉴를 등록하지 않았어요.</p>}
          </section>
          <section className="detail-section"><h2>방문 기록</h2>
            {authorConditions.length ? <div className="place-visit-conditions">{authorConditions.map((condition: VisitCondition) => <span key={condition}>{condition}</span>)}</div> : <p>이 맛객이 남긴 방문 조건이 없어요.</p>}
          </section>
        </>}
        {tab === "사진" && <section className="detail-section"><h2>{selectedTaster?.tasterName ?? "맛객"}님의 사진</h2>
          {authorPhotos.length ? <div className="place-photo-gallery">{authorPhotos.map((photo, index) => <img src={photo} alt={`${selectedTaster?.tasterName ?? "맛객"} 등록 사진 ${index + 1}`} key={`${photo}-${index}`} />)}</div> : <div className="place-no-photos"><Icon name="image" /><p>이 맛객이 등록한 사진이 아직 없어요.</p></div>}
        </section>}
        {tab === "위치 정보" && <section className="detail-section place-location-details">
          <h2>위치 정보</h2><p>{place.address}</p>
          {place.providerPlaceId && <small className="muted-caption">카카오 장소 정보</small>}
          <div className="place-location-actions">
            <button className="outline-button" onClick={() => go("map")}><Icon name="pin" /> 지도에서 보기</button>
            <a className="outline-button" href={kakaoUrl || `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`} target="_blank" rel="noreferrer"><Icon name="route" /> 카카오 길찾기</a>
          </div>
        </section>}
      </section>
    </main>
  );
}
