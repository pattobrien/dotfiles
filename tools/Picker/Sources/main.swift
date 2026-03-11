import AppKit

// MARK: - Read stdin

var items: [String] = []
if isatty(STDIN_FILENO) == 0 {
    while let line = readLine() {
        let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            items.append(trimmed)
        }
    }
}
guard !items.isEmpty else {
    fputs("picker: no input. Pipe items into picker.\n", stderr)
    exit(1)
}

// MARK: - Parse arguments

var promptLabel = ">"
var maxVisible = 20
var windowWidth: CGFloat = 680
var filterCmd = "fzf"

let args = CommandLine.arguments
var i = 1
while i < args.count {
    switch args[i] {
    case "--prompt" where i + 1 < args.count:
        promptLabel = args[i + 1]
        i += 2
    case "--max-rows" where i + 1 < args.count:
        maxVisible = Int(args[i + 1]) ?? maxVisible
        i += 2
    case "--width" where i + 1 < args.count:
        windowWidth = CGFloat(Double(args[i + 1]) ?? Double(windowWidth))
        i += 2
    case "--filter-cmd" where i + 1 < args.count:
        filterCmd = args[i + 1]
        i += 2
    default:
        i += 1
    }
}

// MARK: - Entry point

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let delegate = PickerAppDelegate(
    items: items,
    prompt: promptLabel,
    maxRows: maxVisible,
    width: windowWidth,
    filterCmd: filterCmd
)
app.delegate = delegate
app.run()
