import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import type { Taster } from "../../models/place";
import { formatNumber } from "../../utils/format";
import { activityLabel, introOf, recordCountOf, type TasterStats } from "./tasterData";

/**
 * 맛객 목록 줄(보드 08-01·08-02): 큰 얼굴, 이름 옆 신뢰·취향 칩, 그 아래 지역 · 기록 수, 소개 한마디, 오른쪽 > 입니다.
 * 구독 중인 맛객은 이름 줄 끝에 "구독 중"을 붙입니다. 카드 바탕 없이 줄 사이를 옅은 선으로 나눕니다.
 */
export default function TasterRows({ tasters, stats }: { tasters: Taster[]; stats: Map<string, TasterStats> }) {
  const app = useAppData();
  return (
    <ul className="r-tasters-list">
      {tasters.map((taster) => {
        const count = recordCountOf(taster, stats);
        const area = activityLabel(taster);
        const isSubscribed = app.subscriptionIds.includes(taster.tasterId);
        return (
          <li key={taster.tasterId}>
            <button type="button" className="r-tasters-row" onClick={() => go("profile", taster.tasterId)}>
              <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--lg" />
              <span className="r-tasters-row__copy">
                <span className="r-tasters-row__name">
                  <b>{taster.tasterName}</b>
                  <TasteScore taster={taster} />
                  {isSubscribed && <span className="r-tag r-tag--mine">구독 중</span>}
                </span>
                <small>{[area, `기록 ${formatNumber(count)}곳`].filter(Boolean).join(" · ")}</small>
                <span className="r-tasters-row__intro">“{introOf(taster)}”</span>
              </span>
              <Icon name="chevron" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
