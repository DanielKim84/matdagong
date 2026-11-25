import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState } from "../../components/ui";
import TasterAvatar from "../../components/TasterAvatar";

/**
 * 나를 구독한 사람(보드 16-02): 연한 코랄 "유료 구독자 N명" · 회색 "무료 구독자 N명" 상자, "총 구독자 N명",
 * 줄(얼굴 · 이름 · "유료 구독/무료 구독" 알약 · >)입니다. 유료 구독은 수익과 바로 이어지므로 위에 모읍니다.
 * 맛객 프로필이 있는 사람만 눌러서 프로필로 갑니다.
 */
export default function IncomingList() {
  const app = useAppData();
  const subscriptions = [...app.incomingSubscriptions].sort(
    (left, right) => Number(right.subscriptionType === "PAID") - Number(left.subscriptionType === "PAID"),
  );
  if (!subscriptions.length) {
    return (
      <EmptyState
        icon="heart"
        title="아직 나를 구독한 사람이 없어요"
        message="공개 기록을 꾸준히 남기면 취향이 맞는 사람이 찾아와요."
        action={{ label: "기록 남기기", onClick: () => go("register"), variant: "primary" }}
      />
    );
  }
  const paidCount = subscriptions.filter((item) => item.subscriptionType === "PAID").length;

  return (
    <>
      <section className="r-tasters-incoming-summary" aria-label="구독자 요약">
        <div className="r-tasters-incoming-summary__paid">
          <small>유료 구독자</small>
          <b>
            {paidCount}
            <small>명</small>
          </b>
        </div>
        <div className="r-tasters-incoming-summary__free">
          <small>무료 구독자</small>
          <b>
            {subscriptions.length - paidCount}
            <small>명</small>
          </b>
        </div>
      </section>
      <h2 className="r-tasters-incoming-total">총 구독자 {subscriptions.length}명</h2>

      <div className="r-tasters-list">
        {subscriptions.map((subscription) => {
          const known = app.tasterById.get(subscription.subscriberAccountId);
          const isPaid = subscription.subscriptionType === "PAID";
          const content = (
            <>
              <TasterAvatar
                className="r-tasters-avatar r-tasters-avatar--md"
                taster={{
                  tasterName: subscription.subscriberNickname,
                  avatar: subscription.avatar ?? known?.avatar,
                  avatarVariant: subscription.avatarVariant,
                }}
              />
              <span className="r-row__copy">
                <b>{subscription.subscriberNickname}</b>
                <span className="r-tasters-sub-row__pills">
                  <em className={isPaid ? "is-paid" : "is-free"}>{isPaid ? "유료 구독" : "무료 구독"}</em>
                </span>
              </span>
              {known && <Icon name="chevron" />}
            </>
          );
          return known ? (
            <button
              type="button"
              className="r-row r-tasters-sub-row"
              key={subscription.subscriptionId}
              onClick={() => go("profile", known.tasterId)}
            >
              {content}
            </button>
          ) : (
            <div className="r-row r-tasters-sub-row" key={subscription.subscriptionId}>
              {content}
            </div>
          );
        })}
      </div>
    </>
  );
}
