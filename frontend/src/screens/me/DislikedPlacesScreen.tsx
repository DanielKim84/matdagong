import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState, PageIntro, Skeleton, TopBar } from "../../components/ui";
import { placeNeighborhood, placePhoto, type Place } from "../../models/place";
import { categoryLabel } from "../../utils/format";

/**
 * 별로였던 곳(#disliked, 보드 14-04): 하트를 풀며 '다녀왔는데 별로였어요'를 고른 곳입니다. 발견·내 지도의 지도에는 마커가 없고,
 * 피드·스토리·맛객 프로필에는 그대로 보이며 상세에 '별로였어요' 뱃지가 붙습니다.
 * 큰 제목과 설명, 회색 안내 상자, 가게 줄(사진 · 이름 · "분류 · 동네" · "별로였어요" · 오른쪽 "되돌리기") 순서입니다.
 * 되돌리면 지도에 다시 보이고, 맛객과의 신뢰(경험 엇갈림)에서도 빠집니다.
 */
export default function DislikedPlacesScreen() {
  const app = useAppData();
  const known = new Map([...app.places, ...app.recentPlaces].map((place) => [place.id, place]));
  const disliked = app.dislikedPlaceIds.flatMap((id): Place[] => {
    const place = known.get(id);
    return place ? [place] : [];
  });

  return (
    <main className="r-screen r-me-disliked">
      <TopBar title="별로였던 곳" fallback="my" variant="plain" />
      <div className="r-me-body">
        <PageIntro title="별로였던 곳" message="지도에서 뺀 곳을 확인하고 되돌릴 수 있어요." />
        <p className="r-info-note r-me-disliked__notice">
          <Icon name="info" />
          <span>
            <b>되돌리면 경험 엇갈림에서도 빠집니다.</b>
            다른 맛객의 기록 자체를 지우는 기능은 아닙니다.
          </span>
        </p>
        {disliked.length ? (
          <ul className="r-collection-rows">
            {disliked.map((place) => (
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
                    <em className="is-disliked">별로였어요</em>
                  </span>
                </button>
                <button
                  type="button"
                  className="r-me-disliked__undo"
                  onClick={() => void app.actions.undoDislike(place.id)}
                >
                  <Icon name="undo" />
                  되돌리기
                </button>
              </li>
            ))}
          </ul>
        ) : app.dislikedPlaceIds.length && app.isLoading ? (
          <Skeleton shape="row" count={2} label="별로였던 곳을 불러오고 있어요…" />
        ) : (
          <EmptyState
            icon="map"
            title="아직 별로였던 곳이 없어요"
            message="하트를 풀 때 ‘다녀왔는데 별로였어요’를 고르면 이곳에 모여요. 잘못 골랐다면 여기서 되돌릴 수 있어요."
            action={{ label: "내 지도로 가기", onClick: () => go("mymap"), variant: "primary" }}
            className="r-me-empty"
          />
        )}
      </div>
    </main>
  );
}
