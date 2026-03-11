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
        promptLabel = args[i + 1]; i += 2
    case "--max-rows" where i + 1 < args.count:
        maxVisible = Int(args[i + 1]) ?? maxVisible; i += 2
    case "--width" where i + 1 < args.count:
        windowWidth = CGFloat(Double(args[i + 1]) ?? Double(windowWidth)); i += 2
    case "--filter-cmd" where i + 1 < args.count:
        filterCmd = args[i + 1]; i += 2
    default:
        i += 1
    }
}

// MARK: - External filter

func runFilter(query: String, items: [String], cmd: String) -> [String] {
    guard !query.isEmpty else { return items }

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = [cmd, "--filter", query]

    let stdinPipe = Pipe()
    let stdoutPipe = Pipe()
    process.standardInput = stdinPipe
    process.standardOutput = stdoutPipe
    process.standardError = FileHandle.nullDevice

    do {
        try process.run()
    } catch {
        // Fall back to simple contains filter if the command fails to launch
        let q = query.lowercased()
        return items.filter { $0.lowercased().contains(q) }
    }

    let input = items.joined(separator: "\n") + "\n"
    stdinPipe.fileHandleForWriting.write(input.data(using: .utf8)!)
    stdinPipe.fileHandleForWriting.closeFile()

    process.waitUntilExit()

    let outputData = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
    let output = String(data: outputData, encoding: .utf8) ?? ""

    return output
        .split(separator: "\n", omittingEmptySubsequences: true)
        .map { String($0) }
}

// MARK: - PickerTextField (forwards arrow keys)

class PickerTextField: NSTextField {
    var onArrowKey: ((Bool) -> Void)?  // true = down, false = up

    override func keyDown(with event: NSEvent) {
        switch event.keyCode {
        case 125: onArrowKey?(true)   // down
        case 126: onArrowKey?(false)  // up
        default: super.keyDown(with: event)
        }
    }
}

// MARK: - PickerPanel (borderless key window)

class PickerPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

// MARK: - Custom row view (VS Code-style selection highlight)

class PickerRowView: NSTableRowView {
    override func drawSelection(in dirtyRect: NSRect) {
        if selectionHighlightStyle != .none {
            let selectionColor = NSColor(red: 0.15, green: 0.20, blue: 0.35, alpha: 1.0)
            selectionColor.setFill()
            let selectionRect = bounds.insetBy(dx: 4, dy: 0)
            let path = NSBezierPath(roundedRect: selectionRect, xRadius: 4, yRadius: 4)
            path.fill()
        }
    }
}

// MARK: - PickerViewController

class PickerViewController: NSViewController, NSTableViewDataSource, NSTableViewDelegate, NSTextFieldDelegate {

    private let allItems: [String]
    private var filtered: [String]
    private let prompt: String
    private let maxRows: Int
    private let filterCommand: String

    private let rowHeight: CGFloat = 26
    private let inputAreaHeight: CGFloat = 40
    private let separatorMargin: CGFloat = 8

    private var promptLabel: NSTextField!
    private var textField: PickerTextField!
    private var scrollView: NSScrollView!
    private var tableView: NSTableView!

    // VS Code dark theme colors
    private let bgColor = NSColor(red: 0.12, green: 0.13, blue: 0.16, alpha: 1.0)       // #1f2128
    private let inputBgColor = NSColor(red: 0.16, green: 0.17, blue: 0.21, alpha: 1.0)   // #292b35
    private let textColor = NSColor(red: 0.85, green: 0.87, blue: 0.91, alpha: 1.0)      // #d9dee8
    private let promptColor = NSColor(red: 0.55, green: 0.58, blue: 0.65, alpha: 1.0)    // #8c94a6
    private let separatorColor = NSColor(red: 0.20, green: 0.22, blue: 0.26, alpha: 1.0) // #333842

