import { useState } from "react";
import Icon from "../../components/Icon";
import SubScreen from "../../components/SubScreen";
import { Segmented } from "../../components/ui";
import { useRegionCatalog } from "../../hooks/useRegionCatalog";
import { shortSidoName, sidoOrder, type RegionData } from "../../models/region";

/** 고른 지역: 지도를 옮길 주소 검색어와 배율, 화면에 보일 이름입니다. */
export type RegionPick = { query: string; level: number; label: string };

type Step = "sido" | "district";

/** 구/군 하나를 볼 때의 지도 배율(카카오 level, 클수록 넓게)입니다. 동네 몇 개가 함께 보이는 정도입니다. */
const DISTRICT_LEVEL = 7;
// 법정동 목록에서 시·군·구가 없는 세종시는 "(직할)" 한 칸뿐이라 구/군 탭을 두지 않습니다(profile-edit/regionSelection.ts와 같은 표시).
const DIRECT_DISTRICT = "(직할)";

/** 시/도 전체를 볼 때의 배율: 서울·세종은 좁게, 도(道)와 통합특별시는 넓게, 나머지 광역시는 그 사이입니다. */
function sidoLevel(name: string): number {
  if (name === "서울특별시" || name === "세종특별자치시") return 9;
  return name.endsWith("도") || name.endsWith("통합특별시") ? 11 : 10;
}
function labelOf(sido: RegionData): string {
  return shortSidoName(sido.name) ?? sido.name;
}
function districtsOf(sido: RegionData): string[] {
  return sido.districts.map((district) => district.name).filter((name) => name !== DIRECT_DISTRICT);
}

/**
 * 발견 "지역 선택"(보드 05-02, 전체 화면): 지역명 검색, 내 위치로 보기, 시/도 선택 | 구/군 선택 밑줄 탭과 세 칸 버튼, 아래 "선택하기".
 * 목록은 프로필 활동 지역과 같은 법정동 목록(hooks/useRegionCatalog)을 씁니다. 시/도를 누르면 구/군 탭으로 넘어가고,
 * 구/군을 고르지 않고 선택하면 시/도 전체를 보여 줍니다. 고른 지역의 좌표는 부르는 쪽(DiscoverScreen)이 카카오 주소 검색으로 찾습니다.
 */
export default function RegionScreen({
  onPick,
  onMyArea,
  onClose,
}: {
  onPick: (pick: RegionPick) => void;
  onMyArea: () => void;
  onClose: () => void;
}) {
  const { regions, hasCatalogError } = useRegionCatalog();
  const sidos = [...regions].sort((a, b) => sidoOrder(a.name) - sidoOrder(b.name));
  const [keyword, setKeyword] = useState("");
  const [step, setStep] = useState<Step>("sido");
  const [sido, setSido] = useState<RegionData | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const text = keyword.replace(/\s+/g, "");
  // 지역명 검색: "마포"처럼 일부만 써도 시/도·구/군 이름에 들어 있으면 찾습니다.
  const matches = text
    ? sidos.flatMap((item) => [
        ...(`${labelOf(item)}${item.name}`.includes(text) ? [{ sido: item, district: null }] : []),
        ...districtsOf(item)
          .filter((name) => `${labelOf(item)}${name}`.replace(/\s+/g, "").includes(text))
          .map((name) => ({ sido: item, district: name })),
      ])
    : [];

  function pickSido(next: RegionData) {
    setSido(next);
    setDistrict(null);
    // 구/군이 없는 곳(세종)은 탭을 넘기지 않고 바로 고를 수 있게 둡니다.
    if (districtsOf(next).length) setStep("district");
  }
  function pick(target: RegionData, targetDistrict: string | null) {
    onPick(
      targetDistrict
        ? {
            query: `${target.name} ${targetDistrict}`,
            level: DISTRICT_LEVEL,
            label: `${labelOf(target)} ${targetDistrict}`,
          }
        : { query: target.name, level: sidoLevel(target.name), label: labelOf(target) },
    );
  }

  return (
    <SubScreen
      title="지역 선택"
      onClose={onClose}
      className="r-region-sheet"
      footer={
        !text && (
          <button
            type="button"
            className="r-button r-button--primary"
            disabled={!sido}
            onClick={() => sido && pick(sido, district)}
          >
            선택하기
          </button>
        )
      }
    >
      <label className="r-search-field r-region-sheet__search">
        <Icon name="search" />
        <span className="visually-hidden">지역 검색</span>
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="지역명으로 검색하기"
          enterKeyHint="search"
        />
        {keyword && (
          <button
            type="button"
            className="r-search-field__clear"
            aria-label="검색어 지우기"
            onClick={() => setKeyword("")}
          >
            <Icon name="close" />
          </button>
        )}
      </label>

      {text ? (
        matches.length ? (
          <ul className="r-region-sheet__results" aria-label="지역 검색 결과">
            {matches.slice(0, 20).map((match) => (
              <li key={`${match.sido.name}-${match.district ?? ""}`}>
                <button type="button" onClick={() => pick(match.sido, match.district)}>
                  <Icon name="pin" />
                  {labelOf(match.sido)}
                  {match.district && ` ${match.district}`}
                  <Icon name="chevron" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="r-region-sheet__empty">‘{keyword.trim()}’에 맞는 지역이 없어요. 시·구 이름으로 찾아보세요.</p>
        )
      ) : (
        <>
          <button type="button" className="r-region-sheet__mine" onClick={onMyArea}>
            <span className="r-region-sheet__mine-icon" aria-hidden="true">
              <Icon name="locate" />
            </span>
            <span>
              <b>내 위치로 보기</b>
              <small>지금 있는 위치 주변의 맛집을 볼게요.</small>
            </span>
            <Icon name="chevron" />
          </button>

          <Segmented<Step>
            label="지역 단계"
            variant="underline"
            value={step}
            onChange={(next) => {
              // 시/도를 아직 안 골랐거나 구/군이 없는 곳이면 구/군 탭으로 넘어가지 않습니다.
              if (next === "district" && !(sido && districtsOf(sido).length)) return;
              setStep(next);
            }}
            options={[
              { value: "sido", label: "시/도 선택" },
              { value: "district", label: "구/군 선택" },
            ]}
          />

          {!regions.length ? (
            <p className="r-region-sheet__empty">
              {hasCatalogError
                ? "지역 목록을 불러오지 못했어요. 지역명 검색을 써 주세요."
                : "지역 목록을 불러오고 있어요…"}
            </p>
          ) : (
            <div className="r-region-sheet__grid" role="group" aria-label={step === "sido" ? "시/도" : "구/군"}>
              {step === "sido"
                ? sidos.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={sido?.name === item.name ? "is-on" : ""}
                      aria-pressed={sido?.name === item.name}
                      onClick={() => pickSido(item)}
                    >
                      {labelOf(item)}
                    </button>
                  ))
                : sido && [
                    <button
                      key="all"
                      type="button"
                      className={district === null ? "is-on" : ""}
                      aria-pressed={district === null}
                      onClick={() => setDistrict(null)}
                    >
                      {labelOf(sido)} 전체
                    </button>,
                    ...districtsOf(sido).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={district === item ? "is-on" : ""}
                        aria-pressed={district === item}
                        onClick={() => setDistrict(item)}
                      >
                        {item}
                      </button>
                    )),
                  ]}
            </div>
          )}
        </>
      )}
    </SubScreen>
  );
}
