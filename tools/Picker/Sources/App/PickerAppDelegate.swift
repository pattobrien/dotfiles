import AppKit

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
