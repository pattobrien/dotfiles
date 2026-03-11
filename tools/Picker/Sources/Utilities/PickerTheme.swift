import AppKit

// MARK: - Catppuccin Mocha palette

enum CatppuccinMocha {
    static let rosewater = NSColor(red: 0.961, green: 0.878, blue: 0.863, alpha: 1.0)  // #f5e0dc
    static let flamingo = NSColor(red: 0.949, green: 0.804, blue: 0.804, alpha: 1.0)  // #f2cdcd
    static let pink = NSColor(red: 0.961, green: 0.761, blue: 0.906, alpha: 1.0)  // #f5c2e7
    static let mauve = NSColor(red: 0.796, green: 0.651, blue: 0.969, alpha: 1.0)  // #cba6f7
    static let red = NSColor(red: 0.953, green: 0.545, blue: 0.659, alpha: 1.0)  // #f38ba8
    static let maroon = NSColor(red: 0.922, green: 0.627, blue: 0.675, alpha: 1.0)  // #eba0ac
    static let peach = NSColor(red: 0.980, green: 0.702, blue: 0.529, alpha: 1.0)  // #fab387
    static let yellow = NSColor(red: 0.976, green: 0.886, blue: 0.686, alpha: 1.0)  // #f9e2af
    static let green = NSColor(red: 0.651, green: 0.890, blue: 0.631, alpha: 1.0)  // #a6e3a1
    static let teal = NSColor(red: 0.580, green: 0.886, blue: 0.835, alpha: 1.0)  // #94e2d5
    static let sky = NSColor(red: 0.537, green: 0.863, blue: 0.922, alpha: 1.0)  // #89dceb
    static let sapphire = NSColor(red: 0.455, green: 0.780, blue: 0.925, alpha: 1.0)  // #74c7ec
    static let blue = NSColor(red: 0.537, green: 0.706, blue: 0.980, alpha: 1.0)  // #89b4fa
    static let lavender = NSColor(red: 0.706, green: 0.745, blue: 0.996, alpha: 1.0)  // #b4befe

    static let text = NSColor(red: 0.804, green: 0.839, blue: 0.957, alpha: 1.0)  // #cdd6f4
    static let subtext1 = NSColor(red: 0.729, green: 0.761, blue: 0.871, alpha: 1.0)  // #bac2de
    static let subtext0 = NSColor(red: 0.651, green: 0.678, blue: 0.784, alpha: 1.0)  // #a6adc8
    static let overlay2 = NSColor(red: 0.580, green: 0.612, blue: 0.698, alpha: 1.0)  // #9399b2
    static let overlay1 = NSColor(red: 0.498, green: 0.518, blue: 0.612, alpha: 1.0)  // #7f849c
    static let overlay0 = NSColor(red: 0.424, green: 0.439, blue: 0.525, alpha: 1.0)  // #6c7086
    static let surface2 = NSColor(red: 0.345, green: 0.357, blue: 0.439, alpha: 1.0)  // #585b70
    static let surface1 = NSColor(red: 0.271, green: 0.278, blue: 0.353, alpha: 1.0)  // #45475a
    static let surface0 = NSColor(red: 0.192, green: 0.196, blue: 0.267, alpha: 1.0)  // #313244
    static let base = NSColor(red: 0.118, green: 0.118, blue: 0.180, alpha: 1.0)  // #1e1e2e
    static let mantle = NSColor(red: 0.094, green: 0.094, blue: 0.145, alpha: 1.0)  // #181825
    static let crust = NSColor(red: 0.067, green: 0.067, blue: 0.106, alpha: 1.0)  // #11111b
}

// MARK: - Semantic theme (maps palette to UI roles)

struct PickerTheme {
    let background: NSColor
    let inputBackground: NSColor
    let text: NSColor
    let prompt: NSColor
    let separator: NSColor
    let rowText: NSColor
    let selection: NSColor
    let placeholder: NSColor

    static let shared = PickerTheme(
        background: CatppuccinMocha.base,
        inputBackground: CatppuccinMocha.surface0,
        text: CatppuccinMocha.text,
        prompt: CatppuccinMocha.subtext0,
        separator: CatppuccinMocha.surface1,
        rowText: CatppuccinMocha.subtext1,
        selection: CatppuccinMocha.surface1,
        placeholder: CatppuccinMocha.overlay0
    )
}
