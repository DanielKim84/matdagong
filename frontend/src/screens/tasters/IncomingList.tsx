import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState } from "../../components/ui";
import TasterAvatar from "../../components/TasterAvatar";
import { formatMonthDay, formatRelativeTime } from "../../utils/format";
import { daysLeft } from "./tasterData";

/**
 * 나를 구독한 사람 목록. 유료 구독은 수익과 바로 이어지므로 위에 모으고 금색 배지로 구분합니다.
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
        <div className="r-card r-tasters-incoming-summary__paid">
          <span className="r-tasters-incoming-summary__icon" aria-hidden="true">
            <Icon name="star" filled />
          </span>
          <span>
            <small>유료 구독자</small>
            <b>
              {paidCount}
              <small>명</small>
            </b>
          </span>
        </div>
        <div className="r-card r-tasters-incoming-summary__free">
          <span className="r-tasters-incoming-summary__icon" aria-hidden="true">
            <Icon name="heart" />
          </span>
          <span>
            <small>무료 구독자</small>
            <b>
              {subscriptions.length - paidCount}
              <small>명</small>
            </b>
          </span>
        </div>
        <p className="r-tasters-note">유료 구독이 늘면 그만큼 포인트(수익)가 쌓여요.</p>
      </section>

      <div className="r-card r-tasters-list">
        {subscriptions.map((subscription) => {
          const known = app.tasterById.get(subscription.subscriberAccountId);
          const avatar = subscription.avatar ?? known?.avatar;
          const isPaid = subscription.subscriptionType === "PAID";
          const remainingDays = daysLeft(subscription.endAt);
          const period = isPaid
            ? [
                subscription.endAt && `${formatMonthDay(subscription.endAt)}까지`,
                remainingDays !== null && `D-${remainingDays}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "기간 제한 없음";
          const content = (
            <>
              <span className="r-tasters-incoming__avatar">
                <TasterAvatar
                  className="r-tasters-avatar r-tasters-avatar--md"
                  taster={{
                    tasterName: subscription.subscriberNickname,
                    avatar,
                    avatarVariant: subscription.avatarVariant,
                  }}
                />
                {isPaid && (
                  <i aria-hidden="true">
                    <Icon name="star" filled />
                  </i>
                )}
              </span>
              <span className="r-row__copy">
                <span className="r-tasters-incoming__name">
                  <b>{subscription.subscriberNickname}</b>
                  <span className={`r-tasters-plan ${isPaid ? "is-paid" : ""}`}>
                    {isPaid ? `유료 ${subscription.termMonths ?? 0}개월` : "무료"}
                  </span>
                </span>
                <small>{period}</small>
              </span>
              {subscription.startAt && (
                <small className="r-tasters-since">{formatRelativeTime(subscription.startAt)} 구독</small>
              )}
            </>
          );
          const className = `r-row r-tasters-incoming ${isPaid ? "is-paid" : ""}`;
          return known ? (
            <button
              type="button"
              className={className}
              key={subscription.subscriptionId}
              onClick={() => go("profile", known.tasterId)}
            >
              {content}
            </button>
          ) : (
            <div className={className} key={subscription.subscriptionId}>
              {content}
            </div>
          );
        })}
      </div>
    </>
  );
}
