import { useState } from "react";
import { go } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import NicknameCheckNote from "../../components/NicknameCheckNote";
import { MAX_ACTIVITY_REGIONS, MAX_NICKNAME_LENGTH, type ActivityScope } from "../../models/community";
import { regionLabel } from "../../models/region";
import { MAX_COVER_COUNT } from "../../utils/profileImages";
import AvatarEditor from "./AvatarEditor";
import EditNotice from "./EditNotice";
import RegionAddSheet from "./RegionAddSheet";
import { MAX_INTRO_LENGTH, type ProfileForm, type ProfileView } from "./useProfileForm";

const ACTIVITY_SCOPE_OPTIONS: { value: ActivityScope; label: string; icon: IconName }[] = [
  { value: "LOCAL", label: "지역 중심", icon: "pin" },
  { value: "TRAVEL", label: "여행·드라이브", icon: "route" },
  { value: "BOTH", label: "둘 다", icon: "home" },
];

/**
 * 공개 프로필 편집(보드 15-01): 공개 안내 → 큰 프로필 사진 → 닉네임 · 소개 → 활동 지역("활동 지역 (i) · 최대 3개 선택" 제목,
 * 고른 지역 칩 한 줄과 끝의 ›(지역 추가 시트), 그 아래 작게 활동 범위 칩) → 배경 사진 · 공개 스타일 태그 · 추천 취향 화면으로 가는 줄입니다.
 * 보드처럼 지역 칩에 ×를 두지 않고 칩을 누르면 빠집니다. (i)를 누르면 그 방법을 알려 줍니다.
 */
export default function PublicProfileTab({ form }: { form: ProfileForm }) {
  const [isRegionAddOpen, setIsRegionAddOpen] = useState(false);
  const [isRegionHelpOpen, setIsRegionHelpOpen] = useState(false);
  const coverCount = form.cover.gallery.length;
  const canAddRegion = form.activityRegions.length < MAX_ACTIVITY_REGIONS;
  const rows: { view: ProfileView; icon: IconName; label: string; meta: string }[] = [
    { view: "cover", icon: "image", label: "배경 사진", meta: `${coverCount}/${MAX_COVER_COUNT}` },
    {
      view: "style",
      icon: "tag",
      label: "공개 스타일 태그",
      meta: form.profileTags.length ? `${form.profileTags.length}개` : "선택",
    },
    { view: "taste", icon: "lock", label: "추천 취향·제외 조건", meta: "나만 보기" },
  ];

  return (
    <section className="settings-panel profile-edit-basics" aria-label="공개 프로필 설정">
      <EditNotice
        icon="globe"
        title="공개 프로필입니다"
        message="닉네임, 사진, 소개, 활동 지역이 다른 맛다공 사용자에게 보여요."
      />
      <AvatarEditor form={form} />

      <label className="profile-edit-field">
        <span>닉네임</span>
        <span className="profile-edit-input">
          <input
            value={form.nickname}
            onChange={(event) => form.changeNickname(event.target.value)}
            maxLength={MAX_NICKNAME_LENGTH}
            required
            placeholder="맛다공에서 사용할 이름"
            aria-invalid={form.nicknameCheck === "taken"}
          />
          <small aria-label={`${form.nickname.length}자, 최대 ${MAX_NICKNAME_LENGTH}자`}>
            {form.nickname.length}/{MAX_NICKNAME_LENGTH}
          </small>
        </span>
        <NicknameCheckNote check={form.nicknameCheck} />
      </label>

      <label className="profile-edit-field">
        <span>소개</span>
        <span className="profile-edit-input is-multiline">
          <textarea
            value={form.intro}
            onChange={(event) => form.changeIntro(event.target.value)}
            maxLength={MAX_INTRO_LENGTH}
            rows={3}
            placeholder="내가 좋아하는 한 끼, 자주 찾는 동네…"
          />
          <small aria-label={`${form.intro.length}자, 최대 ${MAX_INTRO_LENGTH}자`}>
            {form.intro.length}/{MAX_INTRO_LENGTH}
          </small>
        </span>
      </label>

      <fieldset className="profile-edit-field activity-scope-chips">
        <legend>
          활동 지역
          <button
            type="button"
            className="activity-region-help"
            aria-label="활동 지역 도움말"
            aria-expanded={isRegionHelpOpen}
            onClick={() => setIsRegionHelpOpen((current) => !current)}
          >
            <Icon name="info" />
          </button>
          <small>최대 {MAX_ACTIVITY_REGIONS}개 선택</small>
        </legend>
        {isRegionHelpOpen && (
          <p className="activity-region-help__text" role="status">
            고른 지역 칩을 누르면 빠지고, › 로 지역을 더해요. 여행·드라이브를 고르면 지역 없이 공개돼요.
          </p>
        )}
        {/* 여행·드라이브는 한 지역에 묶이지 않아 지역을 고르지 않습니다. 고른 지역은 이름표 칩(누르면 빼기)과 끝의 › 입니다. */}
        {form.activityScope !== "TRAVEL" && (
          <div className="activity-region-row">
            <div className="r-chips activity-region-chips" aria-label="고른 활동 지역">
              {form.activityRegions.map((region) => (
                <button
                  key={region}
                  type="button"
                  className="r-chip is-on"
                  onClick={() => form.removeActivityRegion(region)}
                  aria-label={`${region} 빼기`}
                  title={region}
                >
                  {regionLabel(region)}
                </button>
              ))}
              {!form.activityRegions.length && <span className="activity-region-row__empty">지역을 골라 주세요</span>}
            </div>
            <button
              type="button"
              className="activity-region-row__add"
              aria-label="활동 지역 추가"
              disabled={!canAddRegion}
              onClick={() => setIsRegionAddOpen(true)}
            >
              <Icon name="chevron" />
            </button>
          </div>
        )}
        <div className="r-chips r-chips--wrap activity-scope-chips__range" role="radiogroup" aria-label="활동 범위">
          {ACTIVITY_SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={form.activityScope === option.value}
              className={`r-chip ${form.activityScope === option.value ? "is-on" : ""}`}
              onClick={() => form.changeActivityScope(option.value)}
            >
              <Icon name={option.icon} />
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      {isRegionAddOpen && (
        <RegionAddSheet
          regions={form.regions}
          hasCatalogError={form.hasCatalogError}
          onAdd={form.addActivityRegion}
          onClose={() => setIsRegionAddOpen(false)}
        />
      )}

      {/* 배경 사진·공개 스타일·추천 취향은 각자 화면(보드 15-02~04)에서 고칩니다. 고친 내용은 저장 전까지 이 화면에도 남습니다. */}
      <ul className="r-card profile-edit-links">
        {rows.map((row) => (
          <li key={row.view}>
            <button type="button" onClick={() => go("profile-edit", row.view)}>
              <Icon name={row.icon} />
              <b>{row.label}</b>
              <small>{row.meta}</small>
              <Icon name="chevron" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
