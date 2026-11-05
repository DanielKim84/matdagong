import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import TasteScore from "../../components/TasteScore";
import type { Taster } from "../../models/place";
import { isTrustedTaster } from "../../models/trust";
import { formatNumber } from "../../utils/format";
import { activityLabel, type TasterStats } from "./tasterData";
import TasterAvatar from "../../components/TasterAvatar";

/** 맛객 목록 줄: 아바타, 이름, 기록 수·구독자 수, 오른쪽에 구독 상태나 신뢰·취향 %(믿고 가는 맛객이면 등급 우선) */
export default function TasterRows({ tasters, stats }: { tasters: Taster[]; stats: Map<string, TasterStats> }) {
  const app = useAppData();
  return (
    <div className="r-card r-tasters-list">
      {tasters.map((taster) => {
        const count = stats.get(taster.tasterId)?.count ?? taster.placeCount ?? 0;
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
            </span>
            {isSubscribed && !isTrustedTaster(taster) ? (
              <span className="r-tag r-tag--mine">구독 중</span>
            ) : (
              <TasteScore taster={taster} />
            )}
          </button>
        );
      })}
    </div>
  );
}
