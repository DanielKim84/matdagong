import { useEffect, useRef, useState, type FormEvent } from "react";
import { Segmented, TopBar } from "../components/ui";
import { Avatar } from "../components/BrandAssets";
import Icon from "../components/Icon";
import TasteTagPicker from "../components/TasteTagPicker";
import FoodFocusPicker from "../components/FoodFocusPicker";
import TasteTagRequestSheet from "./TasteTagRequestSheet";
import { useNotificationDialog } from "../components/NotificationDialog";
import { filterTagsForFocus } from "../models/tasteTags";
import PaginationDots from "../components/PaginationDots";
import { swipeHandlers, wrapIndex } from "../utils/swipe";
import type { ActivityScope, FoodFocus, MyProfile, TasteTag, TagRequest, TagRequestInput } from "../services/community";

type RegionData = { name: string; districts: { name: string; dongs: string[] }[] };
const regionAliases: Record<string, string[]> = {
  "서울특별시": ["서울"], "부산광역시": ["부산"], "대구광역시": ["대구"], "인천광역시": ["인천"],
  "광주광역시": ["광주"], "대전광역시": ["대전"], "울산광역시": ["울산"],
  "세종특별자치시": ["세종"], "경기도": ["경기"], "강원특별자치도": ["강원", "강원도"],
  "충청북도": ["충북"], "충청남도": ["충남"], "전북특별자치도": ["전북", "전라북도"],
  "전라남도": ["전남"], "경상북도": ["경북"], "경상남도": ["경남"],
  "제주특별자치도": ["제주", "제주도"],
};

function restoreRegionSelection(value: string | null | undefined, regions: RegionData[]) {
  const saved = value?.trim() ?? "";
  const selectedRegion = regions.find((region) => saved.includes(region.name)
    || regionAliases[region.name]?.some((alias) => saved.startsWith(alias)));
  const sido = selectedRegion?.name ?? "";
  const district = selectedRegion?.districts
    .find((item) => item.name !== "(직할)" && saved.includes(item.name))?.name
    ?? selectedRegion?.districts.find((item) => item.name === "(직할)")?.name ?? "";
  const dong = selectedRegion?.districts
    .find((item) => item.name === district)?.dongs.map((name) => name.split(" ")[0])
    .find((name) => saved.includes(name)) ?? "";
  return { sido, district, dong };
}

function RegionPicker({
  label, value, options, placeholder, disabled, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const filteredOptions = query ? options.filter((option) => option.includes(query.trim())) : options;

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`region-picker-field${open ? " is-open" : ""}`} ref={root}>
      <span>{label}</span>
      <button type="button" className="region-picker-trigger" aria-label={`${label} 선택`} aria-haspopup="listbox"
        aria-expanded={open} disabled={disabled} onClick={() => { setQuery(""); setOpen((current) => !current); }}>
        <span>{options.find((option) => option === value) ?? placeholder}</span>
        <Icon name="chevron" />
      </button>
      {open && (
        <div className="region-picker-menu" role="listbox" aria-label={label}>
          {options.length > 15 && <input autoFocus type="search" aria-label={`${label} 검색`} placeholder="지역 이름 검색"
            value={query} onChange={(event) => setQuery(event.target.value)} />}
          {filteredOptions.length ? filteredOptions.map((option) => (
            <button type="button" role="option" aria-selected={option === value} key={option}
              onClick={() => { onChange(option); setOpen(false); }}>
              {option}{option === value && <Icon name="check" />}
            </button>
          )) : <small>검색 결과가 없어요.</small>}
        </div>
      )}
    </div>
  );
}

type ProfileChanges = {
  nickname: string;
  intro: string;
  avatarFile?: File;
  coverFiles?: File[];
  removedCoverPhotoIds: string[];
  removeAvatar?: boolean;
  removeCover?: boolean;
  profileTags: string[];
  tasterFocus: FoodFocus;
  activityScope: ActivityScope;
  activityRegion: string;
  preferenceFocus: FoodFocus;
  preferenceTags: string[];
  excludedTags: string[];
};

