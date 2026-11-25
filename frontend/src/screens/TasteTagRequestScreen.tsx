import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import SubScreen from "../components/SubScreen";
import type { TagRequest, TagRequestInput } from "../models/community";
import { TASTE_TAG_GROUP_LABELS, TASTE_TAG_GROUPS, type TasteTagGroup } from "../models/tasteTags";
import { errorMessage } from "../utils/errorMessage";

// 이름 30자는 커뮤니티 모듈 TasteTagModels.TagRequest의 검증과 같은 값입니다(DB tag_name VARCHAR(30)).
// 설명은 서버가 300자까지 받지만 보드 17-04처럼 화면에서는 100자까지 받습니다.
const MAX_NAME_LENGTH = 30;
const MAX_REASON_LENGTH = 100;
/** 내 제안에 보여 줄 최근 제안 수. 서버(TasteTagRequestService.RECENT_REQUEST_LIMIT)도 20건만 돌려줍니다. */
const HISTORY_LIMIT = 20;

const STATUS_LABELS: Record<TagRequest["status"], string> = {
  PENDING: "검토 중",
  APPROVED: "적용 완료",
  REJECTED: "미반영",
};
/** 매장 이용 정보(VISIT)는 태그 제안에서 고르지 않습니다. */
const GROUPS = TASTE_TAG_GROUPS.map((group) => group.id).filter((group) => group !== "VISIT");

/**
 * 태그 제안(보드 17-04, 전체 화면): 음식 사진 띠 위 "새로운 태그를 제안해 주세요.", 분류 칩, 태그명 · 설명(선택, 0/100),
 * "태그 제안하기", 내 제안(분류 알약 · 태그명 · 검토 상태 알약)입니다. 프로필 편집의 추천 취향에서 엽니다.
 * 제안은 관리자가 검토한 뒤 사전에 넣습니다(바로 등록되지 않음).
 */
export default function TasteTagRequestScreen({
  onClose,
  onRequest,
  onLoad,
}: {
  onClose: () => void;
  onRequest: (input: TagRequestInput) => Promise<TagRequest>;
  onLoad: () => Promise<TagRequest[]>;
}) {
  const [name, setName] = useState("");
  const [tagGroup, setTagGroup] = useState<TasteTagGroup>(GROUPS[0]);
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState<TagRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHistoryError, setHasHistoryError] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // 화면을 닫은 뒤 도착한 응답이 상태를 바꾸지 않게 합니다.
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

  async function submit() {
    if (!name.trim()) {
      setError("추가하고 싶은 태그를 적어 주세요.");
      return;
    }
    setIsSending(true);
    setError("");
    setNotice("");
    try {
      const saved = await onRequest({ requestType: "TAG", name: name.trim(), tagGroup, reason: reason.trim() });
      setRequests((current) => [saved, ...current]);
      setNotice(`#${saved.tagName} 제안을 관리자 검토 목록에 담았어요.`);
      setName("");
      setReason("");
    } catch (cause) {
      setError(errorMessage(cause, "요청을 보내지 못했어요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SubScreen title="태그 제안" onClose={onClose} className="r-tag-request">
      <div className="r-tag-request__banner">
        <img src="/assets/content/intro/cold-noodles.jpg" alt="" />
        <p>
          <b className="r-display">
            새로운 태그를
            <br />
            제안해 주세요.
          </b>
          <small>
            더 다양한 맛집을 찾을 수 있도록
            <br />
            원하는 태그를 알려주세요.
          </small>
        </p>
      </div>

      <div className="r-tag-request__row">
        <span className="r-tag-request__label">분류</span>
        <div className="r-chips" role="radiogroup" aria-label="태그 분류">
          {GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              role="radio"
              aria-checked={tagGroup === group}
              className={`r-chip ${tagGroup === group ? "is-on" : ""}`}
              onClick={() => setTagGroup(group)}
              disabled={isSending}
            >
              {TASTE_TAG_GROUP_LABELS[group]}
            </button>
          ))}
        </div>
      </div>
      <label className="r-tag-request__row">
        <span className="r-tag-request__label">태그명</span>
        <input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          placeholder="예: 막국수"
          onChange={(event) => setName(event.target.value)}
          disabled={isSending}
        />
      </label>
      <label className="r-tag-request__field">
        <span className="r-tag-request__label">설명 (선택)</span>
        <span className="r-tag-request__area">
          <textarea
            value={reason}
            maxLength={MAX_REASON_LENGTH}
            rows={3}
            placeholder={"이 태그가 어떤 의미인지 간단히 알려주세요.\n(예: 메밀로 만든 시원한 면 요리)"}
            onChange={(event) => setReason(event.target.value)}
            disabled={isSending}
          />
          <small>
            {reason.length} / {MAX_REASON_LENGTH}
          </small>
        </span>
      </label>
      {error && (
        <p className="r-error-box" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="r-info-note" role="status">
          <Icon name="check" />
          {notice}
        </p>
      )}
      <button
        type="button"
        className="r-button r-button--primary r-button--block"
        disabled={isSending}
        onClick={() => void submit()}
      >
        <Icon name="pencil" />
        {isSending ? "보내는 중…" : "태그 제안하기"}
      </button>

      <section className="r-tag-request__history" aria-labelledby="tag-request-history-title">
        <h3 id="tag-request-history-title">
          내 제안 <small>제안은 즉시 전체 사전에 등록되는 것이 아닙니다.</small>
        </h3>
        {isLoading && <p className="r-muted">불러오는 중…</p>}
        {hasHistoryError && (
          <p className="r-muted" role="status">
            제안 내역을 확인하지 못했어요.{" "}
            <button type="button" className="r-text-button" onClick={() => void reloadHistory()}>
              다시 불러오기
            </button>
          </p>
        )}
        {!isLoading && !hasHistoryError && !requests.length && <p className="r-muted">아직 제안한 태그가 없어요.</p>}
        {requests.length > 0 && (
          <ul>
            {requests.slice(0, HISTORY_LIMIT).map((item) => (
              <li key={item.requestId}>
                <em>{item.requestType === "TAG" ? TASTE_TAG_GROUP_LABELS[item.tagGroup] : "매장 이용"}</em>
                <b>{item.tagName}</b>
                <span className={`r-tag-request__status is-${item.status.toLowerCase()}`}>
                  {STATUS_LABELS[item.status]}
                </span>
                <Icon name="chevron" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </SubScreen>
  );
}
