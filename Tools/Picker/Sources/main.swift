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

var promptLabel = "❯ "
var maxVisible = 20
var windowWidth: CGFloat = 500

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
    default:
        i += 1
    }
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

// MARK: - PickerViewController

class PickerViewController: NSViewController, NSTableViewDataSource, NSTableViewDelegate, NSTextFieldDelegate {

    private let allItems: [String]
    private var filtered: [String]
    private let prompt: String
    private let maxRows: Int

    private let rowHeight: CGFloat = 24
    private let textFieldHeight: CGFloat = 36
    private let padding: CGFloat = 12  // top + bottom padding

    private var textField: PickerTextField!
    private var scrollView: NSScrollView!
    private var tableView: NSTableView!

    init(items: [String], prompt: String, maxRows: Int) {
        self.allItems = items
        self.filtered = items
        self.prompt = prompt
        self.maxRows = maxRows
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    override func loadView() {
        let container = NSVisualEffectView()
        container.material = .sidebar
        container.blendingMode = .behindWindow
        container.state = .active
        container.wantsLayer = true
        container.layer?.cornerRadius = 12
        container.layer?.masksToBounds = true

        // Text field
        textField = PickerTextField()
        textField.placeholderString = prompt
        textField.font = .monospacedSystemFont(ofSize: 14, weight: .regular)
        textField.isBordered = false
        textField.drawsBackground = false
        textField.focusRingType = .none
        textField.delegate = self
        textField.translatesAutoresizingMaskIntoConstraints = false
        textField.onArrowKey = { [weak self] down in
            self?.moveSelection(down: down)
        }
        container.addSubview(textField)

        // Separator
        let separator = NSBox()
        separator.boxType = .separator
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
        tableView.intercellSpacing = NSSize(width: 0, height: 2)
        tableView.style = .plain
        tableView.gridStyleMask = []

        scrollView = NSScrollView()
        scrollView.documentView = tableView
        scrollView.hasVerticalScroller = false
        scrollView.hasHorizontalScroller = false
        scrollView.drawsBackground = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(scrollView)

        NSLayoutConstraint.activate([
            textField.topAnchor.constraint(equalTo: container.topAnchor, constant: 8),
            textField.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
            textField.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12),
            textField.heightAnchor.constraint(equalToConstant: textFieldHeight),

            separator.topAnchor.constraint(equalTo: textField.bottomAnchor, constant: 4),
            separator.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
            separator.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -8),

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
        let query = textField.stringValue.lowercased()
        if query.isEmpty {
            filtered = allItems
        } else {
            filtered = allItems.filter { $0.lowercased().contains(query) }
        }
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
        let tableHeight = CGFloat(visibleRows) * (rowHeight + 2)  // +2 for intercell spacing
        let totalHeight = textFieldHeight + padding + tableHeight + 16  // 16 for separator + margins

        var frame = window.frame
        let oldTop = frame.maxY
        frame.size.height = max(totalHeight, textFieldHeight + padding + 16)
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
            cell?.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
            cell?.lineBreakMode = .byTruncatingTail
        }
        cell?.stringValue = filtered[row]
        return cell
    }

    func tableView(_ tableView: NSTableView, rowViewForRow row: Int) -> NSTableRowView? {
        return NSTableRowView()
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        // Could add visual feedback here if needed
    }
}

// MARK: - App Delegate

class PickerAppDelegate: NSObject, NSApplicationDelegate {
    var window: PickerPanel!
    let pickerItems: [String]
    let pickerPrompt: String
    let pickerMaxRows: Int
    let pickerWidth: CGFloat

    init(items: [String], prompt: String, maxRows: Int, width: CGFloat) {
        self.pickerItems = items
        self.pickerPrompt = prompt
        self.pickerMaxRows = maxRows
        self.pickerWidth = width
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let initialRows = min(pickerItems.count, pickerMaxRows)
        let initialHeight = CGFloat(36 + 12 + initialRows * 26 + 16)

        let screenFrame = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1920, height: 1080)
        let windowFrame = NSRect(
            x: screenFrame.midX - pickerWidth / 2,
            y: screenFrame.midY - initialHeight / 2,
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

        let vc = PickerViewController(items: pickerItems, prompt: pickerPrompt, maxRows: pickerMaxRows)
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
    width: windowWidth
)
app.delegate = delegate
app.run()
