import type { ReactNode } from "react";
import { MyPositionMarker, TasterMapMarker } from "../../components/BrandAssets";
import { symbolMarkerHtml, type SymbolMarkerKind } from "../../components/mapMarkerArt";
import SubScreen from "../../components/SubScreen";
import type { MapMe } from "../../models/map";

type GuideRow = { key: string; art: ReactNode; title: string; description: string };

/** 지도와 같은 기호 마커 원본(고정 SVG 문자열)을 그대로 그립니다. */
function SymbolMarker({ kind }: { kind: SymbolMarkerKind }) {
  return (
    <span
      className={`map-category-marker map-category-marker--${kind}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: symbolMarkerHtml(kind) }}
    />
  );
}

/** 왼쪽 작은 지도 그림에 마커를 흩어 둘 자리(가로·세로 %)입니다. 안내 줄 순서대로 씁니다. */
const MAP_SPOTS = [
  { left: "62%", top: "12%" },
  { left: "36%", top: "30%" },
  { left: "8%", top: "52%" },
  { left: "62%", top: "62%" },
  { left: "40%", top: "84%" },
];

/**
 * 지도 마커 안내(보드 05-04 아래쪽, 전체 화면): 왼쪽에 마커를 흩어 둔 작은 지도 그림, 오른쪽에 마커 · 이름 · 한 줄 설명입니다.
 * 정렬은 지도 목록(06-02) 위에서 고르므로 이 화면에는 두지 않습니다.
 * 발견(variant="discover")은 맛객 기록 관계를, 내 지도(variant="mymap")는 가볼 곳·가본 곳·공유 중을 설명합니다.
 */
export default function MarkerGuideScreen({
  me,
  variant = "discover",
  onClose,
}: {
  me?: MapMe;
  variant?: "discover" | "mymap";
  onClose: () => void;
}) {
  const myPosition: GuideRow = {
    key: "me",
    art: me ? <MyPositionMarker {...me} /> : <span className="position-dot" aria-hidden="true" />,
    title: "내 위치",
    description: "지금 있는 위치예요.",
  };
  const discoverRows: GuideRow[] = [
    {
      key: "subscribed",
      art: <TasterMapMarker kind="subscribed" name="구독 중인 맛객" />,
      title: "구독 중인 맛객",
      description: "구독 중인 맛객의 기록이에요.",
    },
    {
      key: "subscribed-trusted",
      art: <TasterMapMarker kind="subscribed" isTrusted name="구독 중인 신뢰 맛객" />,
      title: "구독 중인 신뢰 맛객",
      description: "신뢰 맛객이면서 구독 중인 맛객의 기록이에요.",
    },
    {
      key: "other",
      art: <TasterMapMarker kind="other" name="구독하지 않은 맛객" />,
      title: "구독하지 않은 맛객",
      description: "구독하지 않은 맛객의 기록이에요.",
    },
    {
      key: "other-trusted",
      art: <TasterMapMarker kind="other" isTrusted name="구독하지 않은 신뢰 맛객" />,
      title: "구독하지 않은 신뢰 맛객",
      description: "신뢰 맛객이지만 구독하지 않은 맛객의 기록이에요.",
    },
    myPosition,
  ];
  // 내 지도의 세 갈래(screens/mymap/myMapModel.ts의 MyPlaceCategory)와 같은 묶음·색입니다.
  const myMapRows: GuideRow[] = [
    {
      key: "liked",
      art: <SymbolMarker kind="liked" />,
      title: "가볼 곳",
      description: "하트를 눌러 저장한 곳이에요.",
    },
    {
      key: "visited",
      art: <SymbolMarker kind="visited" />,
      title: "가본 곳",
      description: "기록 없이 다녀온 곳이에요.",
    },
    {
      key: "private",
      art: <TasterMapMarker kind="own" isPrivate name="나만 보는 내 기록" />,
      title: "나만 보는 내 기록",
      description: "기록했지만 나에게만 보여요.",
    },
    {
      key: "shared",
      art: <TasterMapMarker kind="own" name="공유 중인 내 기록" />,
      title: "공유 중",
      description: "다른 사람의 발견 지도에도 보여요.",
    },
    myPosition,
  ];
  const rows = variant === "mymap" ? myMapRows : discoverRows;

  return (
    <SubScreen title="지도 마커 안내" onClose={onClose} className="r-discover-guide">
      <h2 className="r-discover-guide__title">
        지도 마커 안내 <small>({variant === "mymap" ? "내 지도 · 나와의 관계" : "발견 · 맛객 기록 관계"})</small>
      </h2>
      <div className="r-discover-guide__body">
        <div className="r-discover-guide__map" aria-hidden="true">
          {rows.map((row, index) => (
            <span key={row.key} className="r-discover-guide__spot" style={MAP_SPOTS[index]}>
              {row.art}
            </span>
          ))}
        </div>
        <ul className="r-discover-guide__list">
          {rows.map((row) => (
            <li key={row.key} className="r-discover-guide__row">
              <span className="r-discover-guide__art">{row.art}</span>
              <span className="r-discover-guide__copy">
                <b>{row.title}</b>
                <small>{row.description}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SubScreen>
  );
}
