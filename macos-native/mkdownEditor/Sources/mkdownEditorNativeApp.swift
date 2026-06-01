import SwiftUI

@main
struct MkdownEditorNativeApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: MarkdownDocument()) { file in
            EditorView(document: file.$document)
        }
        .commands {
            EditorCommands()
        }
    }
}

struct EditorCommands: Commands {
    @FocusedValue(\.markdownCommandTarget) private var commandTarget

    var body: some Commands {
        CommandMenu("Format") {
            Button("Bold") {
                commandTarget?.applyFormatting(.bold)
            }
            .keyboardShortcut("b", modifiers: .command)
            .disabled(commandTarget == nil)

            Button("Italic") {
                commandTarget?.applyFormatting(.italic)
            }
            .keyboardShortcut("i", modifiers: .command)
            .disabled(commandTarget == nil)

            Divider()

            Button("Heading") {
                commandTarget?.applyFormatting(.heading)
            }
            .keyboardShortcut("1", modifiers: [.command, .option])
            .disabled(commandTarget == nil)

            Button("Link") {
                commandTarget?.applyFormatting(.link)
            }
            .keyboardShortcut("k", modifiers: .command)
            .disabled(commandTarget == nil)

            Button("Image") {
                commandTarget?.applyFormatting(.image)
            }
            .keyboardShortcut("i", modifiers: [.command, .shift])
            .disabled(commandTarget == nil)

            Divider()

            Button("Unordered List") {
                commandTarget?.applyFormatting(.unorderedList)
            }
            .keyboardShortcut("8", modifiers: [.command, .shift])
            .disabled(commandTarget == nil)

            Button("Ordered List") {
                commandTarget?.applyFormatting(.orderedList)
            }
            .keyboardShortcut("7", modifiers: [.command, .shift])
            .disabled(commandTarget == nil)

            Button("Inline Code") {
                commandTarget?.applyFormatting(.inlineCode)
            }
            .keyboardShortcut("`", modifiers: .command)
            .disabled(commandTarget == nil)
        }

        CommandMenu("View") {
            Button("Editor") {
                commandTarget?.setViewMode(.editor)
            }
            .keyboardShortcut("1", modifiers: .command)
            .disabled(commandTarget == nil)

            Button("Split") {
                commandTarget?.setViewMode(.split)
            }
            .keyboardShortcut("2", modifiers: .command)
            .disabled(commandTarget == nil)

            Button("Preview") {
                commandTarget?.setViewMode(.preview)
            }
            .keyboardShortcut("3", modifiers: .command)
            .disabled(commandTarget == nil)

            Divider()

            Button("Use System Appearance") {
                commandTarget?.setTheme(.system)
            }
            .disabled(commandTarget == nil)

            Button("Light Appearance") {
                commandTarget?.setTheme(.light)
            }
            .disabled(commandTarget == nil)

            Button("Dark Appearance") {
                commandTarget?.setTheme(.dark)
            }
            .disabled(commandTarget == nil)
        }
    }
}
