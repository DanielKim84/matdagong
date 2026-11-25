import FoodFocusPicker from "../../components/FoodFocusPicker";
import Icon from "../../components/Icon";
import TasteTagPicker from "../../components/TasteTagPicker";
import { TASTE_TAG_GROUPS, groupsForFocus } from "../../models/tasteTags";
import EditNotice from "./EditNotice";
import type { ProfileForm } from "./useProfileForm";

/** 피하고 싶은 조건(매장 이용 VISIT)의 최대 수. 태그 사전의 분류 한도를 그대로 씁니다. */
const AVOID_LIMIT = TASTE_TAG_GROUPS.find((group) => group.id === "VISIT")?.limit ?? 5;

/**
 * 추천 취향·제외 조건(보드 15-04): 나만 보는 추천 조건입니다. 자물쇠 안내 → 하트 "선호 태그 · 분류별 선택"(분류마다 펼친 칩)과
 * 오른쪽 "태그 제안받기" → 가는 선 → 금지 표시 "피하고 싶은 조건 최대 5개"(매장 이용 칩)와 "태그 제안받기"입니다.
 * 보드에 없는 분야 고르기는 기능을 지키려고 위에 작게 둡니다. 공개 프로필에는 보이지 않습니다.
 */
export default function TastePreferenceTab({ form, onRequestTag }: { form: ProfileForm; onRequestTag: () => void }) {
  const requestButton = (
    <button type="button" className="profile-edit-pill" onClick={onRequestTag}>
      <Icon name="tag" />
      태그 제안받기
    </button>
  );
  return (
    <section className="settings-panel taste-settings-panel" aria-label="추천 취향·제외 조건 설정">
      <EditNotice
        icon="lock"
        title="나만의 추천 조건입니다"
        message="맛다공이 내 취향에 맞는 맛집을 추천할 때 사용되는 설정으로, 공개 프로필에 노출되지 않아요."
      />
      <FoodFocusPicker
        label="분야"
        value={form.preferenceFocus}
        onChange={form.changePreferenceFocus}
        variant="chips"
      />
      <section className="taste-settings-block" aria-labelledby="taste-like-title">
        <h2 id="taste-like-title" className="taste-section-heading">
          <Icon name="heart" />
          선호 태그 · 분류별 선택
        </h2>
        <p>내가 더 자주 보고 싶은 취향이에요.</p>
        <TasteTagPicker
          options={form.positiveOptions}
          value={form.preferenceTags}
          groups={groupsForFocus(form.preferenceFocus)}
          onChange={form.changePreferenceTags}
          inline
        />
        {requestButton}
      </section>
      <section className="taste-settings-block" aria-labelledby="taste-avoid-title">
        <h2 id="taste-avoid-title" className="taste-section-heading">
          <Icon name="ban" />
          피하고 싶은 조건 <small>최대 {AVOID_LIMIT}개</small>
        </h2>
        <p>추천에서 제외하고 싶은 조건이에요.</p>
        <TasteTagPicker
          options={form.avoidOptions}
          value={form.excludedTags}
          groups={["VISIT"]}
          onChange={form.changeExcludedTags}
        />
        {requestButton}
      </section>
    </section>
  );
}
