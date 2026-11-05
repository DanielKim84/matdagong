/** 문자열(ID)을 늘 같은 0 이상 정수로 바꿉니다. ID마다 기본 그림을 하나로 고정해 고를 때 씁니다. */
export function stableHash(text: string): number {
  return [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}
