import { useRef } from "react";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { IMAGE_ACCEPT, MAX_IMAGE_SIZE_LABEL } from "../../utils/profileImages";

/**
 * 가입 1단계의 프로필 사진 고르기(보드 04-02): 가운데 큰 사진(오른쪽 아래 카메라)을 눌러 다른 사진을 고르고,
 * 카카오·네이버 사진을 받았으면 아래 카드의 "소셜 프로필 사진 사용" 스위치(켜면 소셜 사진, 끄면 기본 사진)나
 * "소셜 사진으로 사용하기 / 기본 사진으로 변경하기"로 고릅니다(공통 고르기 줄 .r-option).
 * 다른 사진을 고르면 "고른 사진으로 사용하기" 줄이 더해지고, 언제든 소셜 사진으로 돌아갈 수 있습니다. 실제 저장은 가입을 마칠 때 합니다.
 */
export default function SignupPhotoField({
  src,
  isSocialPhoto,
  hasSocialPhoto,
  name,
  onChoose,
  onRemove,
  onUseSocialPhoto,
}: {
  /** 지금 보여 줄 사진(고른 파일 미리보기 또는 소셜 사진). 없으면 기본 캐릭터입니다. */
  src: string | null;
  /** 지금 보이는 사진이 카카오·네이버에서 받은 사진인지 */
  isSocialPhoto: boolean;
  /** 카카오·네이버에서 받은 사진이 있는지(있으면 다른 사진을 골라도 되돌아갈 수 있음) */
  hasSocialPhoto: boolean;
  name: string;
  onChoose: (file: File | undefined) => void;
  onRemove: () => void;
  onUseSocialPhoto: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const isChosenPhoto = !!src && !isSocialPhoto;
  const choices = [
    { key: "social", label: "소셜 사진으로 사용하기", isOn: isSocialPhoto, onPick: onUseSocialPhoto },
    ...(isChosenPhoto ? [{ key: "chosen", label: "고른 사진으로 사용하기", isOn: true, onPick: () => undefined }] : []),
    { key: "default", label: "기본 사진으로 변경하기", isOn: !src, onPick: onRemove },
  ];

  return (
    <div className="r-signup-photo">
      <button
        className="r-signup-photo__button"
        type="button"
        onClick={() => input.current?.click()}
        aria-label="프로필 사진 고르기"
      >
        <Avatar src={src} name={name || "맛객"} />
        <span className="r-signup-photo__badge">
          <Icon name="camera" />
        </span>
      </button>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={(event) => {
          onChoose(event.target.files?.[0]);
          // 같은 파일을 다시 골라도 바뀌도록 비웁니다.
          event.target.value = "";
        }}
      />
      {hasSocialPhoto ? (
        <div className="r-card r-signup-photo__choices">
          <div className="r-signup-photo__choices-head">
            <Icon name="user" />
            <span>
              <b>소셜 프로필 사진 사용</b>
              <small>연결된 소셜의 사진을 사용할 수 있어요.</small>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isSocialPhoto}
              aria-label="소셜 프로필 사진 사용"
              className={`r-me-switch ${isSocialPhoto ? "is-on" : ""}`}
              onClick={isSocialPhoto ? onRemove : onUseSocialPhoto}
            >
              <span />
            </button>
          </div>
          <div className="r-options" role="radiogroup" aria-label="프로필 사진">
            {choices.map((choice) => (
              <button
                key={choice.key}
                type="button"
                role="radio"
                aria-checked={choice.isOn}
                className={`r-option ${choice.isOn ? "is-on" : ""}`}
                onClick={choice.onPick}
              >
                <span className="r-option__radio" aria-hidden="true" />
                <b>{choice.label}</b>
                {choice.key === "default" && <Avatar src={null} name={name || "맛객"} />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <small className="r-signup-photo__hint">
          사진을 눌러 바꿀 수 있어요 · {MAX_IMAGE_SIZE_LABEL} 이하
          {src && (
            <>
              {" · "}
              <button className="r-signup-photo__reset" type="button" onClick={onRemove}>
                기본 사진으로
              </button>
            </>
          )}
        </small>
      )}
    </div>
  );
}
