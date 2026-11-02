import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Sheet from "../../components/Sheet";
import { EmptyState } from "../../components/ui";

/** 나를 구독하는 맛객 시트: 누르면 그 맛객 프로필로 갑니다. */
export default function IncomingSubscribersSheet({ onClose }: { onClose: () => void }) {
  const app = useAppData();
  return (
    <Sheet title="나를 구독하는 맛객" onClose={onClose} className="r-me-sheet">
      {app.incomingSubscriptions.length ? (
        <div className="r-me-sheet__list">
          {app.incomingSubscriptions.map((item) => (
            <button
              type="button"
              className="r-row"
              key={item.subscriptionId}
              onClick={() => {
                onClose();
                go("profile", item.subscriberAccountId);
              }}
            >
              <Avatar src={item.avatar} name={item.subscriberNickname} variant={item.avatarVariant} />
              <span className="r-row__copy">
                <b>{item.subscriberNickname}</b>
                <small>
                  {item.subscriptionType === "FREE" ? "무료 구독" : `유료 구독 · ${item.termMonths ?? 0}개월`}
                </small>
              </span>
              <span className={`r-tag ${item.subscriptionType === "FREE" ? "r-tag--neutral" : "r-tag--amber"}`}>
                {item.subscriptionType === "FREE" ? "무료" : "유료"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="user"
          title="아직 구독자가 없어요"
          message="누군가 나를 구독하면 이곳에서 무료·유료 구독을 확인할 수 있어요."
          className="r-me-empty"
        />
      )}
    </Sheet>
  );
}
