# Picker

A native macOS floating picker. Reads items from stdin, presents a searchable list in a borderless floating window, and prints the selected item to stdout.

Built to avoid the flicker that terminal-based pickers (e.g. fzf in Kitty) produce when dynamically resizing windows.

## Build

```sh
make build    # debug build
make release  # optimized build
make install  # release build + copy to ~/.local/bin/picker
make clean    # clean build artifacts
```

The binary is at `.build/release/picker` (or `.build/debug/picker` for debug builds).

## Development

Requires [watchexec](https://github.com/watchexec/watchexec) (`brew install watchexec`).

```sh
# Rebuild on every file change
make watch

# Rebuild and re-launch the picker on every file change
make dev
```

`make dev` pipes default test items into the picker and restarts it automatically on each save. To use custom test data:

```sh
PICKER_TEST_ITEMS="one\ntwo\nthree" make dev
```

## Usage

```sh
echo "alpha\nbeta\ngamma\ndelta" | picker
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--prompt` | `❯ ` | Prompt string shown in the text field |
| `--max-rows` | `20` | Maximum visible rows before scrolling |
| `--width` | `500` | Window width in points |
| `--filter-cmd` | `fzf` | External CLI used for fuzzy filtering (must support `--filter <query>`) |

### Examples

```sh
# Custom prompt and width
ls | picker --prompt "File: " --width 600

# Use skim instead of fzf
ls | picker --filter-cmd sk
```

## Keyboard

- **Type** to filter results
- **Up/Down** arrows to navigate
- **Enter** to select (prints to stdout, exits 0)
- **Escape** to cancel (exits 1)
