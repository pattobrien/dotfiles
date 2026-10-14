#!/bin/bash

sketchybar --add item volume right                    \
           --set volume icon.color=$BLUE              \
                        script="$PLUGIN_DIR/volume.sh" \
           --subscribe volume volume_change
