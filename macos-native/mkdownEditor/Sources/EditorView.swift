import SwiftUI
import UniformTypeIdentifiers

struct EditorView: View {
    @Binding var document: MarkdownDocument

    @AppStorage("themePreference") private var themePreference = ThemePreference.system
    @AppStorage("editorViewMode") private var viewMode = EditorViewMode.split
    @State private var selectedRange = NSRange(location: 0, length: 0)
    @State private var isDropTargeted = false
    @State private var status = "Ready"

    var body: some View {
        VStack(spacing: 0) {
            editorSurface
            statusBar
        }
        .frame(minWidth: 760, minHeight: 520)
        .toolbar { editorToolbar }
        .navigationTitle("mkdownEditor")
        .preferredColorScheme(themePreference.colorScheme)
        .focusedValue(\.markdownCommandTarget, MarkdownCommandTarget(
            applyFormatting: applyFormatting,
            setViewMode: { viewMode = $0 },
            setTheme: { themePreference = $0 }
        ))
        .onDrop(of: [UTType.fileURL.identifier], isTargeted: $isDropTargeted, perform: handleDrop)
        .overlay(dropOverlay)
    }

    @ViewBuilder
    private var editorSurface: some View {
        switch viewMode {
        case .editor:
            markdownEditor
        case .split:
            HSplitView {
                markdownEditor
                    .frame(minWidth: 320)
                markdownPreview
                    .frame(minWidth: 280)
            }
        case .preview:
            markdownPreview
        }
    }

    private var markdownEditor: some View {
        MarkdownTextView(text: $document.text, selectedRange: $selectedRange)
            .background(Color(nsColor: .textBackgroundColor))
    }

    private var markdownPreview: some View {
        ScrollView {
            Text(renderedMarkdown)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(28)
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }

    private var statusBar: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.accentColor)
                .frame(width: 7, height: 7)
            Text(status)
            Spacer()
            Text("\(document.text.count) characters")
                .foregroundStyle(.secondary)
            Picker("View", selection: $viewMode) {
                ForEach(EditorViewMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 210)
        }
        .font(.callout)
        .padding(.horizontal, 14)
        .frame(height: 34)
        .background(.bar)
    }

    @ToolbarContentBuilder
    private var editorToolbar: some ToolbarContent {
        ToolbarItemGroup {
            Button {
                NSDocumentController.shared.openDocument(nil)
            } label: {
                Label("Open", systemImage: "folder")
            }
            Button {
                NSDocumentController.shared.currentDocument?.save(nil)
            } label: {
                Label("Save", systemImage: "square.and.arrow.down")
            }
            Button {
                NSDocumentController.shared.currentDocument?.saveAs(nil)
            } label: {
                Label("Save As", systemImage: "square.and.arrow.down.on.square")
            }
        }

        ToolbarItemGroup {
            Button { applyFormatting(.bold) } label: {
                Label("Bold", systemImage: "bold")
            }
            Button { applyFormatting(.italic) } label: {
                Label("Italic", systemImage: "italic")
            }
            Button { applyFormatting(.heading) } label: {
                Label("Heading", systemImage: "textformat.size")
            }
            Button { applyFormatting(.link) } label: {
                Label("Link", systemImage: "link")
            }
            Button { applyFormatting(.image) } label: {
                Label("Image", systemImage: "photo")
            }
            Button { applyFormatting(.unorderedList) } label: {
                Label("List", systemImage: "list.bullet")
            }
            Button { applyFormatting(.orderedList) } label: {
                Label("Ordered List", systemImage: "list.number")
            }
            Button { applyFormatting(.inlineCode) } label: {
                Label("Inline Code", systemImage: "chevron.left.forwardslash.chevron.right")
            }
        }

        ToolbarItemGroup {
            Picker("Theme", selection: $themePreference) {
                ForEach(ThemePreference.allCases) { preference in
                    Text(preference.rawValue).tag(preference)
                }
            }
            .pickerStyle(.menu)
        }
    }

    private var renderedMarkdown: AttributedString {
        (try? AttributedString(markdown: document.text)) ?? AttributedString(document.text)
    }

    @ViewBuilder
    private var dropOverlay: some View {
        if isDropTargeted {
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.accentColor, lineWidth: 3)
                .padding(8)
        }
    }

    private func applyFormatting(_ command: FormattingCommand) {
        var text = document.text
        let nsText = text as NSString
        let range = selectedRange.clamped(toLength: nsText.length)
        let selectedText = nsText.substring(with: range)
        let replacement = formattedReplacement(for: command, selectedText: selectedText)

        text = nsText.replacingCharacters(in: range, with: replacement)
        document.text = text
        selectedRange = NSRange(location: range.location + replacement.count, length: 0)
        status = "Inserted \(label(for: command))"
    }

    private func formattedReplacement(for command: FormattingCommand, selectedText: String) -> String {
        let fallback = selectedText.isEmpty

        switch command {
        case .bold:
            return "**\(fallback ? "bold text" : selectedText)**"
        case .italic:
            return "_\(fallback ? "italic text" : selectedText)_"
        case .heading:
            let content = fallback ? "Heading" : selectedText
            return "# \(content)"
        case .link:
            let content = fallback ? "link text" : selectedText
            return "[\(content)](https://example.com)"
        case .image:
            let alt = fallback ? "image description" : selectedText
            return "![\(alt)](image.png)"
        case .unorderedList:
            let content = fallback ? "List item" : selectedText
            return content
                .split(separator: "\n", omittingEmptySubsequences: false)
                .map { "- \($0)" }
                .joined(separator: "\n")
        case .orderedList:
            let lines = (fallback ? "List item" : selectedText)
                .split(separator: "\n", omittingEmptySubsequences: false)
            return lines.enumerated()
                .map { index, line in "\(index + 1). \(line)" }
                .joined(separator: "\n")
        case .inlineCode:
            return "`\(fallback ? "code" : selectedText)`"
        }
    }

    private func label(for command: FormattingCommand) -> String {
        switch command {
        case .bold:
            "bold text"
        case .italic:
            "italic text"
        case .heading:
            "heading"
        case .link:
            "link"
        case .image:
            "image"
        case .unorderedList:
            "list"
        case .orderedList:
            "ordered list"
        case .inlineCode:
            "inline code"
        }
    }

    private func handleDrop(_ providers: [NSItemProvider]) -> Bool {
        guard let provider = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) }) else {
            return false
        }

        provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
            guard let url = droppedURL(from: item), url.isMarkdownLike else {
                DispatchQueue.main.async {
                    status = "Drop a Markdown or text file"
                }
                return
            }

            do {
                let contents = try String(contentsOf: url, encoding: .utf8)
                DispatchQueue.main.async {
                    document.text = contents
                    status = "Loaded \(url.lastPathComponent)"
                }
            } catch {
                DispatchQueue.main.async {
                    status = "Could not open \(url.lastPathComponent)"
                }
            }
        }

        return true
    }
}

private func droppedURL(from item: NSSecureCoding?) -> URL? {
    if let url = item as? URL {
        return url
    }

    if let data = item as? Data {
        return URL(dataRepresentation: data, relativeTo: nil)
    }

    return nil
}

private extension URL {
    var isMarkdownLike: Bool {
        ["md", "markdown", "txt"].contains(pathExtension.lowercased())
    }
}

private extension NSRange {
    func clamped(toLength length: Int) -> NSRange {
        let safeLocation = min(max(0, location), length)
        let safeEnd = min(max(safeLocation, location + self.length), length)
        return NSRange(location: safeLocation, length: safeEnd - safeLocation)
    }
}
