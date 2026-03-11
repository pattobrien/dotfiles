import AppKit

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
