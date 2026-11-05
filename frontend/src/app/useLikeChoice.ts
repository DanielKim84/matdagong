import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { setPlaceDisliked, setPlaceLiked } from "../services/places";
import { errorMessage } from "../utils/errorMessage";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";

/** 하트를 누른 장소의 지금 상태: 하트 없음, 가 보고 싶어요, 다녀왔는데 입맛에 맞았어요. */
export type LikeState = "none" | "want" | "tasted";
export type LikeChoice = "want" | "tasted" | "disliked" | "remove";
/** hasVisitProof: 그 가게에 들른 근거(빠른 저장 등)가 있어 '입맛에 맞았어요'·'별로였어요'를 고를 수 있는지 */
export type LikeChoicePrompt = { placeId: string; placeName: string; state: LikeState; hasVisitProof: boolean };

/** 다녀온 맛을 고르려면 있어야 하는 근거입니다. 둘 다 그 가게 근처(1km)에서만 남길 수 있습니다. */
export const VISIT_PROOF_HINT = "가게에서 빠른 저장을 하면 고를 수 있어요. 기록을 남기면 하트 없이도 신뢰에 반영돼요.";
export const VISIT_CHOICES: LikeChoice[] = ["tasted", "disliked"];

/**
 * 상태마다 고를 수 있는 것입니다. 하트는 지도에 마커로 남는 긍정 표시라, 하트가 없을 때는 긍정만 고르고
 * 이미 하트한 곳을 다시 누를 때만 '별로였어요'와 지우기가 나옵니다.
 */
export const LIKE_CHOICES: Record<LikeState, LikeChoice[]> = {
  none: ["want", "tasted"],
  want: ["tasted", "disliked", "remove"],
  tasted: ["disliked", "remove"],
};

const CHOICE_NOTICES: Record<LikeChoice, { title: string; message: string }> = {
  want: {
    title: "가 보고 싶은 곳으로 저장했어요",
    message: "가게에서 빠른 저장을 한 뒤 하트를 다시 누르면 입맛에 맞았는지 고를 수 있어요.",
  },
  tasted: { title: "입맛에 맞은 곳으로 저장했어요", message: "이 맛집을 기록한 맛객과의 신뢰에 반영했어요." },
  disliked: {
    title: "별로였던 곳으로 남겼어요",
    message: "내 맛집에서 빼고, 이 맛집을 기록한 맛객과의 신뢰에 반영했어요.",
  },
  remove: { title: "내 맛집에서 삭제했어요", message: "저장해 둔 맛집에서 제외했어요." },
};

type Options = {
  accessToken: string;
  likedPlaceIds: string[];
  visitedLikedPlaceIds: string[];
  visitProofPlaceIds: string[];
  setLikedPlaceIds: Dispatch<SetStateAction<string[]>>;
  setVisitedLikedPlaceIds: Dispatch<SetStateAction<string[]>>;
  setDislikedPlaceIds: Dispatch<SetStateAction<string[]>>;
  placeNameOf: (placeId: string) => string;
  /** 내 기록이 있는 장소는 이미 내 맛집이라 하트를 쓰지 않습니다(공개 범위는 맛집 상세의 기록 카드에서 바꿈). */
  isOwnRecord: (placeId: string) => boolean;
  notify: (notice: AppNotice) => void;
  /** 신뢰 재료가 바뀌었을 때 맛객 목록(신뢰 %)과 방문 근거를 다시 받습니다. */
  onTrustChanged: () => void;
};

const withId = (id: string) => (current: string[]) => (current.includes(id) ? current : [id, ...current]);
const withoutId = (id: string) => (current: string[]) => current.filter((item) => item !== id);

/**
 * 하트 버튼을 누르면 고르는 시트를 열고, 고른 대로 하트·별로였던 곳을 저장합니다.
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

  function chooseLike(placeId: string): Promise<void> {
    if (options.isOwnRecord(placeId)) {
      notify({
        kind: "info",
        title: "이미 내가 등록한 맛집이에요",
        message: "내가 기록한 맛집은 하트 없이도 내 맛집에 있어요. 공개 범위는 맛집 상세의 내 기록에서 바꿀 수 있어요.",
      });
      return Promise.resolve();
    }
    const state: LikeState = !options.likedPlaceIds.includes(placeId)
      ? "none"
      : options.visitedLikedPlaceIds.includes(placeId)
        ? "tasted"
        : "want";
    finish();
    return new Promise((resolve) => {
      settle.current = resolve;
      setPrompt({
        placeId,
        placeName: options.placeNameOf(placeId),
        state,
        // 입맛에 맞았던 하트는 이미 들른 곳입니다(기록을 옮긴 하트 포함).
        hasVisitProof: state === "tasted" || options.visitProofPlaceIds.includes(placeId),
      });
    });
  }

  function close() {
    setPrompt(null);
    finish();
  }

  async function choose(choice: LikeChoice) {
    if (!prompt || (VISIT_CHOICES.includes(choice) && !prompt.hasVisitProof)) return;
    const { placeId, state } = prompt;
    setPrompt(null);
    try {
      if (choice === "disliked") await setPlaceDisliked(accessToken, placeId, true);
      else await setPlaceLiked(accessToken, placeId, choice !== "remove", choice === "tasted");
      const isLiked = choice === "want" || choice === "tasted";
      options.setLikedPlaceIds(isLiked ? withId(placeId) : withoutId(placeId));
      options.setVisitedLikedPlaceIds(choice === "tasted" ? withId(placeId) : withoutId(placeId));
      options.setDislikedPlaceIds(choice === "disliked" ? withId(placeId) : withoutId(placeId));
      notify({ kind: "success", ...CHOICE_NOTICES[choice] });
      if (choice === "tasted" || choice === "disliked" || state === "tasted") onTrustChanged();
    } catch (cause) {
      notify({
        kind: "error",
        title: "내 맛집을 변경하지 못했어요",
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
        message: "이 맛집을 기록한 맛객과의 신뢰에서도 뺐어요.",
      });
      onTrustChanged();
    } catch (cause) {
      notify({ kind: "error", title: "되돌리지 못했어요", message: errorMessage(cause, RETRY_LATER_MESSAGE) });
    }
  }

  return { prompt, chooseLike, choose, close, undoDislike };
}
