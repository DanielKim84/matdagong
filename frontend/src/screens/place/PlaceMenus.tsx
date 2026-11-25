import Icon from "../../components/Icon";
import { formatWon } from "../../utils/format";
import { photoIndexOf, recordMenus, type PlacePhoto, type PlaceRecord } from "./placeRecords";

/** 대표 메뉴(보드 09-03): 메뉴마다 옅은 테두리 상자에 사진 · 이름 · 가격 · >. 사진이 있으면 눌러 크게 봅니다. 고른 맛객의 메뉴입니다. */
export default function PlaceMenus({
  record,
  photos,
  onOpenPhoto,
}: {
  record: PlaceRecord;
  /** 이 맛객의 사진(사진 보기와 같은 순서) */
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
}) {
  const menus = recordMenus(record);
  if (!menus.length) return null;
  return (
    <section className="r-place-section" aria-labelledby="place-menus-title">
      <h2 className="r-place-section__title" id="place-menus-title">
        대표 메뉴
      </h2>
      <ul className="r-place-record__menus">
        {menus.map((menu, index) => {
          const photoIndex = photoIndexOf(photos, menu.photo);
          const label = (
            <span className="r-place-record__menu-text">
              <span>{menu.name}</span>
              {menu.price != null && <b>{formatWon(menu.price)}</b>}
            </span>
          );
          return (
            <li key={`${menu.name}-${index}`}>
              {photoIndex >= 0 && menu.photo ? (
                <button
                  type="button"
                  onClick={() => onOpenPhoto(photoIndex)}
                  aria-label={`${menu.name} 사진 크게 보기`}
                >
                  <img className="r-place-record__menu-photo" src={menu.photo} alt="" loading="lazy" decoding="async" />
                  {label}
                  <Icon name="chevron" />
                </button>
              ) : (
                <div>
                  <span className="r-place-record__menu-photo is-empty" aria-hidden="true">
                    <Icon name="fork" />
                  </span>
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
