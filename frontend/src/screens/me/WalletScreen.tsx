import { useAppData } from "../../app/AppData";
import Icon, { type IconName } from "../../components/Icon";
import { EmptyState, SectionHead, TopBar } from "../../components/ui";
import { formatMonthDay, formatNumber } from "../../utils/format";

// 포인트는 충전하지 않고 활동(유료 구독 수익 등)으로만 쌓입니다. 쌓인 포인트를 쓰는 방법들입니다.
const PENDING_ACTIONS: { label: string; icon: IconName; tone: "amber" | "brand" }[] = [
  { label: "정산 신청", icon: "check", tone: "brand" },
  { label: "구독료로 쓰기", icon: "bookmark", tone: "amber" },
  { label: "상품권 교환", icon: "star", tone: "amber" },
  { label: "맛객 후원", icon: "heart", tone: "brand" },
];

/** 포인트 지갑(#wallet): 잔액과 적립·사용 내역. 정산·구독료 결제·교환·후원은 준비 중입니다. */
export default function WalletScreen() {
  const app = useAppData();
  const { balance, history } = app.points;

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
        <section className="r-card r-me-balance" aria-label="보유 포인트">
          <span>사용할 수 있는 포인트</span>
          <b>
            {formatNumber(balance)} <small>P</small>
          </b>
          <span>내 기록을 유료로 구독하는 사람이 늘면 포인트가 쌓여요</span>
        </section>

        <div className="r-me-tiles">
          {PENDING_ACTIONS.map((action) => (
            <button
              type="button"
              key={action.label}
              className={`r-card r-me-tile r-me-tile--${action.tone === "amber" ? "amber-icon" : "default"}`}
              onClick={() => notifyPending(action.label)}
            >
              <span className="r-badge-icon r-me-tile__icon">
                <Icon name={action.icon} />
              </span>
              <span className="r-me-tile__label">{action.label}</span>
              <small className="r-me-tile__caption">준비 중</small>
            </button>
          ))}
        </div>

        <section className="r-me-section">
          <SectionHead title="내역" meta={history.length > 0 && `${formatNumber(history.length)}건`} />
          {history.length ? (
            <div className="r-card r-me-list">
              {history.map((entry) => (
                <div className="r-row" key={entry.historyId}>
                  <span className="r-row__copy">
                    <b>{entry.title}</b>
                    <small>
                      {formatMonthDay(entry.createdAt)}
                      {entry.memo ? ` · ${entry.memo}` : ""}
                    </small>
                  </span>
                  <b className={`r-me-amount ${entry.amount > 0 ? "is-plus" : "is-minus"}`}>
                    {entry.amount > 0 ? "+" : ""}
                    {formatNumber(entry.amount)}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="clock"
              title="아직 포인트 내역이 없어요"
              message="포인트가 쌓이거나 쓰이면 이곳에 기록돼요."
              className="r-card r-me-empty"
            />
          )}
        </section>
      </div>
    </main>
  );
}
