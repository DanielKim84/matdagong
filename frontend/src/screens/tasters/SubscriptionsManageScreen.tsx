import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { Segmented, TopBar } from "../../components/ui";
import { IncomingList, SubscribedList } from "./SubscriptionLists";
import { formatDate } from "./tasterData";

type Tab = "subscribed" | "incoming";

/** 구독 관리(#subscriptions): 내가 구독한 맛객과 나를 구독한 사람. */
export default function SubscriptionsManageScreen() {
  const app = useAppData();
  const [tab, setTab] = useState<Tab>("subscribed");
  const freeCount = app.subscriptions.filter((item) => item.subscriptionType === "FREE").length;
  const paidCount = app.subscriptions.length - freeCount;
  // 가장 먼저 끝나는 유료 구독을 요약 카드에 보여 줍니다.
  const nextEnd = app.subscriptions
    .filter((item) => item.subscriptionType === "PAID" && item.endAt)
    .map((item) => item.endAt as string)
    .sort()[0];

  return (
    <main className="r-screen r-tasters-manage-screen">
      <TopBar title="구독 관리" fallback="my" />
      <div className="r-tasters-body">
        <Segmented
          label="구독 목록"
          value={tab}
          onChange={setTab}
          options={[
            { value: "subscribed", label: `구독 중 ${app.subscriptions.length}` },
            { value: "incoming", label: `나를 구독 ${app.incomingSubscriptions.length}` },
          ]}
        />

        {app.loading && !app.subscriptions.length && !app.incomingSubscriptions.length ? (
          <div className="r-empty" role="status"><p>구독 정보를 불러오고 있어요…</p></div>
        ) : tab === "subscribed" ? (
          <>
            {app.subscriptions.length > 0 && (
              <section className="r-card r-card--dark r-tasters-summary">
                <span className="r-tasters-summary__copy">
                  <small>무료 구독 {freeCount}명 · 유료 {paidCount}명</small>
                  <b>{nextEnd ? `가장 먼저 끝나는 구독 ${formatDate(nextEnd)}` : "기간 제한 없이 구독 중이에요"}</b>
                </span>
                <button
                  type="button"
                  className="r-tasters-summary__link"
                  onClick={() => app.actions.notify({ kind: "info", title: "결제 내역은 준비 중이에요", message: "지금은 별도 결제 없이 구독할 수 있어요." })}
                >
                  결제 내역
                </button>
              </section>
            )}
            <SubscribedList />
          </>
        ) : (
          <>
            {app.incomingSubscriptions.length > 0 && (
              <p className="r-tasters-note">
                유료 구독자 {app.incomingSubscriptions.filter((item) => item.subscriptionType === "PAID").length}명 · 유료 구독이 늘면 포인트가 쌓여요.
              </p>
            )}
            <IncomingList />
          </>
        )}
      </div>
    </main>
  );
}
