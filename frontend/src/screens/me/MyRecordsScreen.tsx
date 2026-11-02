import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState, Segmented, Skeleton, TopBar } from "../../components/ui";
import { MY_ACTIVITY_CHANGED_EVENT, changeRecordVisibility } from "../../services/places";
import { errorMessage } from "../../utils/errorMessage";
import { diaryEntries, formatDay } from "./diary";

type Tab = "public" | "private";

/**
 * 내 기록 공개 설정(#my-records/public|private): 공개 중인 기록과 나만 보는 기록을 나눠 보고,
 * 여러 곳을 골라 한 번에 공개하거나 나만 보기로 바꿉니다.
 */
export default function MyRecordsScreen({ routeId }: { routeId: string }) {
  const app = useAppData();
  const tab: Tab = routeId === "private" ? "private" : "public";
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // 저장 직후 목록을 다시 불러오기 전까지 바뀐 공개 범위를 먼저 반영합니다.
  const [changed, setChanged] = useState<Record<string, boolean>>({});

  const entries = useMemo(
    () =>
      diaryEntries(app.myRecords, app.isMyTasterId, app.photoFor).map((entry) => ({
        ...entry,
        isPublic: changed[entry.place.id] ?? entry.isPublic,
      })),
    [app.myRecords, app.isMyTasterId, app.photoFor, changed],
  );
  const publicEntries = entries.filter((entry) => entry.isPublic);
  const privateEntries = entries.filter((entry) => !entry.isPublic);
  const shown = tab === "public" ? publicEntries : privateEntries;
  const shownIds = shown.map((entry) => entry.place.id);
  const selectedShown = selected.filter((id) => shownIds.includes(id));
  const isAllSelected = shown.length > 0 && selectedShown.length === shown.length;
  const nextIsPublic = tab === "private";

  function changeTab(next: Tab) {
    setSelected([]);
    go("my-records", next, true);
  }
  function toggle(placeId: string) {
    setSelected((current) =>
      current.includes(placeId) ? current.filter((id) => id !== placeId) : [...current, placeId],
    );
  }

  async function applyChange() {
    if (!selectedShown.length || isSaving) return;
    setIsSaving(true);
    try {
      const result = await changeRecordVisibility(app.accessToken, selectedShown, nextIsPublic ? "PUBLIC" : "PRIVATE");
      setChanged((current) => ({
        ...current,
        ...Object.fromEntries(selectedShown.map((id) => [id, nextIsPublic])),
      }));
      setSelected([]);
      window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
      app.actions.notify({
        kind: "success",
        title: nextIsPublic ? `${result.changed}곳을 공개했어요` : `${result.changed}곳을 나만 보기로 바꿨어요`,
        message: nextIsPublic
          ? "이제 다른 사람의 지도와 피드에도 보여요."
          : "이제 나에게만 보이고, 다른 사람의 지도와 피드에서는 빠져요.",
      });
    } catch (cause) {
      app.actions.notify({
        kind: "error",
        title: "공개 범위를 바꾸지 못했어요",
        message: errorMessage(cause, "잠시 후 다시 시도해 주세요."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className={`r-screen r-me-records ${selectedShown.length ? "has-action-bar" : ""}`}>
      <TopBar title="내 기록 공개 설정" fallback="my" />
      <div className="r-me-body">
        <Segmented<Tab>
          label="공개 범위"
          value={tab}
          onChange={changeTab}
          options={[
            { value: "public", label: `공개 ${publicEntries.length}` },
            { value: "private", label: `나만 보기 ${privateEntries.length}` },
          ]}
        />
        <p className="r-me-records__hint">
          <Icon name={tab === "public" ? "user" : "lock"} />
          {tab === "public"
            ? "공개한 기록은 다른 사람의 지도·피드에 보이고, 나를 구독하는 계기가 돼요."
            : "나만 보는 기록이에요. 골라서 공개하면 다른 사람도 볼 수 있어요."}
        </p>

        {app.loading && !app.myRecords.length ? (
          <Skeleton shape="row" count={3} label="내 기록을 불러오고 있어요." />
        ) : shown.length ? (
          <>
            <button
              type="button"
              className="r-me-records__select-all"
              aria-pressed={isAllSelected}
              onClick={() => setSelected(isAllSelected ? [] : shownIds)}
            >
              <span className={`r-me-check ${isAllSelected ? "is-on" : ""}`} aria-hidden="true">
                <Icon name="check" />
              </span>
              전체 선택
              <small>{selectedShown.length ? `${selectedShown.length}곳 선택` : `${shown.length}곳`}</small>
            </button>
            <ul className="r-card r-me-records__list">
              {shown.map(({ place, record, date, photo }) => {
                const isSelected = selectedShown.includes(place.id);
                return (
                  <li key={place.id} className={`r-me-records__item ${isSelected ? "is-selected" : ""}`}>
                    <button
                      type="button"
                      className="r-me-records__pick"
                      aria-pressed={isSelected}
                      onClick={() => toggle(place.id)}
                    >
                      <span className={`r-me-check ${isSelected ? "is-on" : ""}`} aria-hidden="true">
                        <Icon name="check" />
                      </span>
                      <PlaceThumb place={place} photo={photo} className="r-me-records__thumb" />
                      <span className="r-me-records__copy">
                        <b>{place.name}</b>
                        <small>
                          {date ? formatDay(date) : "날짜 없음"} · {place.category}
                        </small>
                        {record?.note && <span className="r-me-records__note">“{record.note}”</span>}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="r-icon-button"
                      onClick={() => go("place", place.id)}
                      aria-label={`${place.name} 상세 보기`}
                    >
                      <Icon name="chevron" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={tab === "public" ? "user" : "lock"}
            title={tab === "public" ? "공개 중인 기록이 없어요" : "나만 보는 기록이 없어요"}
            message={
              tab === "public"
                ? "나만 보기 탭에서 골라 공개하거나, 새 기록을 공개로 남겨 보세요."
                : "기록을 남길 때 나만 보기를 고르면 이곳에 모여요."
            }
            action={
              tab === "public" && privateEntries.length
                ? { label: `나만 보기 ${privateEntries.length}곳 보기`, onClick: () => changeTab("private") }
                : { label: "기록 남기기", onClick: () => go("register"), variant: "primary" }
            }
            className="r-card r-me-empty"
          />
        )}
      </div>

      {selectedShown.length > 0 && (
        <div className="r-action-bar">
          <button
            type="button"
            className="r-button r-button--secondary"
            onClick={() => setSelected([])}
            disabled={isSaving}
          >
            선택 해제
          </button>
          <button
            type="button"
            className="r-button r-button--primary r-me-records__apply"
            onClick={() => void applyChange()}
            disabled={isSaving}
          >
            <Icon name={nextIsPublic ? "user" : "lock"} />
            {isSaving
              ? "바꾸는 중…"
              : nextIsPublic
                ? `${selectedShown.length}곳 공개하기`
                : `${selectedShown.length}곳 나만 보기로`}
          </button>
        </div>
      )}
    </main>
  );
}
