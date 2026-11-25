import FoodFocusPicker from "../../components/FoodFocusPicker";
import Icon from "../../components/Icon";
import TasteTagPicker from "../../components/TasteTagPicker";
import { groupsForFocus } from "../../models/tasteTags";
import EditNotice from "./EditNotice";
import type { ProfileForm } from "./useProfileForm";

/**
 * 공개 스타일 태그(보드 15-03): 방문자에게 공개되는 맛집 소개 스타일입니다. 공개 안내 아래 분류마다 "아이콘 · 이름 · N/한도" 제목과 칩을
 * 모두 펼치고 분류 사이를 선으로 나눕니다. 보드에 없는 분야 고르기와 "추천 취향에서 가져오기"는 기능을 지키려고 위에 작게 둡니다.
 * 비공개 추천 취향(15-04)과 따로 관리하고, 추천 취향의 분야·좋아하는 태그만 복사해 올 수 있습니다.
 */
export default function PublicStyleSettings({ form }: { form: ProfileForm }) {
  return (
    <section className="settings-panel public-style-settings" aria-label="공개 스타일 태그 설정">
      <EditNotice
        icon="globe"
        title="공개 스타일 태그입니다"
        message="내가 좋아하는 분야와 특징을 다른 사용자도 볼 수 있어요."
      />
      <FoodFocusPicker label="분야" value={form.tasterFocus} onChange={form.changeTasterFocus} variant="chips" />
      <button type="button" className="profile-edit-pill" onClick={form.copyPreferenceToProfile}>
        <Icon name="heart" />
        추천 취향에서 가져오기
      </button>
      {form.copyNotice && (
        <small className="copy-taste-notice" role="status">
          {form.copyNotice}
        </small>
      )}
      <TasteTagPicker
        options={form.positiveOptions}
        value={form.profileTags}
        onChange={form.setProfileTags}
        groups={groupsForFocus(form.tasterFocus)}
        inline
        hasIcon
      />
    </section>
  );
}
