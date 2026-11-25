import { go } from "../../app/navigation";
import Icon from "../../components/Icon";

export type RecordDoneInfo = {
  /** 새 기록의 장소 ID. 알 수 없으면 빈 문자열입니다. */
  placeId: string;
  name: string;
  /** "분류 · 동네" 한 줄 */
  meta: string;
  photo?: string;
  visibility: "private" | "public";
};

/**
 * 저장 완료 화면(보드 12-02): 위 뒤로 버튼, 반짝이가 붙은 연한 코랄 동그라미 속 맛다공 기호, "기록이 저장되었어요!",
 * 공개 범위 배지와 한 줄, 방금 남긴 기록 카드(사진 · 이름 · "분류 · 동네" · >, 아래 "공개 범위" 줄), 맛집 보기 · 계속 기록하기 줄,
 * 맨 아래 완료 버튼입니다.
 */
export default function RecordDone({ info, onMore }: { info: RecordDoneInfo; onMore: () => void }) {
  const isPublic = info.visibility === "public";
  const visibilityLabel = isPublic ? "공개" : "나만 보기";
  const openPlace = () => (info.placeId ? go("place", info.placeId, true) : go("my", "", true));
  return (
    <main className="r-screen r-record-done">
      <div className="r-record-done__bar">
        <button type="button" className="r-icon-button" onClick={() => go("my", "", true)} aria-label="나 탭으로">
          <Icon name="back" />
        </button>
      </div>
      <section className="r-record-done__top">
        <span className="r-record-done__mark" aria-hidden="true">
          <img src="/assets/brand/brand-symbol.png" alt="" />
          <i />
        </span>
        <h1 className="r-display">기록이 저장되었어요!</h1>
        <div className="r-record-done__status" role="status">
          <span className={`r-record-done__badge ${isPublic ? "is-public" : ""}`}>
            <Icon name={isPublic ? "globe" : "lock"} />
            {visibilityLabel}
          </span>
          <p>{isPublic ? "모든 맛다공 사용자가 볼 수 있게 저장했어요." : "나만 보는 기록으로 저장됐어요."}</p>
        </div>
      </section>

      <div className="r-record-done__card">
        <button type="button" onClick={openPlace} aria-label={`방금 남긴 기록, ${info.name} 맛집 보기`}>
          {info.photo && <img src={info.photo} alt="" />}
          <span>
            <b>{info.name}</b>
            {info.meta && <small>{info.meta}</small>}
          </span>
          <Icon name="chevron" />
        </button>
        <p className="r-record-done__visibility">
          <Icon name="people" />
          공개 범위
          <span className={`r-record-done__badge is-small ${isPublic ? "is-public" : ""}`}>{visibilityLabel}</span>
        </p>
      </div>

      <div className="r-record-done__links">
        <button type="button" onClick={openPlace}>
          <Icon name="fork" />
          {info.placeId ? "맛집 보기" : "내 기록 보기"}
          <Icon name="chevron" />
        </button>
        <button type="button" onClick={onMore}>
          <Icon name="pencil" />
          계속 기록하기
          <Icon name="chevron" />
        </button>
      </div>

      <button
        type="button"
        className="r-button r-button--primary r-button--block r-record-done__finish"
        onClick={() => go("my", "", true)}
      >
        완료
      </button>
    </main>
  );
}
