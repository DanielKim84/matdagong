import { useState } from "react";
import { useAppData } from "../../app/AppData";
import Icon, { type IconName } from "../../components/Icon";
import { EmptyState, PageIntro, SectionHead, TopBar } from "../../components/ui";

// 포인트는 충전하지 않고 활동(유료 구독 수익 등)으로만 쌓입니다. 쌓인 포인트를 쓰는 방법들입니다(보드 16-04 세 칸).
const PENDING_ACTIONS: { label: string; icon: IconName }[] = [
  { label: "교환하기", icon: "undo" },
  { label: "후원하기", icon: "heart" },
  { label: "구독료 사용", icon: "bookmark" },
];

type HistoryFilter = "all" | "plus" | "minus";
const HISTORY_FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "plus", label: "적립" },
  { value: "minus", label: "사용" },
];

/**
 * 포인트 지갑(#wallet, 보드 16-04): 큰 제목과 설명, 연한 코랄 잔액 상자(동전 · 내 포인트 · 큰 숫자), 회색 "준비 중" 세 칸
 * (교환하기 · 후원하기 · 구독료 사용), "포인트 내역"과 전체 · 적립 · 사용 칩입니다.
 * 포인트는 아직 없어(다공 공통 포인트 서버 dagong-point를 붙일 때 연결, docs/point-security.md) 서버를 부르지 않고
 * 잔액 0P와 "준비 중" 빈 내역만 보여 줍니다. 보드의 내역 줄(+·− 동그라미 · 제목 · 날짜 · 금액)은 서버를 붙일 때 그립니다.
 */
export default function WalletScreen() {
  const app = useAppData();
  const [filter, setFilter] = useState<HistoryFilter>("all");

  function notifyPending(label: string) {
    app.actions.notify({
      kind: "info",
      title: `${label} 기능은 준비 중이에요`,
      message: "기능이 열리면 이곳에서 바로 이용할 수 있어요.",
    });
  }

  return (
    <main className="r-screen r-me-wallet">
      <TopBar title="포인트 지갑" fallback="my" />
      <div className="r-me-body">
        <PageIntro title="포인트 지갑" message="맛다공 활동으로 모은 포인트를 확인하세요." />
        <section className="r-me-balance" aria-label="보유 포인트">
          <span className="r-me-balance__icon" aria-hidden="true">
            <Icon name="coins" />
          </span>
          <span className="r-me-balance__copy">
            <span>내 포인트</span>
            <b>
              0<small>P</small>
            </b>
          </span>
        </section>

        <div className="r-me-tiles">
          {PENDING_ACTIONS.map((action) => (
            <button type="button" key={action.label} className="r-me-tile" onClick={() => notifyPending(action.label)}>
              <Icon name={action.icon} />
              <span className="r-me-tile__label">{action.label}</span>
              <small className="r-me-tile__caption">준비 중</small>
            </button>
          ))}
        </div>

        <section className="r-me-section">
          <SectionHead title="포인트 내역">
            <div className="r-chips" role="group" aria-label="내역 거르기">
              {HISTORY_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`r-chip ${filter === option.value ? "is-on" : ""}`}
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </SectionHead>
          <EmptyState
            icon="clock"
            title="포인트는 준비 중이에요"
            message="적립이 시작되면 이곳에 포인트 내역이 쌓여요."
            className="r-me-empty"
          />
        </section>
      </div>
    </main>
  );
}
