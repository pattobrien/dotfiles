import AppKit

class PickerRowView: NSTableRowView {
    override func drawSelection(in dirtyRect: NSRect) {
        if selectionHighlightStyle != .none {
            PickerTheme.shared.selection.setFill()
            let selectionRect = bounds.insetBy(dx: 4, dy: 0)
            let path = NSBezierPath(roundedRect: selectionRect, xRadius: 4, yRadius: 4)
            path.fill()
        }
    }
}
