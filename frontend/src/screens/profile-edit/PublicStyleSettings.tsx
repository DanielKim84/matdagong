import FoodFocusPicker from "../../components/FoodFocusPicker";
import Icon, { type IconName } from "../../components/Icon";
import TasteTagPicker from "../../components/TasteTagPicker";
import type { ActivityScope } from "../../models/community";
import { groupsForFocus } from "../../models/tasteTags";
import ActivityRegionField from "./ActivityRegionField";
import type { ProfileForm } from "./useProfileForm";

const ACTIVITY_SCOPE_OPTIONS: { value: ActivityScope; label: string; description: string; icon: IconName }[] = [
  { value: "LOCAL", label: "지역 중심", description: "주 활동 지역의 맛집을 소개해요.", icon: "pin" },
  { value: "TRAVEL", label: "여행·드라이브", description: "전국 여행지 주변을 찾아다녀요.", icon: "route" },
  { value: "BOTH", label: "둘 다", description: "동네와 여행지 모두 소개해요.", icon: "home" },
];

/** 방문자에게 공개되는 맛집 소개 스타일(분야, 활동 범위·지역, 태그)입니다. 접어 둔 채 시작합니다. */
export default function PublicStyleSettings({ form }: { form: ProfileForm }) {
  return (
    <details className="r-card public-style-settings">
      <summary>
        <span>
          <b>
            내가 소개하는 맛집 스타일 <em>선택 · 공개</em>
          </b>
          <small>방문자에게 내가 올리는 맛집의 성향을 보여줘요.</small>
        </span>
        <Icon name="chevron" />
      </summary>
      <div>
        <p>
          이 항목은 방문자에게 공개되는 내 맛집 소개 스타일이에요.
          <br />
          비공개 추천 취향과는 별도로 관리돼요.
        </p>
        <button type="button" className="copy-taste-button" onClick={form.copyPreferenceToProfile}>
          <Icon name="heart" /> 추천 취향에서 복사
        </button>
        {form.copyNotice && (
          <small className="copy-taste-notice" role="status">
            {form.copyNotice}
          </small>
        )}
        <small className="copy-taste-help">
          추천 취향의 분야와 좋아하는 태그만 가져옵니다. 피하고 싶은 조건은 공개되지 않아요. 복사 후 두 설정은 따로
          수정할 수 있고, 프로필 저장을 눌러야 반영됩니다.
        </small>
        <FoodFocusPicker label="어떤 곳을 소개하나요?" value={form.tasterFocus} onChange={form.changeTasterFocus} />
        <fieldset className="activity-scope-picker">
          <legend>주로 어디에서 활동하나요?</legend>
          <div>
            {ACTIVITY_SCOPE_OPTIONS.map((option) => (
              <label key={option.value}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="activity-scope"
                  checked={form.activityScope === option.value}
                  onChange={() => form.changeActivityScope(option.value)}
                />
                <span>
                  <Icon name={option.icon} />
                  <b>{option.label}</b>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {form.activityScope !== "TRAVEL" && (
          <ActivityRegionField
            regions={form.regions}
            value={form.activityRegion}
            hasCatalogError={form.hasCatalogError}
            onChange={form.changeActivityRegion}
          />
        )}
        <TasteTagPicker
          options={form.positiveOptions}
          value={form.profileTags}
          onChange={form.setProfileTags}
          groups={groupsForFocus(form.tasterFocus)}
        />
      </div>
    </details>
  );
}
