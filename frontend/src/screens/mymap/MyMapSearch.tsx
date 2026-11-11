import { useState, type FormEvent } from "react";
import Icon from "../../components/Icon";
import { searchKakaoPlaces } from "../../services/kakao";
import { categoryLabel } from "../../utils/format";
import { errorMessage } from "../../utils/errorMessage";
import { kakaoPlaceAddress } from "../../utils/geo";

const SEARCH_MIN_LENGTH = 2;

/**
 * 내 지도의 가게 검색입니다. 발견 검색(맛다공에 기록된 가게)과 달리 카카오맵처럼 지역과 상관없이 모든 가게를 찾습니다.
 * 검색어를 넣고 찾기를 누르면 결과 목록을 펼치고, 고르면 부르는 쪽에 알리고 목록을 닫습니다.
 */
export default function MyMapSearch({ onSelect }: { onSelect: (result: KakaoPlaceResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  async function search(event: FormEvent) {
    event.preventDefault();
    const keyword = query.trim();
    if (keyword.length < SEARCH_MIN_LENGTH) {
      setError("가게 이름이나 지역을 두 글자 이상 입력해 주세요.");
      setResults(null);
      return;
    }
    setIsSearching(true);
    setError("");
    try {
      setResults(await searchKakaoPlaces(keyword));
    } catch (cause) {
      setError(errorMessage(cause, "가게를 찾지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }

  function clear() {
    setQuery("");
    setResults(null);
    setError("");
  }

  function select(result: KakaoPlaceResult) {
    setResults(null);
    onSelect(result);
  }

  return (
    <div className="r-mymap-search">
      <form className="r-discover-search" role="search" onSubmit={(event) => void search(event)}>
        <Icon name="search" />
        <span className="visually-hidden">가게 검색</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="가고 싶은 가게를 어디서든 찾아요 (예: 제주 고기국수)"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="r-discover-search__clear" aria-label="검색어 지우기" onClick={clear}>
            <Icon name="close" />
          </button>
        )}
        <button type="submit" className="r-mymap-search__submit" disabled={isSearching}>
          {isSearching ? "찾는 중…" : "찾기"}
        </button>
      </form>
      {error && (
        <p className="r-mymap-search__message" role="alert">
          {error}
        </p>
      )}
      {results && (
        <div className="r-card r-mymap-search__results">
          {results.length ? (
            <ul aria-label="검색한 가게">
              {results.map((result) => (
                <li key={result.id}>
                  <button type="button" onClick={() => select(result)}>
                    <b>{result.place_name}</b>
                    <small>
                      {[categoryLabel(result.category_name), kakaoPlaceAddress(result)].filter(Boolean).join(" · ")}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="r-mymap-search__message" role="status">
              ‘{query.trim()}’에 맞는 가게가 없어요. 지역 이름을 함께 넣어 보세요.
            </p>
          )}
          <button type="button" className="r-text-button r-mymap-search__close" onClick={() => setResults(null)}>
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
