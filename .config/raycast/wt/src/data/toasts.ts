import { showToast, Toast } from "@raycast/api";

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function showAnimatedToast(title: string) {
  return showToast({ style: Toast.Style.Animated, title });
}

export async function showSuccessToast(title: string) {
  return showToast({ style: Toast.Style.Success, title });
}

export async function showFailureToast(title: string, error: unknown) {
  return showToast({
    style: Toast.Style.Failure,
    title,
    message: formatError(error),
  });
}

export function updateToastSuccess(toast: Toast, title: string) {
  toast.style = Toast.Style.Success;
  toast.title = title;
}

export function updateToastFailure(toast: Toast, title: string, error: unknown) {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = formatError(error);
}
