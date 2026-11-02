import { useAppData } from "../../app/AppData";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { isMyTaster, type Place } from "../../models/place";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import type { PlaceRecord } from "./placeRecords";

/** 다녀간 맛객 요약 줄. 누르면 기록 탭으로 이동합니다. */
export default function PlaceVisitors({
  place,
  records,
  onSelect,
}: {
  place: Place;
  records: PlaceRecord[];
  onSelect: () => void;
}) {
  const { subscriptionIds } = useAppData();
  const visitors = records.filter((record) => record.visibility !== "PRIVATE");
  const visitorCount = Math.max(place.recordCount, visitors.length);
  const subscribedCount = visitors.filter((record) => subscriptionIds.includes(record.tasterId)).length;
  const matchedCount = visitors.filter(
    (record) => !isMyTaster(record) && !subscriptionIds.includes(record.tasterId) && (record.matchScore ?? 0) > 0,
  ).length;

  return (
    <button type="button" className="r-card r-place-visitors" onClick={onSelect}>
      <span className="r-avatar-stack" aria-hidden="true">
        {records.slice(0, 3).map((record) => (
          <Avatar
            key={record.tasterId}
            src={avatarSource(record.tasterId, record.avatar)}
            fallbackSrc={avatarFallback(record.tasterId, record.avatar)}
            name={record.tasterName}
            variant={record.avatarVariant}
          />
        ))}
      </span>
      <span className="r-place-visitors__copy">
        <b>{visitorCount > 0 ? `맛객 ${visitorCount}명이 다녀왔어요` : "아직 나만 아는 맛집이에요"}</b>
        {(subscribedCount > 0 || matchedCount > 0) && (
          <small>
            {[
              subscribedCount > 0 && `구독 ${subscribedCount}명`,
              matchedCount > 0 && `취향 맞는 맛객 ${matchedCount}명`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </small>
        )}
      </span>
      <Icon name="chevron" />
    </button>
  );
}
