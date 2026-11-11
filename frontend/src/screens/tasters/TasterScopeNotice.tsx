/** 맛객 탭에서 고른 지역을 아직 거를 수 없을 때(위치를 모르거나 내 지역이 없음) 두 섹션 대신 띄우는 안내입니다. */
import { go } from "../../app/navigation";
import { EmptyState } from "../../components/ui";
import { NEARBY_RADIUS_KM, type TasterScope } from "./tasterData";
import type { OnDemandLocation } from "./useOnDemandLocation";

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
      message={`위치 권한을 허용하면 지금 위치 ${NEARBY_RADIUS_KM}km 안에 기록을 남긴 맛객을 보여 드려요. 집 근처를 미리 보려면 내 지역을 골라 보세요.`}
      action={isUnsupported ? undefined : { label: "내 위치 확인하기", onClick: location.locate }}
    />
  );
}
