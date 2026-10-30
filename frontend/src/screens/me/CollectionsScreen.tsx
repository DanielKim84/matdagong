import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go, useRoute } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceTile from "../../components/PlaceTile";
import { Segmented, TopBar } from "../../components/ui";
import type { Place } from "../../models/place";

type Tab = "saved" | "recent";

/** 내 맛집 모음: 저장한 곳(#saved, 예전 주소 #liked)과 최근 본 곳(#recent)을 탭으로 오갑니다. */
export default function CollectionsScreen() {
  const app = useAppData();
  const route = useRoute();
  const tab: Tab = route.screen === "recent" ? "recent" : "saved";
  const [visitedOnly, setVisitedOnly] = useState(false);

  const lookup = [...app.places, ...app.privatePlaces, ...app.myRecords, ...app.recentPlaces];
  const savedIds = [...new Set(app.likedPlaceIds)];
  const saved = savedIds
    .map((id) => lookup.find((place) => place.id === id))
    .filter((place): place is Place => !!place);
  const visitedSaved = saved.filter((place) => app.visitedLikedPlaceIds.includes(place.id));
  const places = tab === "recent" ? app.recentPlaces : visitedOnly ? visitedSaved : saved;

  return (
    <main className="r-screen r-me-collections">
      <TopBar title="내 맛집 모음" fallback="my" />
      <div className="r-me-body">
        <Segmented<Tab>
          label="모음 구분"
          value={tab}
          onChange={(next) => go(next, "", true)}
          options={[
            { value: "saved", label: `저장한 곳 ${savedIds.length}` },
            { value: "recent", label: `최근 본 곳 ${app.recentPlaces.length}` },
          ]}
        />
        {tab === "saved" && visitedSaved.length > 0 && (
          <div className="r-chips" role="group" aria-label="저장한 곳 거르기">
            <button type="button" className={`r-chip ${!visitedOnly ? "is-on" : ""}`} aria-pressed={!visitedOnly} onClick={() => setVisitedOnly(false)}>
              전체 {saved.length}
            </button>
            <button type="button" className={`r-chip ${visitedOnly ? "is-on" : ""}`} aria-pressed={visitedOnly} onClick={() => setVisitedOnly(true)}>
              <Icon name="check" /> 다녀온 곳 {visitedSaved.length}
            </button>
          </div>
        )}
        {places.length ? (
          <div className="r-me-grid">
            {places.map((place) => (
              <PlaceTile
                key={place.id}
                place={place}
                liked={app.likedPlaceIds.includes(place.id)}
                onLike={() => void app.actions.toggleLike(place.id)}
                photo={app.photoFor(place.id)}
              />
            ))}
          </div>
        ) : tab === "saved" && savedIds.length > 0 ? (
          app.loading ? (
            <p className="r-empty r-muted" role="status">저장한 맛집을 불러오고 있어요…</p>
          ) : (
            <div className="r-card r-empty">
              <b>저장한 맛집 정보를 찾지 못했어요</b>
              <p>잠시 후 다시 불러와 주세요.</p>
              <button type="button" className="r-button r-button--secondary r-button--pill" onClick={app.actions.retry}>
                다시 불러오기
              </button>
            </div>
          )
        ) : (
          <div className="r-card r-empty">
            <span className="r-badge-icon"><Icon name={tab === "recent" ? "clock" : "heart"} /></span>
            <b>{tab === "recent" ? "최근 본 맛집이 없어요" : "아직 저장한 맛집이 없어요"}</b>
            <p>
              {tab === "recent"
                ? "맛집 상세를 열어 보면 이곳에 차례로 남아요."
                : "마음에 드는 맛집의 하트를 누르면 이곳에 모여요."}
            </p>
            <button type="button" className="r-button r-button--primary r-button--pill" onClick={() => go("home")}>
              맛집 둘러보기
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
