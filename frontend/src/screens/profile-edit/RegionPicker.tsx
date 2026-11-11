import { useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon";

// 목록이 이보다 길면 위에 검색 칸을 보여 줍니다.
const SEARCH_THRESHOLD = 15;

/** 지역 한 단계(시·도, 시·군·구, 읍·면·동)를 고르는 펼침 목록입니다. 바깥을 누르거나 Esc로 닫습니다. */
export default function RegionPicker({
  label,
  value,
  options,
  placeholder,
  isDisabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  isDisabled: boolean;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const filteredOptions = query ? options.filter((option) => option.includes(query.trim())) : options;

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function select(option: string) {
    onChange(option);
    setIsOpen(false);
  }

  return (
    <div className={`region-picker-field${isOpen ? " is-open" : ""}`} ref={root}>
      <span>{label}</span>
      <button
        type="button"
        className="region-picker-trigger"
        aria-label={`${label} 선택`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={isDisabled}
        onClick={() => {
          setQuery("");
          setIsOpen((current) => !current);
        }}
      >
        <span>{options.find((option) => option === value) ?? placeholder}</span>
        <Icon name="chevron" />
      </button>
      {isOpen && (
        <div className="region-picker-menu" role="listbox" aria-label={label}>
          {options.length > SEARCH_THRESHOLD && (
            <input
              autoFocus
              type="search"
              aria-label={`${label} 검색`}
              placeholder="지역 이름 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                key={option}
                onClick={() => select(option)}
              >
                {option}
                {option === value && <Icon name="check" />}
              </button>
            ))
          ) : (
            <small>검색 결과가 없어요.</small>
          )}
        </div>
      )}
    </div>
  );
}
