import type { ReactNode } from "react";
import { MyPositionMarker, TasterMapMarker } from "../../components/BrandAssets";
import type { MapMe } from "../../components/MapCanvas";
import { symbolMarkerHtml, type SymbolMarkerKind } from "../../components/mapMarkerArt";
import Sheet from "../../components/Sheet";

type GuideRow = { art: ReactNode; title: string; description: string };

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

/** 마커 한 줄: 실제 지도와 같은 모양의 핀 + 이름 + 설명. */
function GuideItem({ art, title, description }: GuideRow) {
  return (
    <li className="r-discover-guide__row">
      <span className="r-discover-guide__art">{art}</span>
      <span className="r-discover-guide__copy">
        <b>{title}</b>
        <small>{description}</small>
      </span>
    </li>
  );
}

/**
 * 지도 마커 종류를 묶음으로 나눠 보여 주는 안내 시트입니다. 실제 지도와 같은 모양의 마커를 그립니다.
 * 발견(variant="discover")은 맛객 기록만, 내 지도(variant="mymap")는 내 기록·다녀온 곳·가볼 곳을 설명합니다.
 */
export default function MarkerGuideSheet({
  me,
  variant = "discover",
  onClose,
}: {
  me?: MapMe;
  variant?: "discover" | "mymap";
  onClose: () => void;
}) {
  const myPosition: GuideRow = {
    art: me ? <MyPositionMarker {...me} /> : <span className="position-dot" aria-hidden="true" />,
    title: "내 위치",
    description: "내 캐릭터가 서 있는 곳이에요. 발밑 파란 원이 실제 위치예요.",
  };
  const discoverGroups: { title: string; rows: GuideRow[] }[] = [
    {
      title: "맛객 기록",
      rows: [
        {
          art: <TasterMapMarker kind="subscribed" name="구독 중인 맛객" />,
          title: "구독 중인 맛객",
          description: "하트 표식이 붙은 코랄 핀이에요.",
        },
        {
          art: <TasterMapMarker kind="subscribed" isTrusted name="구독 중인 신뢰 맛객" />,
          title: "구독 중인 신뢰 맛객",
          description: "같은 맛집에서 입맛이 맞아 신뢰가 80% 넘게 쌓인 구독 맛객이에요. 하트 대신 별이 붙어요.",
        },
        {
          art: <TasterMapMarker kind="other" name="구독하지 않은 맛객" />,
          title: "구독하지 않은 맛객",
          description: "아직 구독하지 않은 맛객의 기록이에요.",
        },
        {
          art: <TasterMapMarker kind="other" isTrusted name="구독하지 않은 신뢰 맛객" />,
          title: "구독하지 않은 신뢰 맛객",
          description: "신뢰가 80% 넘게 쌓였지만 아직 구독하지 않은 맛객이에요. 주황 별이 붙어요.",
        },
      ],
    },
    { title: "그 밖에", rows: [myPosition] },
  ];
  const myMapGroups: { title: string; rows: GuideRow[] }[] = [
    {
      title: "가본 곳",
      rows: [
        {
          art: <TasterMapMarker kind="own" name="내 기록 · 공개" />,
          title: "내 기록 · 공개",
          description: "체크 표식이 붙은 보라 핀이에요. 다른 사람의 발견 지도에도 보여요.",
        },
        {
          art: <TasterMapMarker kind="own" isPrivate name="내 기록 · 나만 보기" />,
          title: "내 기록 · 나만 보기",
          description: "자물쇠 표식이 붙은 보라 핀이에요. 나에게만 보여요.",
        },
        {
          art: <SymbolMarker kind="visited" />,
          title: "다녀온 곳",
          description: "가게에서 빠른 저장했거나 기록을 지운 곳이에요. 가볼 곳에 하트한 뒤 다녀온 곳도 이 표시예요.",
        },
      ],
    },
    {
      title: "가볼 곳",
      rows: [
        {
          art: <SymbolMarker kind="liked" />,
          title: "가볼 곳",
          description: "하트를 눌러 저장한 곳이에요. 가 보고 기록하면 내 기록으로 바뀌어요.",
        },
      ],
    },
    { title: "그 밖에", rows: [myPosition] },
  ];
  const groups = variant === "mymap" ? myMapGroups : discoverGroups;

  return (
    <Sheet title="지도 마커 안내" onClose={onClose} className="r-discover-guide">
      <p className="r-discover-guide__intro">
        핀 색과 표식으로 기록 종류를 구분해요. 맛객이 프로필 사진을 올렸으면 캐릭터 대신 사진이 보여요.
      </p>
      {groups.map((group) => (
        <section key={group.title} className="r-discover-guide__group" aria-label={group.title}>
          <h3 className="r-discover-guide__group-title">{group.title}</h3>
          <ul className="r-discover-guide__list">
            {group.rows.map((row) => (
              <GuideItem key={row.title} {...row} />
            ))}
          </ul>
        </section>
      ))}
    </Sheet>
  );
}
