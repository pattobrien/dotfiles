import { Color, Icon } from "@raycast/api";

import { SessionStatus } from "../models";

const SESSION_ICONS: Record<
  SessionStatus,
  { source: string; tintColor: Color }
> = {
  [SessionStatus.Active]: { source: Icon.CircleFilled, tintColor: Color.Green },
  [SessionStatus.Detached]: {
    source: Icon.CircleFilled,
    tintColor: Color.Yellow,
  },
  [SessionStatus.None]: { source: Icon.Circle, tintColor: Color.SecondaryText },
};

const SESSION_LABELS: Record<SessionStatus, string> = {
  [SessionStatus.Active]: "Active",
  [SessionStatus.Detached]: "Detached",
  [SessionStatus.None]: "No session",
};

export function getSessionIcon(status: SessionStatus) {
  return SESSION_ICONS[status];
}

export function getSessionLabel(status: SessionStatus) {
  return SESSION_LABELS[status];
}
