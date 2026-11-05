import { useState } from "react";
import type { RegisterDraftForm } from "../../services/registerDraft";
import type { NewPlace, Taster } from "../../models/place";
import { joinReason, splitReason } from "./recordModel";

/** 한 줄 추천·자세한 이야기(저장할 때 한 필드로 합침)와 공개 범위입니다. */
export function useRecordStory({ draft, editRecord }: { draft?: RegisterDraftForm; editRecord?: Taster }) {
  const [initialReason] = useState(() => splitReason(draft ? draft.reason : (editRecord?.note ?? "")));
  const [headline, setHeadlineValue] = useState(initialReason.headline);
  const [detail, setDetail] = useState(initialReason.detail);
  const [visibility, setVisibility] = useState<NewPlace["visibility"]>(() =>
    draft ? draft.visibility : editRecord?.visibility === "PUBLIC" ? "public" : "private",
  );

  function setHeadline(value: string) {
    // 한 줄 추천에는 줄바꿈을 넣지 않습니다(저장할 때 첫 줄로 구분하기 때문).
    setHeadlineValue(value.replace(/\n/g, " "));
  }

  return {
    headline,
    setHeadline,
    detail,
    setDetail,
    reason: joinReason(headline, detail),
    visibility,
    setVisibility,
  };
}