export default function ProfileSettingsScreen({
  profile,
  initialTab = "profile",
  options,
  onSave,
  onError,
  onRequestTag,
  onLoadTagRequests,
}: {
  profile: MyProfile;
  initialTab?: "profile" | "taste";
  options: TasteTag[];
  onSave: (changes: ProfileChanges) => Promise<void>;
  onError: (message: string) => void;
  onRequestTag: (input: TagRequestInput) => Promise<TagRequest>;
  onLoadTagRequests: () => Promise<TagRequest[]>;
}) {
  const { confirm } = useNotificationDialog();
  const [activeTab, setActiveTab] = useState<"profile" | "taste">(initialTab);
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [regionCatalogError, setRegionCatalogError] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  // 실제로 피하고 싶은 조건만 제외 태그로 두고, 나머지는 소개·추천 취향에 씁니다.
  const positiveOptions = options.filter((tag) => tag.tagGroup !== "VISIT");
  const avoidOptions = options.filter((tag) => tag.tagGroup === "VISIT");
  const [nickname, setNickname] = useState(profile.nickname.slice(0, 12));
  const [intro, setIntro] = useState(profile.intro ?? "");
  const [avatarFile, setAvatarFile] = useState<File>();
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [removedCoverPhotoIds, setRemovedCoverPhotoIds] = useState<string[]>([]);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [profileTags, setProfileTags] = useState(profile.profileTags ?? []);
  const [preferenceTags, setPreferenceTags] = useState(profile.preferenceTags ?? []);
  const [excludedTags, setExcludedTags] = useState(profile.excludedTags ?? []);
  const [tasterFocus, setTasterFocus] = useState<FoodFocus>(profile.tasterFocus ?? "BOTH");
  const [activityScope, setActivityScope] = useState<ActivityScope>(profile.activityScope ?? "LOCAL");
  const [activityRegion, setActivityRegion] = useState({ sido: "", district: "", dong: "" });
  const [activityRegionChanged, setActivityRegionChanged] = useState(false);
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>(profile.preferenceFocus ?? "BOTH");
  const [saving, setSaving] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string>();
  const [coverPreviews, setCoverPreviews] = useState<string[]>([]);
  const [coverPreviewIndex, setCoverPreviewIndex] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/kr-legal-dong.json")
      .then((response) => {
        if (!response.ok) throw new Error("지역 목록을 불러오지 못했습니다.");
        return response.json() as Promise<{ regions: RegionData[] }>;
      })
      .then((data) => {
        if (!cancelled) setRegions(data.regions);
      })
      .catch(() => {
        if (!cancelled) setRegionCatalogError(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (regions.length) setActivityRegion(restoreRegionSelection(profile.activityRegion, regions));
  }, [regions, profile.activityRegion]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!coverFiles.length) {
      setCoverPreviews([]);
      return;
    }
    const urls = coverFiles.map((file) => URL.createObjectURL(file));
    setCoverPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [coverFiles]);

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      onError("JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("이미지는 5MB 이하로 선택해 주세요.");
      return;
    }
    setAvatarFile(file);
    setRemoveAvatar(false);
  }

  function chooseCoverImages(files: FileList | null) {
    if (!files?.length) return;
    const selected = [...files];
    const totalExistingCount = profile.profileCoverUrls?.length || (profile.profileCoverUrl ? 1 : 0);
    const existingCount = removeCover ? 0 : Math.max(0, totalExistingCount - removedCoverPhotoIds.length);
    if (selected.length + coverFiles.length + existingCount > 10) {
      onError("프로필 배경은 최대 10장까지 등록할 수 있어요.");
      return;
    }
    for (const file of selected) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
        onError("JPG, PNG, WEBP 이미지 파일을 장당 5MB 이하로 선택해 주세요.");
        return;
      }
    }
    setCoverFiles((current) => [...current, ...selected]);
    setCoverPreviewIndex(existingCount + coverFiles.length);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nickname.trim()) {
      setActiveTab("profile");
      onError("맛객 닉네임을 입력해 주세요.");
      return;
    }
    if (activityScope !== "TRAVEL" && activityRegionChanged
      && (activityRegion.sido || activityRegion.district || activityRegion.dong)
      && (!activityRegion.sido || !activityRegion.district || !activityRegion.dong)) {
      setActiveTab("profile");
      onError("주 활동 지역은 시·도, 시·군·구, 읍·면·동까지 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        nickname: nickname.trim(),
        intro: intro.trim(),
        profileTags: filterTagsForFocus(profileTags, tasterFocus, positiveOptions),
        tasterFocus,
        activityScope,
        // 화면에서는 공식 지역 목록으로 고르고, 기존 API 호환을 위해 저장할 때 한 문자열로 합칩니다.
        activityRegion: activityScope === "TRAVEL" ? "" : activityRegionChanged
          ? [activityRegion.sido, activityRegion.district && activityRegion.district !== "(직할)" ? activityRegion.district : "", activityRegion.dong]
            .filter(Boolean).join(" ")
          : profile.activityRegion ?? "",
        preferenceFocus,
        preferenceTags: filterTagsForFocus(preferenceTags, preferenceFocus, positiveOptions),
        excludedTags,
        avatarFile,
        coverFiles,
        removedCoverPhotoIds,
        removeAvatar,
        removeCover,
      });
      // 저장이 끝난 파일은 비워 다음 저장에서 같은 이미지를 다시 업로드하지 않습니다.
      setAvatarFile(undefined);
      setCoverFiles([]);
      setRemovedCoverPhotoIds([]);
      setCoverPreviewIndex(0);
      setRemoveAvatar(false);
      setRemoveCover(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const allExistingCoverUrls = profile.profileCoverUrls?.length
    ? profile.profileCoverUrls
    : profile.profileCoverUrl ? [profile.profileCoverUrl] : [];
  const existingCoverUrls = removeCover ? [] : allExistingCoverUrls.filter((url) => {
    const photoId = url.match(/\/covers\/([0-9a-f-]{36})(?:$|[?#])/i)?.[1];
    return !photoId || !removedCoverPhotoIds.includes(photoId);
  });
  const coverGallery = [...existingCoverUrls, ...coverPreviews];
  const activeCoverPreview = coverGallery[coverPreviewIndex] ?? "/assets/profile-cover.png";

  async function removeCoverPhotoAt(index: number) {
    if (!await confirm({ title: "배경 사진을 삭제할까요?", message: "프로필 저장을 누르면 삭제돼요.", confirmLabel: "삭제할게요", tone: "danger" })) return;

    const existingCount = existingCoverUrls.length;
    const localIndex = index - existingCount;
    if (index < existingCount) {
      const photoId = existingCoverUrls[index].match(/\/covers\/([0-9a-f-]{36})(?:$|[?#])/i)?.[1];
      if (photoId) setRemovedCoverPhotoIds((current) => current.includes(photoId) ? current : [...current, photoId]);
      else setRemoveCover(true);
    } else {
      setCoverFiles((current) => current.filter((_, fileIndex) => fileIndex !== localIndex));
    }

    const remainingCount = coverGallery.length - 1;
    setCoverPreviewIndex((current) => {
      if (remainingCount <= 0) return 0;
      if (current > index) return current - 1;
      if (current === index) return Math.min(index, remainingCount - 1);
      return current;
    });
  }

  return (
    <>
      <main className="r-screen r-me-edit profile-settings">
        <TopBar title="프로필 편집" fallback="my" />
        <div className="r-me-edit__tabs">
          <Segmented<"profile" | "taste">
            label="설정 구분"
            value={activeTab}
            onChange={setActiveTab}
            options={[{ value: "profile", label: "공개 프로필" }, { value: "taste", label: "추천 취향" }]}
          />
        </div>
        <form onSubmit={(event) => void submit(event)}>
          <section className="settings-panel" hidden={activeTab !== "profile"} aria-label="공개 프로필 설정">
            <div className="profile-edit-form">
              <section className="r-card profile-edit-avatar-section">
                <button className="profile-edit-avatar-button" type="button" onClick={() => avatarInput.current?.click()} aria-label="프로필 사진 변경">
                  <Avatar src={avatarPreview ?? (removeAvatar ? null : profile.profileImgUrl)} name={nickname || profile.nickname} variant={profile.avatarVariant} />
                  <span><Icon name="camera" /></span>
                </button>
                <input ref={avatarInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => chooseImage(event.target.files?.[0])} />
                <div>
                  <b>나를 소개하는 사진</b>
                  <small>맛객 목록과 내 프로필에 보여요.</small>
                  <small>JPG, PNG, WEBP · 사진당 5MB 이하</small>
                </div>
                {(profile.profileImgUrl || avatarFile) && !removeAvatar && (
                  <button className="text-action" type="button" onClick={async () => {
                    if (!await confirm({ title: "프로필 사진을 삭제할까요?", message: "등록한 프로필 사진이 삭제되고 기본 캐릭터로 바뀝니다.", confirmLabel: "삭제할게요", tone: "danger" })) return;
                    setAvatarFile(undefined); setRemoveAvatar(true);
                    if (avatarInput.current) avatarInput.current.value = "";
                  }}>기본 캐릭터</button>
                )}
              </section>
            </div>
            <div className="profile-edit-cover" {...swipeHandlers(
              (step) => setCoverPreviewIndex((current) => wrapIndex(current, step, coverGallery.length)),
              { threshold: 40, enabled: coverGallery.length > 0 },
            )}>
              <div className="profile-edit-cover-track" style={{ transform: `translateX(-${coverPreviewIndex * 100}%)` }}>{(coverGallery.length ? coverGallery : [activeCoverPreview]).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`프로필 배경 미리보기 ${coverGallery.length ? `${index + 1} / ${coverGallery.length}` : ""}`} />)}</div>
              <button type="button" onClick={() => coverInput.current?.click()}><Icon name="camera" /> 배경 사진 추가</button>
              {coverGallery.length > 0 && coverPreviewIndex === 0 && <span className="profile-primary-cover-badge">대표 사진</span>}
              {coverGallery.length === 0 && <span className="profile-default-cover-badge">기본 배경</span>}
              <span className="profile-cover-count">{coverGallery.length}/10장</span>
            </div>
            {coverGallery.length > 0 && <PaginationDots activeIndex={coverPreviewIndex} total={coverGallery.length} onSelect={setCoverPreviewIndex} className="profile-edit-cover-indicators" label="배경 사진 페이지" />}
            {coverGallery.length > 0 && <div className="profile-edit-cover-thumbnails" aria-label="등록한 배경 사진">
              {coverGallery.map((url, index) => <div className="profile-edit-cover-thumbnail" key={`${url}-${index}`}>
                <button type="button" className={`profile-edit-cover-thumbnail-preview${coverPreviewIndex === index ? " active" : ""}`} aria-label={`배경 사진 ${index + 1} 미리보기`} aria-pressed={coverPreviewIndex === index} onClick={() => setCoverPreviewIndex(index)}><img src={url} alt="" loading="lazy" /></button>
                <button type="button" className="profile-edit-cover-thumbnail-delete" aria-label={`배경 사진 ${index + 1} 삭제`} disabled={saving} onClick={() => void removeCoverPhotoAt(index)}><Icon name="close" /></button>
              </div>)}
            </div>}
            <input ref={coverInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple
              onChange={(event) => { chooseCoverImages(event.target.files); event.target.value = ""; }} />
            <div className="profile-edit-form">
              <div className="r-card profile-edit-card">
                <label className="profile-edit-field">
                  <span>닉네임 <em>필수</em></span>
                  <input value={nickname} onChange={(event) => setNickname(event.target.value.slice(0, 12))}
                    maxLength={12} required={activeTab === "profile"} placeholder="맛다공에서 사용할 이름" />
                  <small>{nickname.length}/12자 · 다른 맛객과 겹치지 않는 이름으로 정해 주세요.</small>
                </label>
                <label className="profile-edit-field">
                  <span>나를 소개해 주세요 <small>선택</small></span>
                  <textarea value={intro} onChange={(event) => setIntro(event.target.value.slice(0, 300))}
                    maxLength={300} rows={3} placeholder="내가 좋아하는 한 끼, 자주 찾는 동네…" />
                  <small>{intro.length}/300자 · 다른 사람에게 공개돼요.</small>
                </label>
              </div>
              <details className="r-card public-style-settings">
                <summary><span><b>내가 소개하는 맛집 스타일 <em>선택 · 공개</em></b><small>방문자에게 내가 올리는 맛집의 성향을 보여줘요.</small></span><Icon name="chevron" /></summary>
                <div>
                  <p>이 항목은 방문자에게 공개되는 내 맛집 소개 스타일이에요.<br />비공개 추천 취향과는 별도로 관리돼요.</p>
                  <button type="button" className="copy-taste-button" onClick={() => {
                    // 공개 스타일로는 추천 분야와 선호 태그만 복사하고, 제외 조건은 공개하지 않습니다.
                    setTasterFocus(preferenceFocus);
                    setProfileTags(filterTagsForFocus(preferenceTags, preferenceFocus, positiveOptions));
                    setCopyNotice("추천 취향을 가져왔어요. 확인한 뒤 프로필 저장을 눌러 주세요.");
                  }}><Icon name="heart" /> 추천 취향에서 복사</button>
                  {copyNotice && <small className="copy-taste-notice" role="status">{copyNotice}</small>}
                  <small className="copy-taste-help">추천 취향의 분야와 좋아하는 태그만 가져옵니다. 피하고 싶은 조건은 공개되지 않아요. 복사 후 두 설정은 따로 수정할 수 있고, 프로필 저장을 눌러야 반영됩니다.</small>
                  <FoodFocusPicker label="어떤 곳을 소개하나요?" value={tasterFocus} onChange={(focus) => {
                    setTasterFocus(focus);
                    setProfileTags((current) => filterTagsForFocus(current, focus, positiveOptions));
                  }} />
                  <fieldset className="activity-scope-picker">
                    <legend>주로 어디에서 활동하나요?</legend>
                    <div>
                      {([
                        ["LOCAL", "지역 중심", "주 활동 지역의 맛집을 소개해요.", "pin"],
                        ["TRAVEL", "여행·드라이브", "전국 여행지 주변을 찾아다녀요.", "route"],
                        ["BOTH", "둘 다", "동네와 여행지 모두 소개해요.", "home"],
                      ] as const).map(([scope, label, description, icon]) => (
                        <label key={scope}>
                          <input className="visually-hidden" type="radio" name="activity-scope"
                            checked={activityScope === scope} onChange={() => {
                              setActivityScope(scope);
                              if (scope === "TRAVEL") {
                                setActivityRegion({ sido: "", district: "", dong: "" });
                                setActivityRegionChanged(true);
                              }
                            }} />
                          <span><Icon name={icon} /><b>{label}</b><small>{description}</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {activityScope !== "TRAVEL" && (
                    <fieldset className="activity-region-field">
                      <legend>주 활동 지역 <small>선택</small></legend>
                      <div className="activity-region-picker">
                        <RegionPicker label="시·도" value={activityRegion.sido} placeholder="지역 선택"
                          options={regions.map((region) => region.name)} disabled={!regions.length}
                          onChange={(sido) => {
                            setActivityRegion({ sido, district: "", dong: "" });
                            setActivityRegionChanged(true);
                          }} />
                        <RegionPicker label="시·군·구" value={activityRegion.district === "(직할)" ? "세종시" : activityRegion.district} placeholder="구역 선택"
                          options={(regions.find((region) => region.name === activityRegion.sido)?.districts ?? [])
                            .map((district) => district.name === "(직할)" ? "세종시" : district.name)}
                          disabled={!activityRegion.sido}
                          onChange={(district) => {
                            const selectedDistrict = district === "세종시" ? "(직할)" : district;
                            setActivityRegion((current) => ({ ...current, district: selectedDistrict, dong: "" }));
                            setActivityRegionChanged(true);
                          }} />
                        <RegionPicker label="읍·면·동" value={activityRegion.dong} placeholder="동네 선택"
                          options={[...new Set((regions.find((region) => region.name === activityRegion.sido)?.districts
                            .find((district) => district.name === activityRegion.district)?.dongs ?? [])
                            .map((name) => name.split(" ")[0]))]}
                          disabled={!activityRegion.district}
                          onChange={(dong) => {
                            setActivityRegion((current) => ({ ...current, dong }));
                            setActivityRegionChanged(true);
                          }} />
                      </div>
                      <small>{regionCatalogError ? "지역 목록을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요." : "행정안전부 법정동 기준으로 지역을 선택해 주세요."}</small>
                    </fieldset>
                  )}
                  <TasteTagPicker options={positiveOptions} value={profileTags} onChange={setProfileTags} focus={tasterFocus} />
                </div>
              </details>
            </div>
          </section>
          <section className="settings-panel taste-settings-panel" hidden={activeTab !== "taste"} aria-label="비공개 추천 취향 설정">
            <div className="taste-settings-intro"><span className="taste-settings-mascot"><Avatar name="맛다공" variant={3} /><i><Icon name="sparkle" /></i></span><h2>오늘도, 내 입맛대로</h2><p>좋아하는 취향을 알려 주시면<br />나와 잘 맞는 맛객을 먼저 추천해 드려요.</p><small>나만의 설정이에요 · 프로필에 공개되지 않아요</small></div>
            <section className="taste-settings-block">
              <FoodFocusPicker label="어떤 곳을 찾고 있나요?" value={preferenceFocus} onChange={(focus) => {
                setPreferenceFocus(focus);
                setPreferenceTags((current) => filterTagsForFocus(current, focus, positiveOptions));
              }} />
            </section>
            <section className="taste-settings-block">
              <div className="taste-section-heading"><h2>이런 곳이 좋아요</h2><span>분류별 선택</span></div>
              <TasteTagPicker options={positiveOptions} value={preferenceTags} focus={preferenceFocus} onChange={(tags) => {
                setPreferenceTags(tags);
                setExcludedTags((current) => current.filter((tag) => !tags.includes(tag)));
              }} />
            </section>
            <section className="taste-settings-block avoid-settings-block">
              <div className="taste-section-heading"><h2>추천에서 제외</h2><span>선택</span></div>
              <p>해당 조건이 등록된 맛집은 홈과 지도에서 숨겨요.</p>
              <TasteTagPicker options={avoidOptions} value={excludedTags} groupsToShow={["VISIT"]}
                onChange={(tags) => {
                  setExcludedTags(tags);
                  setPreferenceTags((current) => current.filter((tag) => !tags.includes(tag)));
                }} />
            </section>
          </section>
          {activeTab === "taste" && (
            <button className="r-card tag-request-entry" type="button" onClick={() => setRequestOpen(true)}>
              <span className="tag-request-entry-icon"><Icon name="message" /></span>
              <span><b>찾는 태그가 없나요?</b><small>원하는 태그를 제안해 주세요</small></span><Icon name="chevron" />
            </button>
          )}
          <footer className="settings-save-bar r-me-edit__save">
            <button className="r-button r-button--primary r-button--block" type="submit" disabled={saving}>{saving ? "저장하는 중…" : activeTab === "profile" ? "프로필 저장" : "취향 저장"}</button>
          </footer>
        </form>
      </main>
      {requestOpen && <TasteTagRequestSheet onClose={() => setRequestOpen(false)} onRequest={onRequestTag} onLoad={onLoadTagRequests} />}
    </>
  );
}
