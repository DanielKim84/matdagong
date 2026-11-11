import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import PlaceTile from "../../components/PlaceTile";
import { EmptyState, Skeleton, TopBar } from "../../components/ui";
import type { Place } from "../../models/place";

/** 별로였어요를 고르면 무엇이 달라지는지 요약 카드에 붙이는 표시입니다. */
const EFFECTS: { icon: IconName; label: string }[] = [
  { icon: "map-off", label: "지도에서 숨김" },
  { icon: "image", label: "피드에는 그대로" },
  { icon: "user", label: "맛객 신뢰에 반영" },
];

/**
 * 별로였던 곳(#disliked): 하트를 풀며 '다녀왔는데 별로였어요'를 고른 곳입니다. 발견·내 지도의 지도에는 마커가 없고,
 * 피드·스토리·맛객 프로필에는 그대로 보이며 상세에 '별로였어요' 뱃지가 붙습니다.
 * 위에서부터 안내 카드 → 몇 곳인지와 달라지는 점 → 사진 카드 목록 순서로, 어떤 가게였는지 알아보고 되돌리기 쉽게 둡니다.
 * 되돌리면 지도에 다시 보이고, 맛객과의 신뢰에서도 빠집니다.
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
      <TopBar title="별로였던 곳" fallback="my" />
      <div className="r-me-body">
        <p className="r-me-disliked__notice">
          <Icon name="pin-off" />
          <span>
            하트를 풀며 ‘다녀왔는데 별로였어요’를 고른 곳이에요. 발견과 내 지도의 지도에서만 빠지고, 피드에는 그대로
            보여요.
          </span>
        </p>
        {disliked.length ? (
          <>
            <section className="r-card r-me-disliked__summary" aria-label="별로였던 곳 요약">
              <b>
                {disliked.length}
                <small>곳</small>
              </b>
              <ul className="r-me-disliked__effects">
                {EFFECTS.map((effect) => (
                  <li key={effect.label}>
                    <Icon name={effect.icon} />
                    {effect.label}
                  </li>
                ))}
              </ul>
            </section>
            <div className="r-me-grid">
              {disliked.map((place) => (
                <PlaceTile
                  key={place.id}
                  place={place}
                  photo={app.photoFor(place.id)}
                  action={{ label: "되돌리기", icon: "undo", onClick: () => void app.actions.undoDislike(place.id) }}
                />
              ))}
            </div>
          </>
        ) : app.dislikedPlaceIds.length && app.isLoading ? (
          <Skeleton shape="card" count={2} label="별로였던 곳을 불러오고 있어요…" className="r-me-grid" />
        ) : (
          <EmptyState
            icon="map"
            title="아직 별로였던 곳이 없어요"
            message="하트를 풀 때 ‘다녀왔는데 별로였어요’를 고르면 이곳에 모여요. 잘못 골랐다면 여기서 되돌릴 수 있어요."
            action={{ label: "내 지도로 가기", onClick: () => go("mymap"), variant: "primary" }}
            className="r-card r-me-empty"
          />
        )}
      </div>
    </main>
  );
}
