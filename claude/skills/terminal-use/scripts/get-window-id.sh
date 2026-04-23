#!/bin/bash
# Get CGWindowID by app name and optional window title.
# Usage: get-window-id.sh <app-name> [window-title]
# Returns the numeric window ID for use with `screencapture -l<id>`.

APP="$1"
TITLE="$2"

if [ -z "$APP" ]; then
  echo "Usage: get-window-id.sh <app-name> [window-title]" >&2
  exit 1
fi

osascript -l JavaScript -e "
ObjC.import('CoreGraphics');
var wins = ObjC.deepUnwrap(ObjC.castRefToObject(
  \$.CGWindowListCopyWindowInfo(\$.kCGWindowListExcludeDesktopElements, \$.kCGNullWindowID)));
var r = wins.filter(function(w) {
  if (w.kCGWindowOwnerName !== '$APP' || w.kCGWindowLayer !== 0) return false;
  var title = '$TITLE';
  return title === '' || w.kCGWindowName === title;
});
r.length > 0 ? r[0].kCGWindowNumber : '';
"
