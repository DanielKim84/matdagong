import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState, PageIntro, TopBar } from "../../components/ui";
import { placeNeighborhood, placePhoto } from "../../models/place";
import { categoryLabel } from "../../utils/format";

/**
 * 최근 본 곳(#recent, 보드 14-02): 뒤로 버튼만 있는 바, 큰 제목과 설명, 회색 안내 상자 아래 최근에 연 맛집 줄(사진 · 이름 · "분류 · 동네" · >)입니다.
 * 보드의 날짜 띠(오늘 · 어제 · 날짜)는 서버가 열어 본 시각을 주지 않아 아직 두지 않고, 최근 연 순서대로만 보여 줍니다.
 */
export default function RecentScreen() {
  const app = useAppData();
  return (
    <main className="r-screen r-me-collections">
      <TopBar title="최근 본 곳" fallback="my" variant="plain" />
      <div className="r-me-body">
        <PageIntro title="최근 본 곳" message="최근에 열람한 맛집으로 돌아가세요." />
        <p className="r-info-note">
          <Icon name="info" />
          최근 열람은 방문 사실을 뜻하지 않습니다.
        </p>
        {app.recentPlaces.length ? (
          <ul className="r-collection-rows">
            {app.recentPlaces.map((place) => (
              <li key={place.id} className="r-collection-row">
                <button type="button" className="r-collection-row__main" onClick={() => go("place", place.id)}>
                  <span className="r-collection-row__photo">
                    <PlaceThumb
                      place={place}
                      photo={placePhoto(place, undefined, app.photoFor(place.id))}
                      fallback="icon"
                    />
                  </span>
                  <span className="r-collection-row__copy">
                    <b>{place.name}</b>
                    <small>
                      {[categoryLabel(place.category).split(" · ")[0], placeNeighborhood(place)]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <Icon name="chevron" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="clock"
            title="최근 본 맛집이 없어요"
            message="맛집 상세를 열어 보면 이곳에 차례로 남아요."
            action={{ label: "맛집 둘러보기", onClick: () => go("home"), variant: "primary" }}
            className="r-me-empty"
          />
        )}
      </div>
    </main>
  );
}
