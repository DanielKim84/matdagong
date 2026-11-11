import { Avatar } from "../../components/BrandAssets";
import FoodFocusPicker from "../../components/FoodFocusPicker";
import Icon from "../../components/Icon";
import TasteTagPicker from "../../components/TasteTagPicker";
import { groupsForFocus } from "../../models/tasteTags";
import type { ProfileForm } from "./useProfileForm";

/** 비공개 추천 취향 탭: 찾는 분야, 좋아하는 태그, 추천에서 뺄 조건입니다. */
export default function TastePreferenceTab({ form }: { form: ProfileForm }) {
  return (
    <section
      className="settings-panel taste-settings-panel"
      hidden={form.activeTab !== "taste"}
      aria-label="비공개 추천 취향 설정"
    >
      <div className="taste-settings-intro">
        <span className="taste-settings-mascot">
          <Avatar name="맛다공" variant={3} />
          <i>
            <Icon name="sparkle" />
          </i>
        </span>
        <h2>오늘도, 내 입맛대로</h2>
        <p>
          좋아하는 취향을 알려 주시면
          <br />
          나와 잘 맞는 맛객을 먼저 추천해 드려요.
        </p>
        <small>나만의 설정이에요 · 프로필에 공개되지 않아요</small>
      </div>
      <section className="taste-settings-block">
        <FoodFocusPicker
          label="어떤 곳을 찾고 있나요?"
          value={form.preferenceFocus}
          onChange={form.changePreferenceFocus}
        />
      </section>
      <section className="taste-settings-block">
        <div className="taste-section-heading">
          <h2>이런 곳이 좋아요</h2>
          <span>분류별 선택</span>
        </div>
        <TasteTagPicker
          options={form.positiveOptions}
          value={form.preferenceTags}
          groups={groupsForFocus(form.preferenceFocus)}
          onChange={form.changePreferenceTags}
        />
      </section>
      <section className="taste-settings-block avoid-settings-block">
        <div className="taste-section-heading">
          <h2>추천에서 제외</h2>
          <span>선택</span>
        </div>
        <p>해당 조건이 등록된 맛집은 홈과 지도에서 숨겨요.</p>
        <TasteTagPicker
          options={form.avoidOptions}
          value={form.excludedTags}
          groups={["VISIT"]}
          onChange={form.changeExcludedTags}
        />
      </section>
    </section>
  );
}
