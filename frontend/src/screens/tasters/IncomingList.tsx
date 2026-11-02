import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import { EmptyState } from "../../components/ui";
import { formatRelativeTime } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { planLabel } from "./tasterData";

/** 나를 구독한 사람 목록. 맛객 프로필이 있는 사람만 눌러서 프로필로 갑니다. */
export default function IncomingList() {
  const app = useAppData();
  if (!app.incomingSubscriptions.length) {
    return (
      <EmptyState
        icon="heart"
        title="아직 나를 구독한 사람이 없어요"
        message="공개 기록을 꾸준히 남기면 취향이 맞는 사람이 찾아와요."
        action={{ label: "기록 남기기", onClick: () => go("register"), variant: "primary" }}
      />
    );
  }
  return (
    <div className="r-card r-tasters-list">
      {app.incomingSubscriptions.map((subscription) => {
        const known = app.tasterById.get(subscription.subscriberAccountId);
        const avatar = subscription.avatar ?? known?.avatar;
        const content = (
          <>
            <Avatar
              className="r-tasters-avatar r-tasters-avatar--md"
              src={avatarSource(subscription.subscriberAccountId, avatar)}
              fallbackSrc={avatarFallback(subscription.subscriberAccountId, avatar)}
              name={subscription.subscriberNickname}
              variant={subscription.avatarVariant}
            />
            <span className="r-row__copy">
              <b>{subscription.subscriberNickname}</b>
              <small>{planLabel(subscription)}</small>
            </span>
            {subscription.startAt && (
              <small className="r-tasters-since">{formatRelativeTime(subscription.startAt)} 구독</small>
            )}
          </>
        );
        return known ? (
          <button
            type="button"
            className="r-row"
            key={subscription.subscriptionId}
            onClick={() => go("profile", known.tasterId)}
          >
            {content}
          </button>
        ) : (
          <div className="r-row" key={subscription.subscriptionId}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
