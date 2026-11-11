import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import { diaryEntries, type DiaryEntry } from "./diary";

/** 내 기록을 다이어리 항목으로 바꾼 목록입니다(최근 순). 나 탭·맛집 다이어리가 함께 씁니다. */
export function useDiaryEntries(): DiaryEntry[] {
  const { myRecords, isMyTasterId, photoFor } = useAppData();
  return useMemo(() => diaryEntries(myRecords, isMyTasterId, photoFor), [myRecords, isMyTasterId, photoFor]);
}
