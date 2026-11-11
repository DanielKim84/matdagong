/** 가게 검색 결과(기록하기의 장소 고르기, 빠른 저장)에서 검색어와 처음 겹치는 부분을 <mark>로 강조합니다. */
export default function SearchHighlight({ text, query }: { text: string; query: string }) {
  const keyword = query.trim();
  const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + keyword.length)}</mark>
      {text.slice(at + keyword.length)}
    </>
  );
}
