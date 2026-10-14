#!/bin/bash

for sid in 1 2 3 4 5 6 7 8 9 10; do
  sketchybar --add space space.$sid left                                    \
             --set space.$sid space=$sid                                    \
                              icon=$sid                                     \
                              icon.font="SF Pro:Bold:13.0"                  \
                              label.font="sketchybar-app-font:Regular:14.0" \
                              label.padding_right=12                        \
                              label.y_offset=-1                             \
                              script="$PLUGIN_DIR/space.sh"
done

sketchybar --add item space_separator left                             \
           --set space_separator icon="􀆊"                              \
                                 icon.font="SF Pro:Bold:11.0"          \
                                 icon.color=$MUTED_COLOR               \
                                 icon.padding_left=6                   \
                                 icon.padding_right=2                  \
                                 label.drawing=off                     \
                                 background.drawing=off                \
                                 script="$PLUGIN_DIR/space_windows.sh" \
           --subscribe space_separator space_windows_change
