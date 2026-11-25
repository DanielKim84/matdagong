import { splitReason } from "../record/recordModel";
import { recordTagGroups, type PlaceRecord } from "./placeRecords";

/**
 * 고른 맛객 한 명의 추천 이유 본문(보드 09-02): 굵은 한 줄 추천(따옴표), 자세한 이야기 문단, "이런 스타일이에요"(묶음마다 테두리 상자에
 * 묶음 이름 · 코랄 "N개" · 연한 코랄 # 칩)입니다. 누구의 기록인지는 위 맛객 바꾸기 줄(PlaceTasterSwitcher)이,
 * 대표 메뉴는 PlaceMenus가, 매장 이용 정보는 위치 칸의 "맛객이 남긴 이용 정보"가 보여 줍니다. 맛객끼리 섞지 않습니다.
 */
export default function PlaceTasterRecord({ record, panelId }: { record: PlaceRecord; panelId: string }) {
  const { headline, detail } = splitReason(record.note.trim());
  // 매장 이용 정보(VISIT)는 보드 09-04처럼 위치 칸 아래 따로 보여 줍니다.
  const tagGroups = recordTagGroups(record).filter((group) => group.key !== "VISIT");
  return (
    <article id={panelId} className="r-place-record" aria-label={`${record.tasterName}의 기록`}>
      {headline && <p className="r-place-record__quote">&ldquo;{headline}&rdquo;</p>}
      {detail && <p className="r-place-record__story">{detail}</p>}

      {tagGroups.length > 0 && (
        <section className="r-place-record__part" aria-labelledby={`${panelId}-style`}>
          <h2 className="r-place-section__title" id={`${panelId}-style`}>
            이런 스타일이에요
          </h2>
          <ul className="r-place-styles">
            {tagGroups.map((group) => (
              <li key={group.key}>
                <span className="r-place-styles__head">
                  <b>{group.label}</b>
                  <em>{group.tags.length}개</em>
                </span>
                <span className="r-place-styles__tags">
                  {group.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
