import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MascotArt from "../../components/MascotArt";

export type RecordDoneInfo = {
  /** 새 기록의 장소 ID. 알 수 없으면 빈 문자열입니다. */
  placeId: string;
  name: string;
  headline: string;
  photo?: string;
  tags: string[];
  visibility: "private" | "public";
};

/** 저장 완료 화면입니다. 방금 남긴 기록을 미리 보여 주고 다음 동작을 고르게 합니다. */
export default function RecordDone({ info, onMore }: { info: RecordDoneInfo; onMore: () => void }) {
  return (
    <main className="r-screen r-record-done">
      <div className="r-record-done__hero" aria-hidden="true" />
      <MascotArt pose={9} label="기뻐하는 맛다공 캐릭터" className="r-record-done__mascot" />
      <div className="r-record-done__body">
        <h1 className="r-display">기록을 남겼어요!</h1>
        <p className="r-muted" role="status">
          {info.visibility === "public"
            ? "공개 추천으로 저장했어요. 다른 맛객도 이 기록을 볼 수 있어요."
            : "나만 보는 기록으로 저장했어요. 언제든 공개로 바꿀 수 있어요."}
        </p>
        <article className="r-card r-record-done__card">
          {info.photo ? (
            <img src={info.photo} alt={`${info.name} 대표 사진`} />
          ) : (
            <span className="r-record-done__placeholder">
              <Icon name="image" />
            </span>
          )}
          <div>
            <b>{info.name}</b>
            {info.headline && <span className="r-display">&ldquo;{info.headline}&rdquo;</span>}
            {info.tags.length > 0 && (
              <div className="r-tags">
                {info.tags.map((tag) => (
                  <span className="r-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
      <div className="r-record-done__actions">
        <button
          type="button"
          className="r-button r-button--primary r-button--block"
          onClick={() => (info.placeId ? go("place", info.placeId, true) : go("my", "", true))}
        >
          {info.placeId ? "장소 보기" : "내 기록 보기"}
        </button>
        <button type="button" className="r-button r-button--secondary r-button--block" onClick={onMore}>
          계속 기록하기
        </button>
      </div>
    </main>
  );
}