    init(items: [String], prompt: String, maxRows: Int, filterCommand: String) {
        self.allItems = items
        self.filtered = items
        self.prompt = prompt
        self.maxRows = maxRows
        self.filterCommand = filterCommand
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func loadView() {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.backgroundColor = bgColor.cgColor
        container.layer?.cornerRadius = 10
        container.layer?.masksToBounds = true

        // Input area background
        let inputBg = NSView()
        inputBg.wantsLayer = true
        inputBg.layer?.backgroundColor = inputBgColor.cgColor
        inputBg.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(inputBg)

        // Prompt label ">"
        promptLabel = NSTextField(labelWithString: prompt)
        promptLabel.font = .monospacedSystemFont(ofSize: 15, weight: .medium)
        promptLabel.textColor = promptColor
        promptLabel.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(promptLabel)

        // Text field
        textField = PickerTextField()
        textField.placeholderString = ""
        textField.font = .monospacedSystemFont(ofSize: 15, weight: .regular)
        textField.textColor = textColor
        textField.isBordered = false
        textField.drawsBackground = false
        textField.focusRingType = .none
        textField.delegate = self
        textField.translatesAutoresizingMaskIntoConstraints = false
        textField.onArrowKey = { [weak self] down in
            self?.moveSelection(down: down)
        }
        // Set placeholder color
        textField.placeholderAttributedString = NSAttributedString(
            string: "Type to filter...",
            attributes: [
                .foregroundColor: NSColor(red: 0.40, green: 0.43, blue: 0.50, alpha: 1.0),
                .font: NSFont.monospacedSystemFont(ofSize: 15, weight: .regular)
            ]
        )
        container.addSubview(textField)

        // Separator line
        let separator = NSView()
        separator.wantsLayer = true
        separator.layer?.backgroundColor = separatorColor.cgColor
        separator.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(separator)

        // Table view
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("item"))
        column.resizingMask = .autoresizingMask

        tableView = NSTableView()
        tableView.addTableColumn(column)
        tableView.headerView = nil
        tableView.dataSource = self
        tableView.delegate = self
        tableView.rowHeight = rowHeight
        tableView.backgroundColor = .clear
        tableView.selectionHighlightStyle = .regular
        tableView.intercellSpacing = NSSize(width: 0, height: 1)
        tableView.style = .plain
        tableView.gridStyleMask = []

        scrollView = NSScrollView()
        scrollView.documentView = tableView
        scrollView.hasVerticalScroller = false
        scrollView.hasHorizontalScroller = false
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(scrollView)

        let promptWidth: CGFloat = 22

        NSLayoutConstraint.activate([
            // Input background
            inputBg.topAnchor.constraint(equalTo: container.topAnchor),
            inputBg.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            inputBg.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            inputBg.heightAnchor.constraint(equalToConstant: inputAreaHeight),

            // Prompt label
            promptLabel.centerYAnchor.constraint(equalTo: inputBg.centerYAnchor),
            promptLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 14),

            // Text field
            textField.centerYAnchor.constraint(equalTo: inputBg.centerYAnchor),
            textField.leadingAnchor.constraint(equalTo: promptLabel.leadingAnchor, constant: promptWidth),
            textField.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -14),
            textField.heightAnchor.constraint(equalToConstant: 24),

            // Separator
            separator.topAnchor.constraint(equalTo: inputBg.bottomAnchor),
            separator.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            separator.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            separator.heightAnchor.constraint(equalToConstant: 1),

            // Scroll view / table
            scrollView.topAnchor.constraint(equalTo: separator.bottomAnchor, constant: 4),
            scrollView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -4),
        ])

        self.view = container
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        view.window?.makeFirstResponder(textField)
        if !filtered.isEmpty {
            tableView.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
        }
        resizeWindow()
    }

    // MARK: - Filtering

    func controlTextDidChange(_ obj: Notification) {
        let query = textField.stringValue
        filtered = runFilter(query: query, items: allItems, cmd: filterCommand)
        tableView.reloadData()
        if !filtered.isEmpty {
            tableView.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
        }
        resizeWindow()
    }

    // MARK: - Keyboard

    func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector) -> Bool {
        if commandSelector == #selector(insertNewline(_:)) {
            selectCurrent()
            return true
        }
        if commandSelector == #selector(cancelOperation(_:)) {
            exit(1)
        }
        return false
    }

    private func moveSelection(down: Bool) {
        guard !filtered.isEmpty else { return }
        var row = tableView.selectedRow
        if down {
            row = min(row + 1, filtered.count - 1)
        } else {
            row = max(row - 1, 0)
        }
        tableView.selectRowIndexes(IndexSet(integer: row), byExtendingSelection: false)
        tableView.scrollRowToVisible(row)
    }

    private func selectCurrent() {
        let row = tableView.selectedRow
        guard row >= 0, row < filtered.count else { exit(1) }
        print(filtered[row])
        exit(0)
    }

    // MARK: - Dynamic resize

    private func resizeWindow() {
        guard let window = view.window else { return }

        let visibleRows = min(filtered.count, maxRows)
        let tableHeight = CGFloat(visibleRows) * (rowHeight + 1)  // +1 for intercell spacing
        let totalHeight = inputAreaHeight + 1 + tableHeight + 8   // 1 for separator, 8 for bottom padding

        var frame = window.frame
        let oldTop = frame.maxY
        frame.size.height = max(totalHeight, inputAreaHeight + 9)
        frame.origin.y = oldTop - frame.size.height
        window.setFrame(frame, display: true, animate: false)
    }

    // MARK: - NSTableViewDataSource

    func numberOfRows(in tableView: NSTableView) -> Int {
        return filtered.count
    }

    // MARK: - NSTableViewDelegate

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let id = NSUserInterfaceItemIdentifier("ItemCell")
        var cell = tableView.makeView(withIdentifier: id, owner: nil) as? NSTextField
        if cell == nil {
            cell = NSTextField(labelWithString: "")
            cell?.identifier = id
            cell?.font = .systemFont(ofSize: 13, weight: .regular)
            cell?.textColor = NSColor(red: 0.80, green: 0.82, blue: 0.87, alpha: 1.0)
            cell?.lineBreakMode = .byTruncatingTail
        }
        cell?.stringValue = filtered[row]
        return cell
    }

    func tableView(_ tableView: NSTableView, rowViewForRow row: Int) -> NSTableRowView? {
        return PickerRowView()
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        // Redraw rows to update selection colors
        tableView.enumerateAvailableRowViews { rowView, _ in
            rowView.needsDisplay = true
        }
    }
}

