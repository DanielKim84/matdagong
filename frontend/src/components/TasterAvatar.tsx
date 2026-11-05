import type { Taster } from "../models/place";
import { avatarFallback, avatarSource } from "../utils/profileMedia";
import { Avatar } from "./BrandAssets";

/** 맛객 사진에 필요한 값만 받습니다. 구독자처럼 Taster가 아닌 값도 이 모양으로 넘기면 됩니다. */
export type AvatarTaster = Pick<Taster, "tasterId" | "tasterName" | "avatarVariant"> & { avatar?: string | null };

/**
 * 맛객 사진 하나의 공통 모양입니다(맛객 탭·프로필·구독 목록·맛집 상세·사진 보기·가입 추천).
 * 올린 사진 주소를 화면용으로 바꾸고, 사진이 없거나 깨지면 계정별 기본 그림으로 바꿉니다.
 */
export default function TasterAvatar({ taster, className }: { taster: AvatarTaster; className?: string }) {
  return (
    <Avatar
      className={className}
      src={avatarSource(taster.tasterId, taster.avatar)}
      fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
      name={taster.tasterName}
      variant={taster.avatarVariant}
    />
  );
}
