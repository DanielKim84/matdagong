import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState } from "../../components/ui";
import { NEARBY_RADIUS_METERS, type TasterScope } from "./tasterData";
import type { OnDemandLocation } from "./useOnDemandLocation";

const NEARBY_KM = NEARBY_RADIUS_METERS / 1000;

const SCOPE_LABELS: Record<TasterScope, string> = {
  ALL: "전체 지역",
  NEARBY: "내 주변",
  MY_AREA: "내 지역",
  TRAVEL: "여행·드라이브",
};

/**
 * 맛객 탭 추천의 범위 칩 한 줄: 전체 지역 · 내 주변 · 내 지역 · 여행·드라이브. 아래 취향 맞는 맛객과 맛객 둘러보기가 함께 따릅니다.
 * 내 주변은 지금 위치(회사 등), 내 지역은 프로필에 등록한 내 활동 지역(집 등)이라 둘을 따로 둡니다.
 * 내 주변을 고르면 그때 위치를 묻습니다.
 */
export default function TasterScopeChips({
  label,
  value,
  onChange,
  location,
  hasTravel,
}: {
  label: string;
  value: TasterScope;
  onChange: (scope: TasterScope) => void;
  location: OnDemandLocation;
  hasTravel: boolean;
}) {
  const scopes: TasterScope[] = ["ALL", "NEARBY", "MY_AREA", ...(hasTravel ? (["TRAVEL"] as const) : [])];
  return (
    <div className="r-chips r-tasters-chips" role="group" aria-label={label}>
      {scopes.map((scope) => (
        <button
          type="button"
          key={scope}
          className={`r-chip ${value === scope ? "is-on" : ""}`}
          aria-pressed={value === scope}
          onClick={() => {
            onChange(scope);
            if (scope === "NEARBY") location.ensure();
          }}
        >
          {scope === "NEARBY" && <Icon name="locate" />}
          {scope === "MY_AREA" && <Icon name="pin" />}
          {SCOPE_LABELS[scope]}
        </button>
      ))}
    </div>
  );
}

/** 고른 범위로 지금 거를 수 있는지. 내 주변은 위치, 내 지역은 등록한 내 지역이 있어야 합니다. */
export function isScopeReady(scope: TasterScope, location: OnDemandLocation, myArea: string | null): boolean {
  if (scope === "NEARBY") return location.position !== null;
  if (scope === "MY_AREA") return myArea !== null;
  return true;
}

/** 고른 범위를 거를 수 없을 때(isScopeReady가 false) 목록 대신 보여 줄 안내입니다. */
export function ScopeNotice({
  scope,
  location,
  myArea,
}: {
  scope: TasterScope;
  location: OnDemandLocation;
  myArea: string | null;
}) {
  if (scope === "MY_AREA" && !myArea) {
    return (
      <EmptyState
        icon="pin"
        title="내 지역을 먼저 등록해 주세요"
        message="프로필 편집에서 주로 다니는 동네를 등록하면, 지금 어디에 있든 그 동네 맛객을 볼 수 있어요."
        action={{ label: "내 지역 등록하기", onClick: () => go("profile-edit"), variant: "soft" }}
      />
    );
  }
  if (isScopeReady(scope, location, myArea)) return null;
  if (location.location.status === "locating" || location.location.status === "idle") {
    return <EmptyState tone="loading" title="내 위치를 확인하고 있어요…" />;
  }
  const isUnsupported = location.location.status === "unsupported";
  return (
    <EmptyState
      icon="locate"
      title={isUnsupported ? "이 브라우저에서는 위치를 확인할 수 없어요" : "내 위치를 알려 주세요"}
      message={`위치 권한을 허용하면 지금 위치 ${NEARBY_KM}km 안에 기록을 남긴 맛객을 보여 드려요. 집 근처를 미리 보려면 내 지역을 골라 보세요.`}
      action={isUnsupported ? undefined : { label: "내 위치 확인하기", onClick: location.locate }}
    />
  );
}

/** 범위 칩 아래 한 줄 설명입니다. */
export function scopeNote(scope: TasterScope, myArea: string | null): string {
  if (scope === "NEARBY") return `지금 위치 ${NEARBY_KM}km 안`;
  if (scope === "MY_AREA") return myArea ?? "내 지역";
  if (scope === "TRAVEL") return "여행·드라이브 맛객";
  return "지역 상관없이";
}
