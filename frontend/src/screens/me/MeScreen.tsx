import { useEffect, useMemo, useState } from "react";
import { useAppData, type AccountRole } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import { SectionHead } from "../../components/ui";
import {
  MY_ACTIVITY_CHANGED_EVENT,
  deleteQuickPlaceDraft,
  getQuickPlaceDrafts,
  kakaoPlaceFromQuickDraft,
  type QuickPlaceDraft,
} from "../../services/places";
import { QUICK_PLACE_HANDOFF_KEY } from "../../services/registerDraft";
import { dayKey, diaryEntries, entriesByDay, sameMonth, WEEKDAYS } from "./diary";
import { MeThumb, MeTile } from "./MeParts";

const ROLE_LABEL: Record<AccountRole, string> = {
  ADMIN: "관리자",
  SUPER_TASTER: "슈퍼 맛객",
  TASTER: "맛객",
  USER: "사용자",
};

/** 나 탭(#my): 프로필 머리, 다이어리 카드, 한눈에 보는 타일, 맛객 활동 요약. */
export default function MeScreen() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [sheet, setSheet] = useState<"incoming" | "drafts" | null>(null);
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsError, setDraftsError] = useState("");
  const [deletingDraftId, setDeletingDraftId] = useState("");

  const entries = useMemo(
    () => diaryEntries(app.myRecords, app.isMyTasterId, app.photoFor),
    [app.myRecords, app.isMyTasterId, app.photoFor],
  );
  const byDay = useMemo(() => entriesByDay(entries), [entries]);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastMonth = new Date(year, month - 1, 1);
  const thisMonthCount = entries.filter((entry) => entry.date && sameMonth(entry.date, year, month)).length;
  const lastMonthCount = entries.filter((entry) => entry.date && sameMonth(entry.date, lastMonth.getFullYear(), lastMonth.getMonth())).length;
  const monthDiff = thisMonthCount - lastMonthCount;
  // 이번 주(일~토)를 다이어리 카드의 한 줄 달력으로 보여 줍니다.
  const week = Array.from({ length: 7 }, (_, index) => new Date(year, month, today.getDate() - today.getDay() + index));

  const publicCount = entries.filter((entry) => entry.isPublic).length;
  const paidCount = app.incomingSubscriptions.filter((item) => item.subscriptionType === "PAID").length;
  const freeCount = app.incomingSubscriptions.length - paidCount;
  const savedCount = new Set(app.likedPlaceIds).size;

  useEffect(() => {
    let active = true;
    async function load(showLoading: boolean) {
      if (showLoading) setDraftsLoading(true);
      try {
        const items = await getQuickPlaceDrafts(app.accessToken);
        if (!active) return;
        setDrafts(items);
        setDraftsLoaded(true);
        setDraftsError("");
      } catch (cause) {
        // 실패하면 0곳으로 오해하지 않도록 개수를 미확인 상태로 둡니다.
        if (active) setDraftsError(cause instanceof Error ? cause.message : "빠른 장소 기록을 불러오지 못했어요.");
      } finally {
        if (active) setDraftsLoading(false);
      }
    }
    void load(true);
    const refresh = () => void load(false);
    window.addEventListener(MY_ACTIVITY_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(MY_ACTIVITY_CHANGED_EVENT, refresh);
    };
  }, [app.accessToken]);

  async function removeDraft(draft: QuickPlaceDraft) {
    const accepted = await confirm({
      title: "빠른 장소 기록을 삭제할까요?",
      message: `‘${draft.placeName}’ 기록은 삭제하면 복구할 수 없어요.`,
      confirmLabel: "삭제할게요",
      tone: "danger",
    });
    if (!accepted) return;
    setDeletingDraftId(draft.providerPlaceId);
    setDraftsError("");
    try {
      await deleteQuickPlaceDraft(app.accessToken, draft.providerPlaceId, draft.providerCode);
      setDrafts((current) => current.filter((item) => item.providerCode !== draft.providerCode || item.providerPlaceId !== draft.providerPlaceId));
    } catch (cause) {
      setDraftsError(cause instanceof Error ? cause.message : "장소 기록을 삭제하지 못했어요.");
    } finally {
      setDeletingDraftId("");
    }
  }

  function continueDraft(draft: QuickPlaceDraft) {
    // 기록 화면이 열릴 때 이 장소를 선택 상태로 복원하도록 일회성 값을 넘깁니다.
    sessionStorage.setItem(QUICK_PLACE_HANDOFF_KEY, JSON.stringify(kakaoPlaceFromQuickDraft(draft)));
    setSheet(null);
    go("register");
  }

  return (
    <main className="r-screen r-me">
      <header className="r-me-head">
        <button type="button" className="r-me-head__avatar" onClick={() => go("profile-edit")} aria-label="프로필 편집">
          <Avatar src={app.myProfile?.profileImgUrl ?? null} name={app.nickname} variant={app.myProfile?.avatarVariant ?? 1} />
        </button>
        <div className="r-me-head__copy">
          <div className="r-me-head__name">
            <h1 className="r-display">{app.nickname}</h1>
            <span className={`r-me-role r-me-role--${app.accountRole.toLowerCase()}`}>{ROLE_LABEL[app.accountRole]}</span>
          </div>
          <div className="r-me-head__links">
            {app.myProfile && (
              <button type="button" onClick={() => go("profile", app.myProfile?.accountId)}>내 맛객 프로필 보기</button>
            )}
            <button type="button" onClick={() => go("profile-edit")}>프로필 편집</button>
          </div>
        </div>
        <button type="button" className="r-icon-button" onClick={() => go("settings")} aria-label="설정">
          <Icon name="settings" />
        </button>
      </header>

      <div className="r-me-body">
        <button type="button" className="r-card r-me-diary" onClick={() => go("diary")}>
          <span className="r-me-diary__head">
            <b className="r-display">내 맛집 다이어리</b>
            <small className="r-muted">{month + 1}월 {thisMonthCount}곳</small>
          </span>
          <span className="r-me-week" aria-hidden="true">
            {week.map((day) => {
              const first = byDay.get(dayKey(day))?.[0];
              const isToday = dayKey(day) === dayKey(today);
              return first ? (
                <MeThumb key={dayKey(day)} place={first.place} photo={first.photo} className="r-me-week__photo" />
              ) : (
                <span key={dayKey(day)} className={`r-me-week__day ${isToday ? "is-today" : ""}`}>
                  <small>{WEEKDAYS[day.getDay()]}</small>
                  {day.getDate()}
                </span>
              );
            })}
          </span>
          <span className="r-me-diary__total">
            <b>{entries.length}</b>
            <small className="r-muted">
              곳 기록
              {entries.length > 0 && lastMonthCount + thisMonthCount > 0 && (
                monthDiff > 0 ? ` · 지난달보다 ${monthDiff}곳 많아요`
                  : monthDiff < 0 ? ` · 지난달엔 ${lastMonthCount}곳 기록했어요`
                    : " · 지난달과 같은 속도예요"
              )}
              {entries.length === 0 && " · 첫 기록을 남겨 보세요"}
            </small>
          </span>
        </button>

        <div className="r-me-tiles">
          <MeTile icon="heart" value={`${savedCount}`} label="저장한 맛집" onClick={() => go("saved")} />
          <MeTile icon="star" value={`${app.points.balance.toLocaleString("ko-KR")} P`} label="포인트 지갑" tone="amber" onClick={() => go("wallet")} />
          <MeTile
            icon="user"
            value={`${app.incomingSubscriptions.length}`}
            label="나를 구독하는 맛객"
            onClick={() => setSheet("incoming")}
          />
          <MeTile icon="clock" value={`${app.recentPlaces.length}`} label="최근 본 맛집" onClick={() => go("recent")} />
          <MeTile icon="bookmark" value={`${app.subscriptionIds.length}`} label="내가 구독한 맛객" onClick={() => go("subscriptions")} />
          <MeTile
            icon="pin"
            value={draftsLoaded ? `${drafts.length}` : "—"}
            label="빠른 장소 기록"
            caption={draftsLoading && !draftsLoaded ? "불러오는 중" : undefined}
            onClick={() => setSheet("drafts")}
          />
        </div>

        <section className="r-me-section">
          <SectionHead title="맛객 활동" />
          <div className="r-card r-me-activity">
            <dl className="r-me-stats">
              <div><dt>공개 기록</dt><dd>{publicCount}<small>곳</small></dd></div>
              <div><dt>나만 보기</dt><dd>{entries.length - publicCount}<small>곳</small></dd></div>
              <div><dt>구독자</dt><dd>{app.incomingSubscriptions.length}<small>명</small></dd></div>
            </dl>
            <p className="r-me-activity__note r-muted">
              {app.incomingSubscriptions.length
                ? `유료 구독 ${paidCount}명 · 무료 구독 ${freeCount}명이 내 기록을 받아보고 있어요.`
                : publicCount
                  ? "공개 기록이 쌓이면 나와 취향이 맞는 사람들이 구독할 수 있어요."
                  : "기록을 공개하면 다른 사람들이 나를 맛객으로 구독할 수 있어요."}
            </p>
          </div>
          <button type="button" className="r-card r-me-link" onClick={() => go("taster-recommendations")}>
            <span className="r-badge-icon"><Icon name="sparkle" /></span>
            <span className="r-row__copy">
              <b>취향 맛객 추천</b>
              <small>나와 잘 맞는 맛객 {app.recommendedTasters.length}명을 둘러보세요</small>
            </span>
            <Icon name="chevron" />
          </button>
        </section>
      </div>

      {sheet === "incoming" && (
        <Sheet title="나를 구독하는 맛객" onClose={() => setSheet(null)} className="r-me-sheet">
          {app.incomingSubscriptions.length ? (
            <div className="r-me-sheet__list">
              {app.incomingSubscriptions.map((item) => (
                <button
                  type="button"
                  className="r-row"
                  key={item.subscriptionId}
                  onClick={() => { setSheet(null); go("profile", item.subscriberAccountId); }}
                >
                  <Avatar src={item.avatar} name={item.subscriberNickname} variant={item.avatarVariant} />
                  <span className="r-row__copy">
                    <b>{item.subscriberNickname}</b>
                    <small>{item.subscriptionType === "FREE" ? "무료 구독" : `유료 구독 · ${item.termMonths ?? 0}개월`}</small>
                  </span>
                  <span className={`r-tag ${item.subscriptionType === "FREE" ? "r-tag--neutral" : "r-tag--amber"}`}>
                    {item.subscriptionType === "FREE" ? "무료" : "유료"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="r-empty">
              <span className="r-badge-icon"><Icon name="user" /></span>
              <b>아직 구독자가 없어요</b>
              <p>누군가 나를 구독하면 이곳에서 무료·유료 구독을 확인할 수 있어요.</p>
            </div>
          )}
        </Sheet>
      )}

      {sheet === "drafts" && (
        <Sheet title="빠른 장소 기록" onClose={() => setSheet(null)} className="r-me-sheet">
          <p className="r-me-sheet__intro r-muted">장소만 먼저 저장한 기록이에요. 맛집으로 기록하면 이 목록에서 자동으로 정리돼요.</p>
          {draftsError && <p className="r-me-sheet__error" role="alert">{draftsError}</p>}
          {draftsLoading && !draftsLoaded ? (
            <p className="r-empty r-muted" role="status">저장한 장소를 불러오고 있어요…</p>
          ) : drafts.length ? (
            <div className="r-me-sheet__list">
              {drafts.map((draft) => (
                <div className="r-me-draft" key={`${draft.providerCode}:${draft.providerPlaceId}`}>
                  <button
                    type="button"
                    className="r-row"
                    onClick={() => continueDraft(draft)}
                    aria-label={`${draft.placeName} 맛집 기록 이어하기`}
                  >
                    <span className="r-badge-icon"><Icon name="pin" /></span>
                    <span className="r-row__copy">
                      <b>{draft.placeName}</b>
                      <small>{draft.address}</small>
                      <small>
                        {draft.category?.split(">").at(-1)?.trim() || "장소"} · {new Date(draft.savedAt).toLocaleDateString("ko-KR")} 저장
                      </small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="r-icon-button"
                    aria-label={`${draft.placeName} 기록 삭제`}
                    disabled={deletingDraftId === draft.providerPlaceId}
                    onClick={() => void removeDraft(draft)}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            !draftsError && (
              <div className="r-empty">
                <span className="r-badge-icon"><Icon name="pin" /></span>
                <b>빠른 기록이 없어요</b>
                <p>가게에 도착했을 때 장소만 먼저 저장해 두고, 나중에 기록을 완성할 수 있어요.</p>
              </div>
            )
          )}
        </Sheet>
      )}
    </main>
  );
}
