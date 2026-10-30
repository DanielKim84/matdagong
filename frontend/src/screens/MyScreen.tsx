import { useEffect, useState } from "react";
import { go } from "../app/navigation";
import type { Screen } from "../models/place";
import { Avatar } from "../components/BrandAssets";
import Icon, { type IconName } from "../components/Icon";
import Sheet from "../components/Sheet";
import { useNotificationDialog } from "../components/NotificationDialog";
import type { IncomingSubscription, PointAccount } from "../services/community";
import { MY_ACTIVITY_CHANGED_EVENT, deleteQuickPlaceDraft, getQuickPlaceDrafts, kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../services/places";
import { QUICK_PLACE_HANDOFF_KEY } from "../services/registerDraft";

type Props = {
  accountRole: "ADMIN" | "SUPER_TASTER" | "TASTER" | "USER";
  collectionCount: number;
  registeredCount: number;
  subscribedCount: number;
  recommendedTasterCount: number;
  recentCount: number;
  nickname: string;
  profileImgUrl: string | null;
  avatarVariant: number;
  incomingSubscriptions: IncomingSubscription[];
  points: PointAccount;
  accessToken: string;
};
export default function MyScreen({
  accountRole,
  collectionCount,
  registeredCount,
  subscribedCount,
  recommendedTasterCount,
  recentCount,
  nickname,
  profileImgUrl,
  avatarVariant,
  incomingSubscriptions,
  points,
  accessToken,
}: Props) {
  const { confirm } = useNotificationDialog();
  const [pointsOpen, setPointsOpen] = useState(false);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState("");
  const [deletingDraftId, setDeletingDraftId] = useState("");
  const activities: {
    label: string;
    icon: IconName;
    screen: Screen;
    count: number;
  }[] = [
    {
      label: "내 구독 맛객",
      icon: "pin",
      screen: "subscriptions",
      count: subscribedCount,
    },
    {
      label: "내가 등록한 맛집",
      icon: "fork",
      screen: "diary",
      count: registeredCount,
    },
    {
      label: "내 맛집",
      icon: "heart",
      screen: "saved",
      count: collectionCount,
    },
    {
      label: "최근 본 맛집",
      icon: "clock",
      screen: "recent",
      count: recentCount,
    },
  ];
  const paidCount = incomingSubscriptions.filter(({ subscriptionType }) => subscriptionType === "PAID").length;
  const freeCount = incomingSubscriptions.length - paidCount;

  useEffect(() => {
    let active = true;
    setDraftsLoading(true);
    getQuickPlaceDrafts(accessToken).then((items) => {
      if (!active) return;
      setDrafts(items);
      setDraftsLoaded(true);
    }).catch(() => {
      // 조회에 실패하면 0곳으로 오해하지 않도록 카운트를 미확인 상태로 둡니다.
    }).finally(() => {
      if (active) setDraftsLoading(false);
    });
    return () => { active = false; };
  }, [accessToken]);

  useEffect(() => {
    async function refreshDraftCount() {
      try {
        const items = await getQuickPlaceDrafts(accessToken);
        setDrafts(items);
        setDraftsLoaded(true);
        setDraftsError("");
      } catch (cause) {
        setDraftsError(cause instanceof Error ? cause.message : "빠른 장소 기록을 불러오지 못했어요.");
      }
    }
    window.addEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshDraftCount);
    return () => window.removeEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshDraftCount);
  }, [accessToken]);

  async function openDrafts() {
    setDraftsOpen(true);
    // 마이 화면에서 이미 받은 목록이 있으면 캐시를 바로 보여주고 다시 기다리지 않습니다.
    if (draftsLoaded || draftsLoading) return;
    setDraftsLoading(true);
    setDraftsError("");
    try {
      const items = await getQuickPlaceDrafts(accessToken);
      setDrafts(items);
      setDraftsLoaded(true);
    }
    catch (cause) { setDraftsError(cause instanceof Error ? cause.message : "빠른 장소 기록을 불러오지 못했어요."); }
    finally { setDraftsLoading(false); }
  }

  async function removeDraft(draft: QuickPlaceDraft) {
    if (!await confirm({
      title: "빠른 장소 기록을 삭제할까요?",
      message: `‘${draft.placeName}’ 기록은 삭제하면 복구할 수 없어요.`,
      confirmLabel: "삭제할게요",
      tone: "danger",
    })) return;
    setDeletingDraftId(draft.providerPlaceId);
    setDraftsError("");
    try {
      await deleteQuickPlaceDraft(accessToken, draft.providerPlaceId, draft.providerCode);
      setDrafts((current) => current.filter((item) => item.providerCode !== draft.providerCode || item.providerPlaceId !== draft.providerPlaceId));
    } catch (cause) { setDraftsError(cause instanceof Error ? cause.message : "장소 기록을 삭제하지 못했어요."); }
    finally { setDeletingDraftId(""); }
  }

  function continueDraftRegistration(draft: QuickPlaceDraft) {
    // 등록 화면이 열릴 때 이 장소를 선택 상태로 복원하도록 일회성 전달값을 저장합니다.
    sessionStorage.setItem(QUICK_PLACE_HANDOFF_KEY, JSON.stringify(kakaoPlaceFromQuickDraft(draft)));
    setDraftsOpen(false);
    go("register");
  }

  return (
    <main className="my-screen">
      <section className="my-identity">
        <button
          className="my-avatar-upload"
          type="button"
          onClick={() => go("profile-edit")}
          aria-label="내 프로필 수정"
        >
          <Avatar src={profileImgUrl} name={nickname} variant={avatarVariant} />
          <span><Icon name="camera" /></span>
        </button>
        <div className="my-identity-copy">
          <div className="my-identity-name">
            <h1>{nickname}</h1>
            <span className={`my-role-badge my-role-badge--${accountRole.toLowerCase()}`}>
              {({ ADMIN: "관리자", SUPER_TASTER: "슈퍼 맛객", TASTER: "맛객", USER: "사용자" } as const)[accountRole]}
            </span>
          </div>
          <small>@{nickname.replaceAll(" ", "")}_matguest</small>
        </div>
        <button className="icon-button my-settings-button" onClick={() => go("settings")} aria-label="설정"><Icon name="settings" /></button>
      </section>
      <button className="my-incoming-summary" type="button" onClick={() => setIncomingOpen(true)}>
        <span className="my-incoming-icon"><Icon name="user" /></span>
        <span className="my-incoming-copy"><b>나를 구독하는 맛객</b><small>내 기록을 구독 중인 맛객과 구독 유형</small><em><span>유료 {paidCount}</span><i />무료 {freeCount}</em></span>
        <strong>{incomingSubscriptions.length}<small>명</small></strong><Icon name="chevron" />
      </button>
      <section className="points-summary">
        <span>
          <Icon name="fork" />
        </span>
        <div>
          <small>보유 포인트</small>
          <b>
            {points.balance.toLocaleString("ko-KR")} <em>P</em>
          </b>
        </div>
        <button onClick={() => setPointsOpen(true)}>포인트 내역</button>
      </section>
      <section className="my-activity-section">
        <div className="my-activity-heading"><h2>내 활동</h2><small>맛다공에서 모은 기록</small></div>
        <div className="my-activity-grid">
          {activities.map((activity) => <button onClick={() => go(activity.screen)} key={activity.label}>
            <span><Icon name={activity.icon} /></span><b>{activity.label}</b><strong>{activity.count}<small>{activity.screen === "subscriptions" ? "명" : "곳"}</small></strong>
            <Icon name="chevron" />
          </button>)}
        </div>
        <button className="my-recommendation-link" type="button" onClick={() => go("taster-recommendations")}>
          <span><Icon name="sparkle" /></span>
          <span><b>취향 맛객 추천</b><small>나와 잘 맞는 맛객을 둘러보세요</small></span>
          <strong>{recommendedTasterCount}<small>명</small></strong>
          <Icon name="chevron" />
        </button>
        <button className="my-quick-drafts-entry" type="button" onClick={() => void openDrafts()}>
          <span><Icon name="clock" /></span>
          <span><b>빠른 장소 기록</b><small>저장한 장소를 확인하고 정리해요</small></span>
          <strong className="my-quick-drafts-count">{draftsLoaded ? drafts.length : "—"}<small>곳</small></strong>
          <Icon name="chevron" />
        </button>
      </section>
      {incomingOpen && <Sheet title="나를 구독하는 맛객" onClose={() => setIncomingOpen(false)} className="incoming-subscribers-sheet">
        <p className="incoming-subscribers-intro">나를 구독 중인 맛객과 구독 유형이에요.</p>
        {incomingSubscriptions.length ? incomingSubscriptions.map((subscription) => <button className="incoming-subscriber-row" key={subscription.subscriptionId} onClick={() => { setIncomingOpen(false); go("profile", subscription.subscriberAccountId); }}>
          <Avatar src={subscription.avatar} name={subscription.subscriberNickname} variant={subscription.avatarVariant} />
          <span className="incoming-subscriber-copy"><b>{subscription.subscriberNickname}</b><small className={subscription.subscriptionType === "FREE" ? "is-free" : "is-paid"}>{subscription.subscriptionType === "FREE" ? "무료 구독" : `유료 구독 · ${subscription.termMonths ?? 0}개월`}</small></span>
          {subscription.subscriptionType !== "FREE" && <span className="subscription-type-chip is-paid incoming-trial-chip">무료 이용 중</span>}
          <Icon name="chevron" />
        </button>) : <div className="points-empty incoming-empty"><span><Icon name="user" /></span><h2>아직 구독자가 없어요</h2><p>누군가 나를 구독하면 이곳에서 무료·유료 구독을 확인할 수 있어요.</p></div>}
      </Sheet>}
      {draftsOpen && <Sheet title="빠른 장소 기록" onClose={() => setDraftsOpen(false)} className="my-quick-drafts-sheet">
        <p className="quick-place-intro">장소만 먼저 저장한 기록이에요. 맛집으로 등록하면 이 목록에서 자동으로 정리돼요.</p>
        {draftsError && <p className="quick-place-error" role="alert">{draftsError}</p>}
        {draftsLoading ? <div className="my-drafts-loading" role="status">저장한 장소를 불러오고 있어요…</div> : drafts.length ? <div className="my-draft-list">{drafts.map((draft) => <article className="my-draft-card" key={`${draft.providerCode}:${draft.providerPlaceId}`}>
          <button className="my-draft-open" type="button" onClick={() => continueDraftRegistration(draft)} aria-label={`${draft.placeName} 맛집 등록 이어하기`}>
            <span className="my-draft-icon"><Icon name="pin" /></span>
            <span className="my-draft-copy"><b>{draft.placeName}</b><small>{draft.address}</small><em>{draft.category?.split(">").at(-1)?.trim() || "장소"} · {new Date(draft.savedAt).toLocaleDateString("ko-KR")} 저장</em></span>
            <span className="my-draft-open-next" aria-hidden="true"><Icon name="chevron" /></span>
          </button>
          <button className="my-draft-delete" type="button" aria-label={`${draft.placeName} 기록 삭제`} disabled={deletingDraftId === draft.providerPlaceId} onClick={() => void removeDraft(draft)}><Icon name="close" /></button>
        </article>)}</div> : !draftsError && <div className="points-empty"><span><Icon name="pin" /></span><h2>빠른 기록이 없어요</h2><p>장소에 도착했을 때 먼저 저장해 두고 나중에 맛집 기록을 완성할 수 있어요.</p></div>}
      </Sheet>}
      {pointsOpen && (
        <Sheet title="포인트 내역" onClose={() => setPointsOpen(false)}>
          <div className="point-history-balance"><small>현재 보유 포인트</small><b>{points.balance.toLocaleString("ko-KR")} P</b></div>
          <p className="points-coming-soon" role="note">포인트 적립과 사용, 정산 기능은 준비 중이에요. 적용되면 이곳에서 확인할 수 있어요.</p>
          {points.history.length ? <div className="point-history-list">{points.history.map((entry) => <article key={entry.historyId}>
            <span><b>{entry.title}</b><small>{new Date(entry.createdAt).toLocaleDateString("ko-KR")}{entry.memo ? " · " + entry.memo : ""}</small></span>
            <strong className={entry.amount > 0 ? "earned" : "spent"}>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString("ko-KR")} P</strong>
          </article>)}</div> : <div className="points-empty"><span><Icon name="fork" /></span><h2>포인트 내역이 없어요</h2><p>포인트 내역이 생기면 이곳에서 확인할 수 있어요.</p></div>}
        </Sheet>
      )}
    </main>
  );
}
