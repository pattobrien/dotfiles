#!/bin/bash

source "$CONFIG_DIR/colors.sh"

if [ "$SELECTED" = true ]; then
  sketchybar --set "$NAME" background.color=$ACTIVE_BG_COLOR     \
                           background.border_color=$ACCENT_COLOR \
                           label.color=$TEXT_COLOR               \
                           icon.color=$ACCENT_COLOR
else
  sketchybar --set "$NAME" background.color=$ITEM_BG_COLOR            \
                           background.border_color=$ITEM_BORDER_COLOR \
                           label.color=$MUTED_COLOR                   \
                           icon.color=$MUTED_COLOR
fi
