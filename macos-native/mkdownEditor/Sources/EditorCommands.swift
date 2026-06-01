import Foundation
import SwiftUI

enum FormattingCommand: String, CaseIterable {
    case bold
    case italic
    case heading
    case link
    case image
    case unorderedList
    case orderedList
    case inlineCode
}

enum EditorViewMode: String, CaseIterable, Identifiable {
    case editor = "Editor"
    case split = "Split"
    case preview = "Preview"

    var id: String { rawValue }
}

enum ThemePreference: String, CaseIterable, Identifiable {
    case system = "System"
    case light = "Light"
    case dark = "Dark"

    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system:
            nil
        case .light:
            .light
        case .dark:
            .dark
        }
    }
}

struct MarkdownCommandTarget {
    var applyFormatting: (FormattingCommand) -> Void
    var setViewMode: (EditorViewMode) -> Void
    var setTheme: (ThemePreference) -> Void
}

private struct MarkdownCommandTargetKey: FocusedValueKey {
    typealias Value = MarkdownCommandTarget
}

extension FocusedValues {
    var markdownCommandTarget: MarkdownCommandTarget? {
        get { self[MarkdownCommandTargetKey.self] }
        set { self[MarkdownCommandTargetKey.self] = newValue }
    }
}
