import { useState } from "react";
import { RETRY_LATER_MESSAGE, useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { kakaoPlaceFromPlace } from "../../services/places";
import type { Place } from "../../models/place";
import { errorMessage } from "../../utils/errorMessage";
import { STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import { checkVisitNow, visitCheckMessage } from "../../utils/visitCheck";
import { isKakaoOnlyPlaceId } from "./kakaoPlaceDetail";

/**
 * 맛집 상세 아래 버튼 줄의 동작(내 기록 남기기, 하트)입니다. isBusy는 위치 확인·가볼 곳 저장 중이라 버튼을 막아 둘 때입니다.
 * isVisited: 다녀온 곳(빠른 저장·기록한 적 있는 곳). 위치 확인 없이 기록할 수 있습니다.
 */
export function usePlaceDetailActions(place: Place, isVisited: boolean) {
  const { actions, visitProofPlaceIds } = useAppData();
  const [isBusy, setIsBusy] = useState(false);

  /**
   * 이 가게를 채운 채 기록하기의 사진·메뉴 단계부터 엽니다. 직접 다녀온 곳만 기록할 수 있어, 다녀온 근거가 없으면
   * 지금 위치가 가게 근처인지 확인하고 멀면 기록 화면에 들어가지 않고 알립니다. 기록을 저장할 때 서버가 거리를 다시 확인합니다.
   */
  async function startNewRecord() {
    const kakaoPlace = kakaoPlaceFromPlace(place);
    if (!kakaoPlace) {
      actions.notify({
        kind: "info",
        title: "기록하기에서 가게를 골라 주세요",
        message: "이 맛집은 바로 이어 갈 수 없어요. 기록하기에서 지금 위치 근처의 가게를 골라 기록해 주세요.",
      });
      return;
    }
    const hasVisitProof = isVisited || visitProofPlaceIds.includes(place.id);
    if (!hasVisitProof) {
      setIsBusy(true);
      const check = await checkVisitNow(place);
      setIsBusy(false);
      if (check.status !== "near") {
        actions.notify({
          kind: "info",
          title: "직접 다녀온 곳만 기록할 수 있어요",
          message: visitCheckMessage(check.status),
        });
        return;
      }
    }
    writeStorageJson(STORAGE_KEYS.placeDetailHandoff, { place: kakaoPlace }, "session");
    go("register");
  }

  /** 하트: 맛다공에 아직 없는 카카오 가게는 가볼 곳으로 저장하면서 맛다공 장소가 되므로 그 장소의 상세로 바꿉니다. */
  async function toggleLike() {
    const kakaoPlace = isKakaoOnlyPlaceId(place.id) ? kakaoPlaceFromPlace(place) : null;
    if (!kakaoPlace) {
      void actions.chooseLike(place.id);
      return;
    }
    setIsBusy(true);
    try {
      const saved = await actions.saveWishPlace(kakaoPlace);
      actions.notify({
        kind: "success",
        title: "가볼 곳에 저장했어요",
        message: "내 지도의 가볼 곳에서 다시 볼 수 있어요.",
      });
      go("place", saved.id, true);
    } catch (cause) {
      actions.notify({
        kind: "error",
        title: "가볼 곳에 저장하지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      });
    } finally {
      setIsBusy(false);
    }
  }

  return { isBusy, startNewRecord, toggleLike };
}
