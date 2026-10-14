#!/bin/bash

sketchybar --add item front_app left                                    \
           --set front_app background.drawing=off                       \
                           icon.color=$ACCENT_COLOR                     \
                           icon.font="sketchybar-app-font:Regular:15.0" \
                           icon.padding_left=4                          \
                           label.font="SF Pro:Bold:13.0"                \
                           script="$PLUGIN_DIR/front_app.sh"            \
           --subscribe front_app front_app_switched
