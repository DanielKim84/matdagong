import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { setPlaceDisliked, setPlaceLiked } from "../services/places";
import type { Place } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { checkVisitNow, visitCheckMessage } from "../utils/visitCheck";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";

/** 하트를 풀 때 고르는 것: 다녀왔는데 별로였어요, 그냥 빼기 */
export type LikeChoice = "disliked" | "remove";
export type LikeChoicePrompt = {
  placeId: string;
  placeName: string;
};

const CHOICE_NOTICES: Record<LikeChoice, { title: string; message: string }> = {
  disliked: {
    title: "별로였던 곳으로 남겼어요",
    message: "지도에서 뺐어요. 나 탭의 별로였던 곳에서 되돌릴 수 있어요.",
  },
  remove: { title: "가볼 곳에서 뺐어요", message: "하트를 지웠어요. 발견에 다시 보여요." },
};

type Options = {
  accessToken: string;
  likedPlaceIds: string[];
  visitProofPlaceIds: string[];
  setLikedPlaceIds: Dispatch<SetStateAction<string[]>>;
  setDislikedPlaceIds: Dispatch<SetStateAction<string[]>>;
  /** 시트 제목과 별로였어요의 거리 확인에 쓸 장소입니다. 찾지 못하면 undefined입니다. */
  placeOf: (placeId: string) => Place | undefined;
  /** 내 기록이 있는 장소는 이미 내 맛집이라 하트를 쓰지 않습니다(공개 범위는 상세의 기록 카드나 내 맛집 모음에서 바꿈). */
  isOwnRecord: (placeId: string) => boolean;
  notify: (notice: AppNotice) => void;
  /** 신뢰 재료가 바뀌었을 때 맛객 목록(신뢰 %)과 방문 근거를 다시 받습니다. */
  onTrustChanged: () => void;
};

const withId = (id: string) => (current: string[]) => (current.includes(id) ? current : [id, ...current]);
const withoutId = (id: string) => (current: string[]) => current.filter((item) => item !== id);

/**
 * 하트 버튼: 빈 하트를 누르면 바로 가볼 곳(가 보고 싶어요)으로 저장하고, 찬 하트를 누르면
 * '다녀왔는데 별로였어요'와 '가볼 곳에서 빼기' 두 가지를 고르는 시트를 엽니다.
 * 별로였어요는 직접 다녀온 곳만 고를 수 있어, 방문 근거가 없으면 지금 위치가 가게 근처인지 확인합니다(서버도 다시 확인).
 * chooseLike는 시트가 닫히고 저장이 끝나야 끝나므로, 스토리처럼 자동으로 넘어가는 화면은 그동안 멈춰 둘 수 있습니다.
 */
export function useLikeChoice(options: Options) {
  const { accessToken, notify, onTrustChanged } = options;
  const [prompt, setPrompt] = useState<LikeChoicePrompt | null>(null);
  const settle = useRef<(() => void) | null>(null);

  function finish() {
    settle.current?.();
    settle.current = null;
  }

  async function saveWish(placeId: string) {
    try {
      await setPlaceLiked(accessToken, placeId, true);
      options.setLikedPlaceIds(withId(placeId));
      options.setDislikedPlaceIds(withoutId(placeId));
      notify({ kind: "success", title: "가볼 곳에 저장했어요", message: "내 지도의 가볼 곳에서 다시 볼 수 있어요." });
    } catch (cause) {
      notify({
        kind: "error",
        title: "가볼 곳에 저장하지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      });
    }
  }

  function chooseLike(placeId: string): Promise<void> {
    if (options.isOwnRecord(placeId)) {
      notify({
        kind: "info",
        title: "이미 내가 등록한 맛집이에요",
        message: "내가 기록한 맛집은 하트 없이도 내 맛집에 있어요. 공개 범위는 맛집 상세의 내 기록에서 바꿀 수 있어요.",
      });
      return Promise.resolve();
    }
    if (!options.likedPlaceIds.includes(placeId)) return saveWish(placeId);
    finish();
    setPrompt({
      placeId,
      placeName: options.placeOf(placeId)?.name ?? "이 맛집",
    });
    return new Promise((resolve) => {
      settle.current = resolve;
    });
  }

  function close() {
    setPrompt(null);
    finish();
  }

  async function choose(choice: LikeChoice) {
    if (!prompt) return;
    const { placeId } = prompt;
    setPrompt(null);
    try {
      if (choice === "disliked") {
        // 빠른 저장·다녀온 곳처럼 들른 근거가 있으면 위치 없이 남깁니다. 없으면 지금 위치를 함께 보냅니다.
        // 장소 정보를 찾지 못하면 거리를 잴 수 없어 위치 없이 보내고, 서버의 거절 문구를 그대로 알립니다.
        const hasVisitProof = options.visitProofPlaceIds.includes(placeId);
        const place = options.placeOf(placeId);
        const check = hasVisitProof || !place ? null : await checkVisitNow(place);
        if (check && check.status !== "near") {
          notify({
            kind: "info",
            title: "직접 다녀온 곳만 별로였다고 남길 수 있어요",
            message: visitCheckMessage(check.status),
          });
          return;
        }
        await setPlaceDisliked(accessToken, placeId, true, check?.device ?? null);
      } else {
        await setPlaceLiked(accessToken, placeId, false);
      }
      options.setLikedPlaceIds(withoutId(placeId));
      if (choice === "disliked") options.setDislikedPlaceIds(withId(placeId));
      notify({ kind: "success", ...CHOICE_NOTICES[choice] });
      if (choice === "disliked") onTrustChanged();
    } catch (cause) {
      notify({
        kind: "error",
        title: "하트를 바꾸지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      });
    } finally {
      finish();
    }
  }

  async function undoDislike(placeId: string) {
    try {
      await setPlaceDisliked(accessToken, placeId, false);
      options.setDislikedPlaceIds(withoutId(placeId));
      notify({
        kind: "success",
        title: "별로였던 곳에서 뺐어요",
        message: "지도에 다시 보이고, 이 맛집을 기록한 맛객과의 신뢰에서도 뺐어요.",
      });
      onTrustChanged();
    } catch (cause) {
      notify({ kind: "error", title: "되돌리지 못했어요", message: errorMessage(cause, RETRY_LATER_MESSAGE) });
    }
  }

  return { prompt, chooseLike, choose, close, undoDislike };
}
