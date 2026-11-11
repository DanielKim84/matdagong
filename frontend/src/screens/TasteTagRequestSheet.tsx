import { useEffect, useState, type FormEvent } from "react";
import GroupIcon, { tagGroupLook } from "../components/GroupIcon";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import type { TagRequest, TagRequestInput } from "../models/community";
import { TASTE_TAG_GROUP_LABELS, TASTE_TAG_GROUPS, type TasteTagGroup } from "../models/tasteTags";
import { errorMessage } from "../utils/errorMessage";
import { formatFullDate } from "../utils/format";

const MAX_NAME_LENGTH = 30;
const MAX_REASON_LENGTH = 300;
/** 내 제안 내역에 보여 줄 최근 제안 수 */
const HISTORY_LIMIT = 20;

const STATUS_LABELS: Record<TagRequest["status"], string> = {
  PENDING: "검토 대기",
  APPROVED: "반영 완료",
  REJECTED: "미반영",
};
const ALL_GROUPS = TASTE_TAG_GROUPS.map((group) => group.id);

/** 취향 태그(프로필 편집)나 매장 이용 정보(맛집 기록) 추가를 제안하고 내 제안 내역을 보는 시트입니다. */
export default function TasteTagRequestSheet({
  onClose,
  onRequest,
  onLoad,
  requestType = "TAG",
  groups = ALL_GROUPS,
}: {
  onClose: () => void;
  onRequest: (input: TagRequestInput) => Promise<TagRequest>;
  onLoad: () => Promise<TagRequest[]>;
  requestType?: "TAG" | "PLACE_INFO";
  /** 태그 제안에서 고를 수 있는 분류. 기록하기는 지금 장소 분야의 분류만 넘깁니다. */
  groups?: readonly TasteTagGroup[];
}) {
  const [name, setName] = useState("");
  const [tagGroup, setTagGroup] = useState<TasteTagGroup>(requestType === "PLACE_INFO" ? "VISIT" : groups[0]);
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState<TagRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHistoryError, setHasHistoryError] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState<TagRequest | null>(null);

  useEffect(() => {
    // 팝업을 닫은 뒤 도착한 응답이 화면 상태를 변경하지 않게 합니다.
    let active = true;
    onLoad()
      .then((items) => {
        if (active) setRequests(items);
      })
      .catch(() => {
        if (active) setHasHistoryError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onLoad]);

  async function reloadHistory() {
    setIsLoading(true);
    setHasHistoryError(false);
    try {
      setRequests(await onLoad());
    } catch {
      setHasHistoryError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("추가하고 싶은 태그를 적어 주세요.");
      return;
    }
    setIsSending(true);
    setError("");
    try {
      const saved = await onRequest({
        requestType,
        name: name.trim(),
        tagGroup: requestType === "PLACE_INFO" ? "VISIT" : tagGroup,
        reason: reason.trim(),
      });
      setRequests((current) => [saved, ...current]);
      setSent(saved);
    } catch (cause) {
      setError(errorMessage(cause, "요청을 보내지 못했어요. 다시 시도해 주세요."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Sheet
      title={requestType === "TAG" ? "태그 제안하기" : "매장 이용 정보 제안"}
      onClose={onClose}
      className="tag-request-sheet"
    >
      {sent ? (
        <div className="tag-request-success" role="status">
          <span>
            <Icon name="check" />
          </span>
          <h3>좋은 의견, 잘 받았어요!</h3>
          <p>
            <b>{requestType === "TAG" ? `#${sent.tagName}` : sent.tagName}</b>
            {requestType === "TAG" ? " 태그" : " 정보"} 제안을 관리자 검토 목록에 담았어요.
            <br />
            검토 결과는 내 제안 내역에서 확인할 수 있어요.
          </p>
          <button type="button" className="primary-button" onClick={onClose}>
            확인
          </button>
        </div>
      ) : (
        <form className="tag-request-form" onSubmit={(event) => void submit(event)}>
          <p className="tag-request-lead">
            {requestType === "TAG" ? (
              <>
                내 취향을 표현할 태그가 없나요?
                <br />
                맛다공에 어울리는 태그를 제안해 주세요.
              </>
            ) : (
              <>
                방문에 필요한 정보가 목록에 없나요?
                <br />새 매장 이용 정보를 제안해 주세요.
              </>
            )}
          </p>
          <label className="profile-edit-field">
            <span>{requestType === "TAG" ? "어떤 태그가 있으면 좋을까요?" : "어떤 매장 이용 정보가 필요할까요?"}</span>
            <input
              value={name}
              maxLength={MAX_NAME_LENGTH}
              required
              autoComplete="off"
              placeholder={requestType === "TAG" ? "예: 글루텐 프리, 수제 맥주" : "예: 콘센트 있음, 배달 가능"}
              onChange={(event) => setName(event.target.value)}
              disabled={isSending}
            />
          </label>
          {requestType === "TAG" && (
            <fieldset className="tag-request-category" disabled={isSending}>
              <legend>태그 분류</legend>
              {groups.map((group) => (
                <label key={group}>
                  <input
                    className="visually-hidden"
                    type="radio"
                    name="request-category"
                    checked={tagGroup === group}
                    onChange={() => setTagGroup(group)}
                  />
                  <span>
                    <GroupIcon look={tagGroupLook(group)} />
                    {TASTE_TAG_GROUP_LABELS[group]}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="profile-edit-field">
            <span>
              어떤 때 필요한가요? <small>선택</small>
            </span>
            <textarea
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              rows={3}
              placeholder="태그가 필요한 상황을 알려 주세요."
              onChange={(event) => setReason(event.target.value)}
              disabled={isSending}
            />
            <small>
              {reason.length}/{MAX_REASON_LENGTH}
            </small>
          </label>
          {error && (
            <p className="tag-request-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary-button" disabled={isSending}>
            {isSending ? "보내는 중…" : "제안 보내기"}
          </button>
          <small className="tag-request-disclaimer">관리자 검토 결과는 아래 내 제안 내역에서 확인할 수 있어요.</small>
        </form>
      )}
      <section className="tag-request-history" aria-label="내 태그 요청 내역">
        <h3>내 제안 내역</h3>
        {isLoading && <p>불러오는 중…</p>}
        {hasHistoryError && (
          <div className="proposal-history-empty" role="status">
            <span>제안 내역을 확인하지 못했어요.</span>
            <button type="button" onClick={() => void reloadHistory()}>
              다시 불러오기
            </button>
          </div>
        )}
        {!isLoading && !hasHistoryError && !requests.length && <p>아직 제안한 태그가 없어요.</p>}
        {requests.slice(0, HISTORY_LIMIT).map((item) => (
          <article key={item.requestId}>
            <div>
              <b>
                {item.requestType === "TAG" ? "#" : ""}
                {item.tagName}
              </b>
              <small>
                {item.requestType === "TAG" ? TASTE_TAG_GROUP_LABELS[item.tagGroup] : "매장 이용 정보"} ·{" "}
                {formatFullDate(item.createdAt)}
              </small>
            </div>
            <span className={`tag-request-status ${item.status.toLowerCase()}`}>{STATUS_LABELS[item.status]}</span>
            {item.reviewNote && <p>{item.reviewNote}</p>}
          </article>
        ))}
      </section>
    </Sheet>
  );
}
