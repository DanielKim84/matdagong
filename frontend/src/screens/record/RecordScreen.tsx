import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { back, useRoute } from "../../app/navigation";
import { EmptyState, TopBar } from "../../components/ui";
import { isMyTaster } from "../../models/place";
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
    return (
      <RecordDone
        info={done}
        onMore={() => {
          setDone(null);
          setRound((current) => current + 1);
        }}
      />
    );
  }

  if (route.id && !editPlace?.tasters.some(isMyTaster)) {
    return (
      <main className="r-screen r-record">
        <TopBar title="기록 수정" fallback="my" />
        {app.loading ? (
          <EmptyState tone="loading" title="기록을 불러오고 있어요" message="잠시만 기다려 주세요." />
        ) : app.error ? (
          <EmptyState
            tone="error"
            title="수정할 기록을 찾지 못했어요"
            message={app.error}
            action={{ label: "다시 불러오기", onClick: app.actions.retry }}
          />
        ) : (
          <EmptyState
            title="수정할 기록을 찾지 못했어요"
            message="삭제됐거나 내 기록이 아닐 수 있어요."
            action={{ label: "돌아가기", onClick: () => back("my") }}
          />
        )}
      </main>
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
