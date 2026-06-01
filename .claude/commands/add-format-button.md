Add a new formatting button to the editor toolbar.

The user wants to add: $ARGUMENTS

Follow these steps:

1. **Read `src/index.html`** — find the toolbar section (buttons with ids like `fmt-bold`, `fmt-italic`) and add a new button:
   ```html
   <button id="fmt-myformat" title="My Format">Icon</button>
   ```

2. **Read `src/main.js`** — use the existing required-element helper for the new button:
   ```js
   const fmtMyFormatButton = requireButtonElement("#fmt-myformat");
   ```
   Then wire up the click handler near the formatting command list or the
   adjacent custom format handlers:
   ```js
   fmtMyFormatButton.addEventListener("click", () => applyCommand("commandName"));
   ```

3. **Read `src/styles.css`** — check if any additional styles are needed for the button.

Available formatting helpers in `main.js`:
- `applyCommand(command, value)` — wraps `document.execCommand`
- `toggleInlineCode()` — toggles `<code>` around selection
- `insertLink()` — prompts for URL and inserts link

Common `execCommand` values: `"bold"`, `"italic"`, `"underline"`, `"strikeThrough"`, `"formatBlock"` (with `"h1"`–`"h6"`, `"blockquote"`, `"pre"`), `"insertUnorderedList"`, `"insertOrderedList"`.
