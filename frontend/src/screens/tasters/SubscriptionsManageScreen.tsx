import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { PageIntro, Skeleton, TopBar } from "../../components/ui";
import IncomingList from "./IncomingList";
import SubscribedList from "./SubscribedList";

type Tab = "subscribed" | "incoming";
/** 내가 구독한 맛객 목록의 칩(전체 · 무료 · 유료). 값은 구독 종류(subscriptionType)와 같습니다. */
export type SubscriptionFilter = "all" | "FREE" | "PAID";

const FILTERS: { value: SubscriptionFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "FREE", label: "무료" },
  { value: "PAID", label: "유료" },
];

const INTRO: Record<Tab, { title: string; message: string }> = {
  subscribed: { title: "내가 구독한 맛객", message: "관심 있는 맛객의 소식을 구독해 보세요." },
  incoming: { title: "나를 구독한 사람", message: "내 소식을 구독하는 맛객들이에요." },
};

/**
 * 구독 관리(보드 16-01 #subscriptions, 16-02 #subscriptions/incoming): 두 화면은 따로 된 화면이고 큰 제목과 설명 아래
 * 내가 구독한 맛객은 전체 · 무료 · 유료 칩과 맛객 줄, 나를 구독한 사람은 유료·무료 구독자 수 상자와 줄입니다.
 * 내가 구독한 맛객 화면 위쪽 작은 줄로 나를 구독한 사람 화면을 엽니다. 보드의 "만료됨" 칩은 서버가 끝난 구독을 주지 않아 아직 두지 않습니다.
 */
export default function SubscriptionsManageScreen({ routeId }: { routeId: string }) {
  const app = useAppData();
  const tab: Tab = routeId === "incoming" ? "incoming" : "subscribed";
  const [filter, setFilter] = useState<SubscriptionFilter>("all");

  return (
    <main className="r-screen r-tasters-manage">
      <TopBar title={INTRO[tab].title} fallback={tab === "incoming" ? "subscriptions" : "my"} />
      <div className="r-tasters-body">
        <PageIntro title={INTRO[tab].title} message={INTRO[tab].message} />

        {app.isLoading && !app.subscriptions.length && !app.incomingSubscriptions.length ? (
          <Skeleton shape="row" count={3} label="구독 정보를 불러오고 있어요." />
        ) : tab === "subscribed" ? (
          <>
            <button type="button" className="r-tasters-incoming-link" onClick={() => go("subscriptions", "incoming")}>
              <Icon name="people" />
              <span>나를 구독한 사람</span>
              <b>{app.incomingSubscriptions.length}명</b>
              <Icon name="chevron" />
            </button>
            {app.subscriptions.length > 0 && (
              <div className="r-chips" role="group" aria-label="구독 종류">
                {FILTERS.map((option) => (
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
            )}
            <SubscribedList filter={filter} />
          </>
        ) : (
          <IncomingList />
        )}
      </div>
    </main>
  );
}
