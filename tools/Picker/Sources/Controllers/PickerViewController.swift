import AppKit

class PickerViewController: NSViewController, NSTableViewDataSource, NSTableViewDelegate,
    NSTextFieldDelegate
{

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

    private let theme = PickerTheme.shared

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
        container.layer?.backgroundColor = theme.background.cgColor
        container.layer?.cornerRadius = 10
        container.layer?.masksToBounds = true

        // Input area background
        let inputBg = NSView()
        inputBg.wantsLayer = true
        inputBg.layer?.backgroundColor = theme.inputBackground.cgColor
        inputBg.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(inputBg)

        // Prompt label ">"
        promptLabel = NSTextField(labelWithString: prompt)
        promptLabel.font = .monospacedSystemFont(ofSize: 15, weight: .medium)
        promptLabel.textColor = theme.prompt
        promptLabel.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(promptLabel)

        // Text field
        textField = PickerTextField()
        textField.placeholderString = ""
        textField.font = .monospacedSystemFont(ofSize: 15, weight: .regular)
        textField.textColor = theme.text
        textField.isBordered = false
        textField.drawsBackground = false
        textField.focusRingType = .none
        textField.delegate = self
        textField.translatesAutoresizingMaskIntoConstraints = false
        textField.onArrowKey = { [weak self] down in
            self?.moveSelection(down: down)
        }
        textField.placeholderAttributedString = NSAttributedString(
            string: "Type to filter...",
            attributes: [
                .foregroundColor: theme.placeholder,
                .font: NSFont.monospacedSystemFont(ofSize: 15, weight: .regular),
            ]
        )
        container.addSubview(textField)

        // Separator line
        let separator = NSView()
        separator.wantsLayer = true
        separator.layer?.backgroundColor = theme.separator.cgColor
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
            textField.leadingAnchor.constraint(
                equalTo: promptLabel.leadingAnchor, constant: promptWidth),
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

    func control(_ control: NSControl, textView: NSTextView, doCommandBy commandSelector: Selector)
        -> Bool
    {
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
        let tableHeight = CGFloat(visibleRows) * (rowHeight + 1)
        let totalHeight = inputAreaHeight + 1 + tableHeight + 8

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

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int)
        -> NSView?
    {
        let id = NSUserInterfaceItemIdentifier("ItemCell")
        var cell = tableView.makeView(withIdentifier: id, owner: nil) as? NSTextField
        if cell == nil {
            cell = NSTextField(labelWithString: "")
            cell?.identifier = id
            cell?.font = .systemFont(ofSize: 13, weight: .regular)
            cell?.textColor = theme.rowText
            cell?.lineBreakMode = .byTruncatingTail
        }
        cell?.stringValue = filtered[row]
        return cell
    }

    func tableView(_ tableView: NSTableView, rowViewForRow row: Int) -> NSTableRowView? {
        return PickerRowView()
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        tableView.enumerateAvailableRowViews { rowView, _ in
            rowView.needsDisplay = true
        }
    }
}
