import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { back, useRoute } from "../../app/navigation";
import { TopBar } from "../../components/ui";
import RecordDone, { type RecordDoneInfo } from "./RecordDone";
import RecordFlow from "./RecordFlow";

/** 기록하기(#register, 수정은 #register/<id>). */
export default function RecordScreen() {
  const app = useAppData();
  const route = useRoute();
  const editPlace = route.id ? app.editablePlace(route.id) : undefined;
  const [done, setDone] = useState<RecordDoneInfo | null>(null);
  const [round, setRound] = useState(0);
  if (done && !route.id) {
    return <RecordDone info={done} onMore={() => { setDone(null); setRound((current) => current + 1); }} />;
  }

  if (route.id && !editPlace?.tasters.some((taster) => taster.tasterId === "me")) {
    return (
      <div className="r-screen r-record">
        <TopBar title="기록 수정" fallback="my" />
        {app.loading ? (
          <div className="r-empty" role="status"><b>기록을 불러오고 있어요</b><p>잠시만 기다려 주세요.</p></div>
        ) : (
          <div className="r-empty">
            <b>수정할 기록을 찾지 못했어요</b>
            <p>{app.error || "삭제됐거나 내 기록이 아닐 수 있어요."}</p>
            <button type="button" className="r-button r-button--secondary r-button--pill" onClick={() => app.error ? app.actions.retry() : back("my")}>
              {app.error ? "다시 불러오기" : "돌아가기"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <RecordFlow
      key={route.id ? `edit:${route.id}` : `new:${round}`}
      editPlace={editPlace}
      editPlaceId={route.id || undefined}
      onSaved={setDone}
    />
  );
}