// MARK: - App Delegate

class PickerAppDelegate: NSObject, NSApplicationDelegate {
    var window: PickerPanel!
    let pickerItems: [String]
    let pickerPrompt: String
    let pickerMaxRows: Int
    let pickerWidth: CGFloat
    let pickerFilterCmd: String

    init(items: [String], prompt: String, maxRows: Int, width: CGFloat, filterCmd: String) {
        self.pickerItems = items
        self.pickerPrompt = prompt
        self.pickerMaxRows = maxRows
        self.pickerWidth = width
        self.pickerFilterCmd = filterCmd
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let initialRows = min(pickerItems.count, pickerMaxRows)
        let initialHeight = CGFloat(40 + 1 + initialRows * 27 + 8)

        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1920, height: 1080)
        // Position near top of screen like VS Code command palette (about 25% from top)
        let topOffset = screenFrame.height * 0.25
        let windowFrame = NSRect(
            x: screenFrame.midX - pickerWidth / 2,
            y: screenFrame.maxY - topOffset - initialHeight,
            width: pickerWidth,
            height: initialHeight
        )

        window = PickerPanel(
            contentRect: windowFrame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        window.level = .floating
        window.isMovableByWindowBackground = false
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = true

        window.appearance = NSAppearance(named: .darkAqua)

        let vc = PickerViewController(items: pickerItems, prompt: pickerPrompt, maxRows: pickerMaxRows, filterCommand: pickerFilterCmd)
        window.contentViewController = vc
        window.setFrame(windowFrame, display: false)

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ application: NSApplication) -> Bool {
        return true
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
