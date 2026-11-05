/** 맛다공 캐릭터 시트(5×2 칸, 칸마다 396.6×396.5) 그림입니다. 캐릭터 그림·기본 아바타·지도 핀이 함께 씁니다. */
export const CHARACTER_SHEET = { url: "/assets/avatars/matdagong-characters-v1.png", width: 1983, height: 793 };

/** 캐릭터 시트에서 pose번(1~10) 칸만 보이게 하는 SVG viewBox입니다. 범위를 벗어나면 가까운 칸으로 맞춥니다. */
export function characterViewBox(pose: number): string {
  const cell = Math.min(10, Math.max(1, Math.trunc(pose))) - 1;
  return `${(cell % 5) * 396.6} ${Math.floor(cell / 5) * 396.5} 396.6 396.5`;
}

/**
 * 맛다공 캐릭터 시트에서 한 칸을 골라 그립니다.
 * 1 손인사 · 2 한입 · 3 프라이팬 · 4 하트 · 5 엄지 · 6 메뉴판 · 7 반짝 · 8 젓가락 · 9 웃음 · 10 뚝배기
 */
export default function MascotArt({
  pose,
  label = "",
  className = "",
}: {
  pose: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={`r-mascot ${className}`}
      viewBox={characterViewBox(pose)}
      preserveAspectRatio="xMidYMid meet"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={!label}
    >
      <image href={CHARACTER_SHEET.url} width={CHARACTER_SHEET.width} height={CHARACTER_SHEET.height} />
    </svg>
  );
}
