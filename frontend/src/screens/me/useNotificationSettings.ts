import { useEffect, useState } from "react";
import { useAppData } from "../../app/AppData";
import type { NotificationSettings } from "../../models/community";
import { getNotificationSettings, updateNotificationSettings } from "../../services/community";
import { errorMessage } from "../../utils/errorMessage";

/** 알림 수신 설정. 스위치를 누르면 바로 바꿔 보여 주고 저장하며, 저장에 실패하면 이전 값으로 되돌립니다. */
export function useNotificationSettings() {
  const app = useAppData();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<keyof NotificationSettings | null>(null);

  useEffect(() => {
    let active = true;
    getNotificationSettings(app.accessToken)
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, "알림 설정을 불러오지 못했어요."));
      });
    return () => {
      active = false;
    };
  }, [app.accessToken]);

  async function toggle(key: keyof NotificationSettings) {
    if (!settings || savingKey) return;
    const previous = settings;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingKey(key);
    try {
      setSettings(await updateNotificationSettings(app.accessToken, next));
    } catch (cause) {
      setSettings(previous);
      app.actions.notify({
        kind: "error",
        title: "알림 설정을 바꾸지 못했어요",
        message: errorMessage(cause, "잠시 후 다시 시도해 주세요."),
      });
    } finally {
      setSavingKey(null);
    }
  }

  return { settings, error, savingKey, toggle };
}
