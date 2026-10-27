import { useEffect, useState, type FormEvent } from "react";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import type { TagRequest, TagRequestInput } from "../services/community";

const statusLabels = { PENDING: "검토 대기", APPROVED: "반영 완료", REJECTED: "미반영" };

export default function TasteTagRequestSheet({ onClose, onRequest, onLoad }: {
  onClose: () => void;
  onRequest: (input: TagRequestInput) => Promise<TagRequest>;
  onLoad: () => Promise<TagRequest[]>;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TagRequestInput["category"]>("MENU");
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState<TagRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<TagRequest | null>(null);

  useEffect(() => {
    // 팝업을 닫은 뒤 도착한 응답이 화면 상태를 변경하지 않게 합니다.
    let active = true;
    onLoad().then((items) => { if (active) setRequests(items); })
      .catch(() => { if (active) setHistoryError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [onLoad]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("추가하고 싶은 태그를 적어 주세요."); return; }
    setSending(true);
    setError("");
    try {
      const saved = await onRequest({ name: name.trim(), category, reason: reason.trim() });
      setRequests((current) => [saved, ...current]);
      setSent(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "요청을 보내지 못했어요. 다시 시도해 주세요.");
    } finally { setSending(false); }
  }

  return (
    <Sheet title="태그 제안하기" onClose={onClose} className="tag-request-sheet">
      {sent ? (
        <div className="tag-request-success" role="status">
          <span><Icon name="check" /></span>
          <h3>좋은 의견, 잘 받았어요!</h3>
          <p><b>#{sent.tagName}</b> 태그를 관리자 검토 목록에 담았어요.<br />검토 결과는 내 요청 내역에서 확인할 수 있어요.</p>
          <button type="button" className="primary-button" onClick={onClose}>확인</button>
        </div>
      ) : (
        <form className="tag-request-form" onSubmit={(event) => void submit(event)}>
          <p className="tag-request-lead">내 취향을 표현할 태그가 없나요?<br />맛다공에 어울리는 태그를 제안해 주세요.</p>
          <label className="profile-edit-field"><span>어떤 태그가 있으면 좋을까요?</span>
            <input value={name} maxLength={30} required autoComplete="off" placeholder="예: 글루텐 프리, 반려동물 동반"
              onChange={(event) => setName(event.target.value)} disabled={sending} />
          </label>
          <fieldset className="tag-request-category" disabled={sending}>
            <legend>태그 분류</legend>
            {([ ["MENU", "메뉴·맛"], ["VISIT", "방문 조건"] ] as const).map(([value, label]) => (
              <label key={value}><input className="visually-hidden" type="radio" name="request-category"
                checked={category === value} onChange={() => setCategory(value)} /><span>{label}</span></label>
            ))}
          </fieldset>
          <label className="profile-edit-field"><span>어떤 때 필요한가요? <small>선택</small></span>
            <textarea value={reason} maxLength={300} rows={3} placeholder="태그가 필요한 상황을 알려 주세요."
              onChange={(event) => setReason(event.target.value)} disabled={sending} />
            <small>{reason.length}/300</small>
          </label>
          {error && <p className="tag-request-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button" disabled={sending}>{sending ? "보내는 중…" : "태그 제안 보내기"}</button>
          <small className="tag-request-disclaimer">제안한 태그는 검토 후 선택 목록에 반영될 수 있어요.</small>
        </form>
      )}
      <section className="tag-request-history" aria-label="내 태그 요청 내역">
        <h3>최근 제안한 태그</h3>
        {loading && <p>불러오는 중…</p>}
        {historyError && <p>이전 요청을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>}
        {!loading && !historyError && !requests.length && <p>아직 제안한 태그가 없어요.</p>}
        {requests.slice(0, 5).map((item) => (
          <article key={item.requestId}>
            <div><b>#{item.tagName}</b><small>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</small></div>
            <span className={`tag-request-status ${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>
            {item.reviewNote && <p>{item.reviewNote}</p>}
          </article>
        ))}
      </section>
    </Sheet>
  );
}
