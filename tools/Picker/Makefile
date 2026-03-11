PREFIX ?= $(HOME)/.local/bin
BINARY = picker
SWIFT ?= $(shell xcrun --find swift)

.PHONY: build release install clean watch

build:
	$(SWIFT) build

release:
	$(SWIFT) build -c release

install: release
	mkdir -p $(PREFIX)
	cp .build/release/$(BINARY) $(PREFIX)/$(BINARY)

clean:
	$(SWIFT) package clean

watch:
	watchexec -w Sources -e swift -- $(SWIFT) build

# Rebuild and re-launch on every save.
# Builds first (old picker stays visible), then kills and relaunches.
# watchexec -r kills the running picker when the next change comes in.
PICKER_TEST_ITEMS ?= alpha\nbeta\ngamma\ndelta\nepsilon\nzeta\neta\ntheta
dev:
	watchexec -w Sources -e swift -r -- '$(SWIFT) build 2>&1 && cp .build/debug/$(BINARY) $(PREFIX)/$(BINARY) && printf "$(PICKER_TEST_ITEMS)" | $(BINARY)'
