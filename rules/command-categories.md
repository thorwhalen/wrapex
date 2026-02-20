# Command Categories

## Purpose

Categories group commands in the command palette, documentation, and telemetry dashboards. Each command has exactly one category.

## Standard Categories

Use these categories as defaults. Adapt to your app's domain:

| Category | Domain | Description | Examples |
|----------|--------|-------------|---------|
| **Camera** | `camera` | Viewport and zoom controls | zoomToFit, zoomIn, zoomOut, pan, resetView |
| **Data** | `data` | Data loading, filtering, querying | loadDataset, applyFilter, runQuery, clearFilters |
| **Selection** | `selection` | Selecting and highlighting items | selectAll, clearSelection, selectByAttribute |
| **UI** | `ui` | Interface toggles and layout | toggleSidebar, openPanel, closeDialog, toggleTheme |
| **Project** | `project` | Project lifecycle | save, load, create, delete, duplicate, rename |
| **Export** | `export` | Exporting data and assets | toPng, toCsv, toSvg, copyToClipboard |
| **Auth** | `auth` | Authentication and user | signIn, signOut, switchTeam |
| **Settings** | `settings` | Configuration changes | setLanguage, setTheme, updatePreferences |
| **Help** | `help` | Documentation and support | openDocs, showShortcuts, reportBug |

## Category Rules

1. **One word, PascalCase** in the command definition: `category: 'Camera'`.
2. **Lowercase in the domain segment** of the command ID: `app.camera.zoomToFit`.
3. **Each category maps to a directory** in `definitions/`: `definitions/camera/`, `definitions/data/`.
4. **If a command doesn't fit a standard category**, create a new one. Name it after the domain it serves.
5. **Don't over-categorize.** A project with 30 commands should have 5-8 categories, not 30. Group related operations.
6. **The palette groups by category.** Users scan by category heading, then by command name. Keep category labels concise.

## Custom Categories

If your app has domain-specific areas, add categories for them:

| App Type | Custom Categories |
|----------|------------------|
| Data visualization | Visualization, Layout, Simulation, Graph |
| E-commerce | Cart, Checkout, Product, Order |
| Editor | Document, Formatting, Insert, View |
| Chat app | Conversation, Message, Channel, Notification |

## Anti-Patterns

- **"General" / "Misc"**: If you have a catch-all category, the commands probably belong in more specific categories.
- **Too many single-command categories**: Merge them into a parent domain.
- **Category names that overlap**: "View" vs "Display" vs "UI" — pick one and be consistent.
