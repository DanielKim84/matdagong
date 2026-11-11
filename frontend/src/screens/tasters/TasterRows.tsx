import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import type { Taster } from "../../models/place";
import { formatNumber } from "../../utils/format";
import { activityLabel, recordCountOf, type TasterStats } from "./tasterData";

/**
 * 맛객 목록 줄: 아바타, 이름, 기록 수·구독자 수, 그 아래 신뢰·취향 칩, 오른쪽에 구독 중 표시.
 * 칩을 이름 옆에 두면 이름이 잘려서 아래 줄에 둡니다.
 */
export default function TasterRows({ tasters, stats }: { tasters: Taster[]; stats: Map<string, TasterStats> }) {
  const app = useAppData();
  return (
    <div className="r-card r-tasters-list">
      {tasters.map((taster) => {
        const count = recordCountOf(taster, stats);
        const area = activityLabel(taster);
        const isSubscribed = app.subscriptionIds.includes(taster.tasterId);
        return (
          <button type="button" className="r-row" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
            <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--md" />
            <span className="r-row__copy">
              <b>{taster.tasterName}</b>
              <small>
                기록 {formatNumber(count)}곳 · 구독자 {formatNumber(taster.subscriberCount)}
                {area ? ` · ${area}` : ""}
              </small>
              <TasteScore taster={taster} />
            </span>
            {isSubscribed && <span className="r-tag r-tag--mine">구독 중</span>}
          </button>
        );
      })}
    </div>
  );
}
