import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import type { Taster } from "../../models/place";
import { formatNumber } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { activityLabel, type TasterStats } from "./tasterData";

/** 맛객 목록 줄: 아바타, 이름, 기록 수·구독자 수, 오른쪽에 구독 상태나 취향 일치율 */
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
            <Avatar
              className="r-tasters-avatar r-tasters-avatar--md"
              src={avatarSource(taster.tasterId, taster.avatar)}
              fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
              name={taster.tasterName}
              variant={taster.avatarVariant}
            />
            <span className="r-row__copy">
              <b>{taster.tasterName}</b>
              <small>
                기록 {formatNumber(count)}곳 · 구독자 {formatNumber(taster.subscriberCount)}
                {area ? ` · ${area}` : ""}
              </small>
            </span>
            {isSubscribed ? (
              <span className="r-tasters-state">구독 중</span>
            ) : taster.matchScore ? (
              <span className="r-match">취향 {taster.matchScore}%</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
