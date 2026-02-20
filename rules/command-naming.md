# Command Naming Conventions

## ID Format

All command IDs follow the pattern: `{prefix}.{domain}.{action}`

- **prefix**: The app's namespace. Default: `app`. Configurable per project.
- **domain**: The functional area. Lowercase, one word. Maps to a category.
- **action**: The operation. camelCase verb or verb phrase.

### Examples

| ID | Prefix | Domain | Action |
|----|--------|--------|--------|
| `app.camera.zoomToFit` | app | camera | zoomToFit |
| `app.data.applyFilter` | app | data | applyFilter |
| `app.selection.selectAll` | app | selection | selectAll |
| `app.ui.toggleSidebar` | app | ui | toggleSidebar |
| `app.project.save` | app | project | save |
| `app.export.toPng` | app | export | toPng |

### Naming Rules

1. **Actions start with a verb**: `zoom`, `apply`, `select`, `toggle`, `set`, `get`, `load`, `save`, `delete`, `create`, `update`, `reset`, `clear`, `open`, `close`, `show`, `hide`, `enable`, `disable`, `export`, `import`.

2. **Use camelCase for multi-word actions**: `zoomToFit`, `applyFilter`, `selectByAttribute`, `toggleSidebar`.

3. **Domain names are singular**: `camera` not `cameras`, `project` not `projects`.

4. **No redundancy**: If the domain is `camera`, don't repeat it in the action — use `app.camera.zoomToFit` not `app.camera.cameraZoomToFit`.

5. **Boolean toggles use `toggle` or `set`**:
   - `app.ui.toggleSidebar` — flips the current state
   - `app.ui.setSidebarOpen` — sets to a specific value (takes a boolean param)

6. **CRUD operations** follow this convention:
   - `create` — new entity
   - `load` / `get` — retrieve existing
   - `update` / `set` — modify existing
   - `delete` / `remove` — remove existing
   - `save` — persist changes

7. **Avoid abbreviations** unless universally understood: `png`, `csv`, `sql` are fine. `cfg`, `mgr`, `btn` are not.

## Variable Names

The exported constant for a command definition follows: `{action}Command`

| ID | Variable Name |
|----|--------------|
| `app.camera.zoomToFit` | `zoomToFitCommand` |
| `app.data.applyFilter` | `applyFilterCommand` |

## File Names

Command definition files are named after the action in camelCase:

| ID | File Path |
|----|----------|
| `app.camera.zoomToFit` | `definitions/camera/zoomToFit.ts` |
| `app.data.applyFilter` | `definitions/data/applyFilter.ts` |
