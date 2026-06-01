import SwiftUI
import UniformTypeIdentifiers

extension UTType {
    static let mkdownMarkdown = UTType(importedAs: "net.daringfireball.markdown")
}

struct MarkdownDocument: FileDocument {
    static var readableContentTypes: [UTType] {
        [.mkdownMarkdown, .plainText]
    }

    static var writableContentTypes: [UTType] {
        [.mkdownMarkdown, .plainText]
    }

    var text: String

    init(text: String = "# Untitled\n\nStart writing in Markdown.") {
        self.text = text
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }

        text = String(decoding: data, as: UTF8.self)
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}
