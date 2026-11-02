import type { BackendStatus, RealtimeState } from "../../app/model/useMobileStore";
import type { ToneName } from "../theme/theme";

export const realtimeLabels: Record<RealtimeState, [string, ToneName]> = {
  connected: ["Синхронизировано", "green"],
  connecting: ["Подключение…", "amber"],
  disconnected: ["Нет связи", "amber"],
  error: ["Ошибка realtime", "red"],
  offline: ["Только локально", "gray"]
};

export const backendLabels: Record<BackendStatus, [string, ToneName]> = {
  ready: ["Backend доступен", "green"],
  checking: ["Проверяем…", "amber"],
  down: ["Backend недоступен", "red"],
  unknown: ["Не проверен", "gray"]
};
