import { useState } from "react";
import { createPortal } from "react-dom";
import type { TasteTag } from "../models/community";
import { TASTE_TAG_GROUPS, type TasteTagGroup, type TasteTagGroupInfo } from "../models/tasteTags";
import GroupIcon, { tagGroupLook } from "./GroupIcon";
import { HashMark } from "./HashTag";
import Icon from "./Icon";
import Sheet from "./Sheet";

type PickerSection = TasteTagGroupInfo & { names: string[] };

/**
 * 취향 태그 고르기의 공통 모양입니다(가입 취향 단계, 프로필 편집, 기록하기).
 * 넘긴 분류만 사전 순서대로 한 줄씩 두고(아이콘·이름·고른 태그·"N/한도"), 줄을 누르면 아래에서 시트가 올라와
 * 그 분류의 태그를 모두 보여 줍니다. 접어 둔 칩이 없어 보이는 태그 안에서만 고르는 일이 없고, 첫 화면은 분류 수만큼만 깁니다.
 * 분류가 하나뿐이면(피하고 싶은 조건 보드 15-04) 제목은 화면이 달고 여기서는 # 없는 칩만 바로 보여 줍니다. 한도를 채우면 남은 칩을 막고 짧게 알립니다.
 * inline이면 분류마다 "음식 종류 2/10" 제목과 칩을 시트 없이 모두 펼치고 분류 사이를 선으로 나눕니다(가입 2단계 04-03, 기록하기 11-03, 프로필 편집 15-03·15-04).
 */
export default function TasteTagPicker({
  options,
  value,
  onChange,
  groups,
  inline = false,
  hasHash = false,
  hasIcon = false,
}: {
  options: TasteTag[];
  value: string[];
  onChange: (tags: string[]) => void;
  /** 보여 줄 분류. 보통 groupsForFocus(분야)이고, 피하고 싶은 조건은 ["VISIT"]입니다. */
  groups: readonly TasteTagGroup[];
  /** 분류를 줄+시트로 접지 않고 모두 펼칩니다. */
  inline?: boolean;
  /** inline 칩 앞에 #을 붙일지(기록하기 3단계 보드 11-03은 #한식, 가입 2단계 04-03은 # 없이) */
  hasHash?: boolean;
  /** inline 제목 앞에 분류 아이콘을 붙일지(프로필 편집 공개 스타일 태그 보드 15-03) */
  hasIcon?: boolean;
}) {
  const [openGroup, setOpenGroup] = useState<TasteTagGroup | null>(null);
  const sections: PickerSection[] = TASTE_TAG_GROUPS.filter((group) => groups.includes(group.id))
    .map((group) => ({ ...group, names: options.filter((tag) => tag.tagGroup === group.id).map((tag) => tag.name) }))
    .filter((group) => group.names.length > 0);
  const opened = sections.find((section) => section.id === openGroup);

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((tag) => tag !== name) : [...value, name]);
  }

  if (inline) {
    return (
      <div className="r-taste-picker is-inline">
        {sections.map((section) => (
          <section key={section.id} className="r-taste-picker__group" aria-label={section.label}>
            <h3 className="r-taste-picker__inline-title">
              {hasIcon && <Icon name={tagGroupLook(section.id).icon} />}
              {section.label}
              <span>
                <em>{section.names.filter((name) => value.includes(name)).length}</em> / {section.limit}
              </span>
            </h3>
            <TagChips section={section} value={value} onToggle={toggle} hasHash={hasHash} />
          </section>
        ))}
      </div>
    );
  }

  if (sections.length === 1) {
    return (
      <div className="r-taste-picker is-inline is-single">
        <TagChips section={sections[0]} value={value} onToggle={toggle} hasHash={false} />
      </div>
    );
  }

  return (
    <div className="r-taste-picker">
      <p className="r-taste-picker__help">분류를 눌러 골라요. 꼭 맞는 것만 골라도 돼요.</p>
      <ul className="r-taste-picker__rows">
        {sections.map((section) => {
          const picked = section.names.filter((name) => value.includes(name));
          return (
            <li key={section.id}>
              <button
                type="button"
                className={`r-taste-picker__row ${picked.length ? "has-picked" : ""}`}
                aria-haspopup="dialog"
                aria-label={`${section.label} 고르기, ${section.limit}개 중 ${picked.length}개 선택${
                  picked.length ? `: ${picked.join(", ")}` : ""
                }`}
                onClick={() => setOpenGroup(section.id)}
              >
                <GroupIcon look={tagGroupLook(section.id)} />
                <span className="r-taste-picker__titles">
                  <b>{section.label}</b>
                  {picked.length ? (
                    <span className="r-taste-picker__picked">
                      {picked.map((name) => (
                        <span key={name}>
                          <HashMark />
                          {name}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <small>{section.hint}</small>
                  )}
                </span>
                <SelectedCount section={section} value={value} />
                <Icon name="chevron" />
              </button>
            </li>
          );
        })}
      </ul>
      {/* 기록하기·프로필 편집처럼 쌓임 순서가 있는 화면 안에서도 시트가 맨 위에 오도록 body에 그립니다. */}
      {opened &&
        createPortal(
          <Sheet title={opened.label} onClose={() => setOpenGroup(null)} className="r-taste-picker-sheet">
            <div className="r-taste-picker-sheet__status">
              <small>{opened.hint}</small>
              <SelectedCount section={opened} value={value} />
            </div>
            <TagChips section={opened} value={value} onToggle={toggle} />
            <div className="r-taste-picker-sheet__actions">
              <button type="button" className="r-button r-button--primary" onClick={() => setOpenGroup(null)}>
                완료
              </button>
            </div>
          </Sheet>,
          document.body,
        )}
    </div>
  );
}

function SelectedCount({ section, value }: { section: PickerSection; value: string[] }) {
  const count = section.names.filter((name) => value.includes(name)).length;
  return (
    <span className={`r-taste-picker__count ${count >= section.limit ? "is-full" : ""}`}>
      선택 <b>{count}</b>/{section.limit}
    </span>
  );
}

/** 한 분류의 칩 전부입니다. 고르는 즉시 반영하고, 한도를 채우면 고르지 않은 칩을 막습니다. */
function TagChips({
  section,
  value,
  onToggle,
  hasHash = true,
}: {
  section: PickerSection;
  value: string[];
  onToggle: (name: string) => void;
  /** 칩 앞에 # 표시를 붙일지(가입 2단계 펼침 칩은 보드대로 # 없이) */
  hasHash?: boolean;
}) {
  const isFull = section.names.filter((name) => value.includes(name)).length >= section.limit;
  return (
    <>
      <div className="r-chips r-chips--wrap" role="group" aria-label={section.label}>
        {section.names.map((name) => {
          const isSelected = value.includes(name);
          return (
            <button
              key={name}
              type="button"
              className={`r-chip r-taste-picker__chip ${isSelected ? "is-on" : ""}`}
              aria-pressed={isSelected}
              disabled={!isSelected && isFull}
              onClick={() => onToggle(name)}
            >
              {hasHash && <HashMark />}
              {name}
            </button>
          );
        })}
      </div>
      {isFull && (
        <p className="r-taste-picker__full" role="status">
          {section.limit}개를 모두 골랐어요. 바꾸려면 고른 태그를 하나 빼 주세요.
        </p>
      )}
    </>
  );
}
