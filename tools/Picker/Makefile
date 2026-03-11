PREFIX ?= $(HOME)/.local/bin
BINARY = picker
SWIFT ?= xcrun swift

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

# Rebuild and re-launch on every save. Kills the previous instance automatically.
# Pipe your test items into PICKER_TEST_ITEMS (one per line) or edit the default below.
PICKER_TEST_ITEMS ?= alpha\nbeta\ngamma\ndelta\nepsilon\nzeta\neta\ntheta
dev:
	watchexec -w Sources -e swift -r -- sh -c 'xcrun swift build 2>&1 && cp .build/debug/$(BINARY) $(PREFIX)/$(BINARY) && printf "$(PICKER_TEST_ITEMS)" | $(BINARY)'
