import { MyPositionMarker, TasterMapMarker } from "../../components/BrandAssets";
import type { MapMe } from "../../components/MapCanvas";
import { categoryMarkerHtml } from "../../components/mapMarkerArt";
import Sheet from "../../components/Sheet";

type TasterMarkerKind = "subscribed" | "matched" | "other" | "own";

const TASTER_MARKERS: { kind: TasterMarkerKind; title: string; description: string }[] = [
  { kind: "subscribed", title: "구독 중인 맛객", description: "하트 표식이 붙은 코랄 핀이에요." },
  { kind: "matched", title: "취향이 맞는 맛객", description: "반짝이 표식이 붙은 초록 핀이에요." },
  { kind: "other", title: "다른 맛객", description: "아직 구독하지 않은 맛객의 기록이에요." },
  { kind: "own", title: "내가 기록한 맛집", description: "체크 표식이 붙은 보라 핀이에요." },
];

/** 발견 지도에 나오는 마커 종류를 한눈에 보여 주는 안내 시트입니다. 실제 지도와 같은 모양의 마커를 그립니다. */
export default function MarkerGuideSheet({ me, onClose }: { me?: MapMe; onClose: () => void }) {
  return (
    <Sheet title="지도 마커 안내" onClose={onClose} className="r-discover-guide">
      <p className="r-discover-guide__intro">
        핀 색과 표식으로 기록 종류를 구분해요. 맛객이 프로필 사진을 올렸으면 캐릭터 대신 사진이 보여요.
      </p>
      <ul className="r-discover-guide__list">
        {TASTER_MARKERS.map((marker) => (
          <li key={marker.kind} className="r-discover-guide__row">
            <span className="r-discover-guide__art">
              <TasterMapMarker kind={marker.kind} name={marker.title} />
            </span>
            <span className="r-discover-guide__copy">
              <b>{marker.title}</b>
              <small>{marker.description}</small>
            </span>
          </li>
        ))}
        <li className="r-discover-guide__row">
          <span className="r-discover-guide__art">
            {/* 지도와 같은 마커 원본(고정 SVG 문자열)을 그대로 씁니다. */}
            <span
              className="map-category-marker map-category-marker--liked"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: categoryMarkerHtml("liked") }}
            />
          </span>
          <span className="r-discover-guide__copy">
            <b>저장한 맛집</b>
            <small>하트로 저장해 둔 맛집이에요.</small>
          </span>
        </li>
        <li className="r-discover-guide__row">
          <span className="r-discover-guide__art">
            <span className="map-cluster-marker" aria-hidden="true">
              3
            </span>
          </span>
          <span className="r-discover-guide__copy">
            <b>여러 곳이 모인 곳</b>
            <small>숫자만큼 맛집이 모여 있어요. 누르면 지도가 가까워져요.</small>
          </span>
        </li>
        <li className="r-discover-guide__row">
          <span className="r-discover-guide__art">
            {me ? <MyPositionMarker {...me} /> : <span className="position-dot" aria-hidden="true" />}
          </span>
          <span className="r-discover-guide__copy">
            <b>내 위치</b>
            <small>내 캐릭터가 서 있는 곳이에요. 발밑 파란 원이 실제 위치예요.</small>
          </span>
        </li>
      </ul>
    </Sheet>
  );
}
