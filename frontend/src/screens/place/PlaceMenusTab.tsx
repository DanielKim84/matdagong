import Icon from "../../components/Icon";
import { EmptyState } from "../../components/ui";
import { formatWon } from "../../utils/format";
import { photoIndexOf, summarizeMenus, type PlacePhoto, type PlaceRecord } from "./placeRecords";

/** 맛집 상세의 메뉴 탭. 맛객들이 추천한 메뉴를 추천 수 순으로 모아 보여 줍니다. */
export default function PlaceMenusTab({
  records,
  photos,
  onOpenPhoto,
}: {
  records: PlaceRecord[];
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
}) {
  const menus = summarizeMenus(records);

  return (
    <section className="r-place-section" aria-label="추천 메뉴">
      <span className="r-label">맛객들이 추천한 메뉴</span>
      {menus.length > 0 ? (
        <div className="r-place-menus">
          {menus.map((menu) => {
            const photoIndex = photoIndexOf(photos, menu.photo);
            const body = (
              <>
                <span className="r-place-menu__photo">
                  {menu.photo ? <img src={menu.photo} alt="" loading="lazy" decoding="async" /> : <Icon name="fork" />}
                </span>
                <span className="r-place-menu__copy">
                  <b>{menu.name}</b>
                  {menu.price != null && <strong>{formatWon(menu.price)}</strong>}
                  <small>맛객 {menu.count}명 추천</small>
                </span>
              </>
            );
            return photoIndex >= 0 ? (
              <button
                type="button"
                className="r-card r-place-menu"
                key={menu.name}
                onClick={() => onOpenPhoto(photoIndex)}
                aria-label={`${menu.name} 사진 크게 보기`}
              >
                {body}
              </button>
            ) : (
              <div className="r-card r-place-menu" key={menu.name}>
                {body}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="아직 추천 메뉴가 없어요" message="맛객이 메뉴를 남기면 여기에 모아 보여 드려요." />
      )}
    </section>
  );
}
