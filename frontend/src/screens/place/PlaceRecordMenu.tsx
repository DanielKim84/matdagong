import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { isMyTaster } from "../../models/place";
import TasterReportSheet from "../tasters/TasterReportSheet";
import type { PlaceRecord } from "./placeRecords";
import DeleteRecordSheet from "./DeleteRecordSheet";
import RecordVisibilitySheet from "./RecordVisibilitySheet";

type MenuItem = {
  key: string;
  icon: IconName;
  title: string;
  description: string;
  onPick: () => void;
  tone?: "danger";
};

/**
 * "맛객의 추천 이유" 제목 오른쪽 ⋯ 버튼과 그 메뉴입니다. 보드 09는 기록 아래 버튼 줄을 두지 않으므로 기록 관리는 여기에 모읍니다.
 * 내 기록: 내 기록 수정 · 공개 범위 바꾸기(보드 10-03 시트) · 기록 지우기(보드 18-03 확인 시트). 다른 맛객: 프로필 보기 · 구독하고 새 기록 받기 · 신고하기.
 */
export default function PlaceRecordMenu({
  record,
  placeId,
  onEditOwn,
  onChangeOwnVisibility,
  onDeleteOwn,
}: {
  record: PlaceRecord;
  /** 신고할 때 어떤 기록이었는지 함께 보냅니다. */
  placeId: string;
  onEditOwn: () => void;
  onChangeOwnVisibility: (visibility: "PUBLIC" | "PRIVATE") => void;
  /** 내 기록을 지웁니다. 지웠으면 true입니다. */
  onDeleteOwn: () => Promise<boolean>;
}) {
  const { subscriptionIds, reportedTasterIds, actions } = useAppData();
  const [open, setOpen] = useState<"menu" | "visibility" | "delete" | "report" | null>(null);
  const isMine = isMyTaster(record);
  const isPrivate = record.visibility === "PRIVATE";
  const close = () => setOpen(null);

  const items: MenuItem[] = isMine
    ? [
        {
          key: "edit",
          icon: "pencil",
          title: "내 기록 수정",
          description: "사진·메뉴·추천 이유를 고쳐요.",
          onPick: () => {
            close();
            onEditOwn();
          },
        },
        {
          key: "visibility",
          icon: isPrivate ? "lock" : "people",
          title: "공개 범위 바꾸기",
          description: isPrivate ? "지금은 나만 보기예요." : "지금은 공개 추천이에요.",
          onPick: () => setOpen("visibility"),
        },
        {
          key: "delete",
          icon: "trash",
          title: "기록 지우기",
          description: "되돌릴 수 없어요.",
          onPick: () => setOpen("delete"),
          tone: "danger",
        },
      ]
    : [
        {
          key: "profile",
          icon: "user",
          title: "프로필 보기",
          description: `${record.tasterName}님의 다른 기록을 봐요.`,
          onPick: () => {
            close();
            go("profile", record.tasterId);
          },
        },
        ...(subscriptionIds.includes(record.tasterId)
          ? []
          : [
              {
                key: "subscribe",
                icon: "user-plus" as const,
                title: "구독하고 새 기록 받기",
                description: "새 기록을 피드에서 받아봐요.",
                onPick: () => {
                  close();
                  actions.openSubscription(record.tasterId);
                },
              },
            ]),
        ...(reportedTasterIds.includes(record.tasterId)
          ? []
          : [
              {
                key: "report",
                icon: "alert" as const,
                title: "신고하기",
                description: "광고·거짓 기록이면 알려 주세요.",
                onPick: () => setOpen("report"),
              },
            ]),
      ];

  return (
    <>
      <button
        type="button"
        className="r-icon-button r-place-record-menu"
        onClick={() => setOpen("menu")}
        aria-label={isMine ? "내 기록 관리" : `${record.tasterName}의 기록 더 보기`}
      >
        <Icon name="more" />
      </button>
      {open === "menu" && (
        <Sheet title={isMine ? "내 기록 관리" : record.tasterName} onClose={close} className="r-record-menu">
          <div className="r-record-menu__list">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`r-card r-record-menu__item ${item.tone === "danger" ? "is-danger" : ""}`}
                onClick={item.onPick}
              >
                <span className="r-record-menu__icon">
                  <Icon name={item.icon} />
                </span>
                <span className="r-record-menu__copy">
                  <b>{item.title}</b>
                  <small>{item.description}</small>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {open === "visibility" && (
        <RecordVisibilitySheet
          current={isPrivate ? "PRIVATE" : "PUBLIC"}
          onConfirm={(visibility) => {
            close();
            onChangeOwnVisibility(visibility);
          }}
          onClose={close}
        />
      )}
      {open === "delete" && (
        // 지우면 되돌릴 수 없으므로 공유 중인 기록이면 "나만 보기"로 숨기는 길도 함께 보여 줍니다(보드 18-03).
        <DeleteRecordSheet
          isPrivate={isPrivate}
          onMakePrivate={() => {
            close();
            onChangeOwnVisibility("PRIVATE");
          }}
          onDelete={() => {
            close();
            void onDeleteOwn();
          }}
          onClose={close}
        />
      )}
      {open === "report" && (
        <TasterReportSheet
          tasterId={record.tasterId}
          tasterName={record.tasterName}
          placeId={placeId}
          onClose={close}
        />
      )}
    </>
  );
}
