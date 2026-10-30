/**
 * 맛다공 캐릭터 시트(5×2)에서 한 칸을 골라 그립니다.
 * 1 손인사 · 2 한입 · 3 프라이팬 · 4 하트 · 5 엄지 · 6 메뉴판 · 7 반짝 · 8 젓가락 · 9 웃음 · 10 뚝배기
 */
export default function MascotArt({ pose, label = "", className = "" }: { pose: number; label?: string; className?: string }) {
  const cell = Math.min(10, Math.max(1, Math.trunc(pose))) - 1;
  return (
    <svg
      className={`r-onboarding-mascot ${className}`}
      viewBox={`${(cell % 5) * 396.6} ${Math.floor(cell / 5) * 396.5} 396.6 396.5`}
      preserveAspectRatio="xMidYMid meet"
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={!label}
    >
      <image href="/assets/avatars/matdagong-characters-v1.png" width="1983" height="793" />
    </svg>
  );
}
