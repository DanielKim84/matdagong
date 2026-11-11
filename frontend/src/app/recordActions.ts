import type { Dispatch, SetStateAction } from "react";
import { createPlaceRegisteredNotification } from "../services/community";
import {
  MY_ACTIVITY_CHANGED_EVENT,
  changeRecordVisibility,
  convertLikedPlaceToRecord,
  createPlaceRecord,
  deleteMyPlaceRecord,
  getMyPlaceRecords,
  getPlace,
  getPlaces,
} from "../services/places";
import type { UserNotification } from "../models/community";
import type { NewPlace, Place, Screen } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";
import { go } from "./navigation";

type Context = {
  accessToken: string;
  route: { screen: Screen; id: string };
  /** 지금 지도 검색어. 공개 범위를 바꾼 뒤 같은 검색어로 목록을 다시 받습니다. */
  query: string;
  notify: (notice: AppNotice) => void;
  addNotification: (notification: UserNotification) => void;
  refreshTasters: () => void;
  retryPlaces: () => void;
  setPlaces: Dispatch<SetStateAction<Place[]>>;
  setDetail: Dispatch<SetStateAction<Place | null>>;
  setMyPlaceRecords: Dispatch<SetStateAction<Place[]>>;
  setLikedPlaceIds: Dispatch<SetStateAction<string[]>>;
  setDislikedPlaceIds: Dispatch<SetStateAction<string[]>>;
};

/** 내 기록 저장(하트한 곳은 기록으로 바꾸기)·공개 범위 바꾸기·기록 지우기 동작입니다. App이 그릴 때마다 현재 상태로 만듭니다. */
export function recordActions(context: Context) {
  const { accessToken, route, notify } = context;

  /** 기록을 저장하고 저장된 장소를 돌려줍니다. 새 기록은 상세로 옮기지 않고 호출한 화면이 완료 화면을 그리며, 수정은 상세로 옮깁니다. */
  async function register(place: NewPlace, convertFromPlaceId?: string, isVisitConfirmed = false): Promise<Place> {
    // 등록 화면 주소에 기록 ID가 있으면(#register/<id>) 기존 기록 수정입니다.
    const isEditing = route.screen === "register" && !!route.id;
    try {
      if (convertFromPlaceId && !isVisitConfirmed) {
        throw new Error("직접 방문을 확인한 뒤 등록해 주세요.");
      }
      const created = convertFromPlaceId
        ? await convertLikedPlaceToRecord(accessToken, convertFromPlaceId, place)
        : await createPlaceRecord(accessToken, place);
      // 수정은 새 알림을 만들지 않으므로 알림 저장 실패로 보지 않습니다.
      let isNotificationSaved = true;
      if (!isEditing) {
        try {
          context.addNotification(await createPlaceRegisteredNotification(accessToken, created.id));
        } catch {
          isNotificationSaved = false;
        }
      }
      if (convertFromPlaceId) {
        context.setLikedPlaceIds((current) => current.filter((item) => item !== convertFromPlaceId));
      }
      context.setMyPlaceRecords((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      // 기록은 입맛에 맞았다는 뜻이라 서버가 별로였던 곳 표시를 지웠고, 같은 맛집 맛객과의 신뢰도 달라집니다.
      context.setDislikedPlaceIds((current) => current.filter((item) => item !== created.id));
      context.refreshTasters();
      if (place.visibility === "public")
        context.setPlaces((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      context.setDetail(created);
      if (isEditing) {
        context.retryPlaces();
        // 수정을 마친 상세에서 뒤로 가면 기록 폼 대신 지도로 돌아가도록 경로를 정리합니다.
        go("map", "", true);
        go("place", created.id);
        notify({ kind: "success", title: "맛집 내용을 수정했어요", message: "변경한 내용을 저장했어요." });
      } else if (!isNotificationSaved) {
        // 새 기록은 부른 화면이 완료 화면을 그리므로 알림 저장에 실패했을 때만 따로 알립니다.
        notify({
          kind: "error",
          title: "맛집은 등록했지만 알림 저장에 실패했어요",
          message: "맛집 기록은 저장됐어요. 알림함에는 다시 표시되지 않을 수 있어요.",
        });
      }
      return created;
    } catch (cause) {
      notify({
        kind: "error",
        title: isEditing ? "맛집 내용을 수정하지 못했어요" : "맛집을 등록하지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      });
      throw cause;
    }
  }

  /**
   * 공개 범위 바꾸기·지우기 뒤 내 기록·지도 목록·상세를 다시 받습니다.
   * 변경은 서버에서 이미 끝났으므로 조회가 잠시 실패해도 던지지 않고, 받은 것만 반영합니다(완료 안내는 그대로 띄움).
   */
  async function reloadAfterRecordChange(placeId: string) {
    const [records, placeList, refreshedPlace] = await Promise.allSettled([
      getMyPlaceRecords(accessToken),
      getPlaces(accessToken, context.query.trim()),
      getPlace(accessToken, placeId),
    ]);
    if (records.status === "fulfilled") context.setMyPlaceRecords(records.value);
    if (placeList.status === "fulfilled") context.setPlaces(placeList.value);
    if (refreshedPlace.status === "fulfilled") context.setDetail(refreshedPlace.value);
  }

  /** 내 기록의 공개 범위만 바꿉니다(공개 추천 ↔ 나만 보기). 사진·메뉴·태그·추천 이유는 그대로 남습니다. */
  async function changeOwnRecordVisibility(place: Place, visibility: "PUBLIC" | "PRIVATE") {
    try {
      await changeRecordVisibility(accessToken, [place.id], visibility);
      await reloadAfterRecordChange(place.id);
      notify({
        kind: "success",
        title: visibility === "PRIVATE" ? "나만 보기로 바꿨어요" : "공개 추천으로 바꿨어요",
        message:
          visibility === "PRIVATE"
            ? "남긴 사진·메뉴·태그는 그대로 두고, 이제 나에게만 보여요."
            : "남긴 사진·메뉴·태그 그대로 다른 맛객의 발견과 피드에 보여요.",
      });
    } catch (cause) {
      notify({
        kind: "error",
        title: "공개 범위를 바꾸지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      });
    }
  }

  /** 이 장소의 내 기록을 지우고 목록·상세를 다시 받습니다. 지웠으면 true입니다(확인은 부르는 화면이 먼저 받음). */
  async function deleteOwnRecord(place: Place): Promise<boolean> {
    try {
      await deleteMyPlaceRecord(accessToken, place.id);
    } catch (cause) {
      notify({ kind: "error", title: "기록을 지우지 못했어요", message: errorMessage(cause, RETRY_LATER_MESSAGE) });
      return false;
    }
    await reloadAfterRecordChange(place.id);
    window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
    context.refreshTasters();
    notify({ kind: "success", title: "기록을 지웠어요", message: "남긴 사진·메뉴·태그도 함께 지웠어요." });
    return true;
  }

  return { register, changeOwnRecordVisibility, deleteOwnRecord };
}
