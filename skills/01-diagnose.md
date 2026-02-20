# Skill 01: Diagnose — Scan Codebase for Command Candidates

## Goal

Scan the target codebase and produce a structured **diagnosis report** listing every function, action, or event handler that is a candidate for wrapping as a command. The report follows the `DiagnosisReport` schema defined in `schemas/diagnosis-report.schema.ts`.

**No files are modified.** This skill is read-only.

---

## Inputs

- The root directory of the target codebase.
- (Optional) A `wrapex.config.ts` file with ID prefix and category overrides.

## Output

A JSON file at `wrapex-output/diagnosis-report.json` conforming to the `DiagnosisReport` schema.

---

## Steps

### Step 1: Detect State Management

Search for state management libraries in the project's dependencies and source code.

**Search patterns:**

| Library | Package.json key | Source pattern |
|---------|-------------------|---------------|
| Zustand | `"zustand"` | `import { create } from 'zustand'` or `import create from 'zustand'` |
| Redux Toolkit | `"@reduxjs/toolkit"` | `createSlice(`, `configureStore(` |
| Redux (classic) | `"redux"` | `createStore(`, `combineReducers(` |
| MobX | `"mobx"` | `makeObservable(`, `makeAutoObservable(`, `@observable` |
| Jotai | `"jotai"` | `atom(`, `useAtom(` |
| Recoil | `"recoil"` | `atom(`, `selector(`, `useRecoilState(` |
| Valtio | `"valtio"` | `proxy(`, `useSnapshot(` |
| Plain React | — | `useState(`, `useReducer(` only |

Record which state management type(s) are found. Most projects use one primary approach.

### Step 2: Find Store Definitions

Based on the detected state management type, locate all store/slice files.

**Zustand patterns** (grep for these):
```
create<                     # Zustand create with type param
create(                     # Zustand create
createStore(                # Zustand vanilla store
```

**Redux Toolkit patterns**:
```
createSlice({               # RTK slice definition
createAsyncThunk(           # RTK async thunk
```

For each store found, extract:
- File path
- Store/slice name
- List of action names (methods that modify state)

**Zustand action detection**: In a Zustand store, actions are typically functions passed to `create()` or `set()` inside the store creator. Look for:
```typescript
// Pattern 1: Methods in the store creator
create<StoreType>((set, get) => ({
  actionName: (params) => set((state) => { ... }),
  asyncAction: async (params) => { ... set(...) ... },
}))

// Pattern 2: Methods in slice creators
export const createXxxSlice = (...) => ({
  actionName: (params) => { set(...) },
})

// Pattern 3: Interface-defined actions
interface StoreActions {
  actionName: (param: Type) => void;
  asyncAction: (param: Type) => Promise<void>;
}
```

Extract each action's name, parameters (from TypeScript signature), and whether it's async.

### Step 3: Find Event Handlers

Search for React event handlers that trigger state changes.

**Grep patterns**:
```
onClick={                   # Button clicks
onChange={                   # Input changes
onSubmit={                  # Form submissions
onKeyDown={                 # Keyboard events
onDrop={                    # Drag and drop
onSelect={                  # Selection events
```

For each handler, determine:
- Is it inline or extracted to a named function?
- Does it call a store action directly?
- Does it call an API?
- What parameters does it use?

**Skip** trivial handlers that only toggle local UI state (e.g., `onClick={() => setIsOpen(!isOpen)}`). Focus on handlers that:
- Call store actions
- Make API calls
- Trigger side effects (navigation, file operations, etc.)
- Would be useful from a command palette

### Step 4: Find API Calls

Search for API communication patterns.

**tRPC patterns**:
```
.useQuery(                  # tRPC React query
.useMutation(               # tRPC React mutation
.query(                     # tRPC vanilla client query
.mutate(                    # tRPC vanilla client mutation
```

**REST/fetch patterns**:
```
fetch(                      # Native fetch
axios.                      # Axios calls
```

**GraphQL patterns**:
```
useQuery(                   # Apollo/urql query
useMutation(                # Apollo/urql mutation
gql`                        # GraphQL tagged template
```

For each API call, extract the endpoint/procedure name and input shape.

### Step 5: Find Existing Command-Like Patterns

Search for patterns that already resemble a command system:

```
// Keyboard shortcuts
hotkeys(                    # hotkeys-js
tinykeys(                   # tinykeys
useHotkeys(                 # react-hotkeys-hook
addEventListener('keydown'  # Manual keyboard handling
Mousetrap.bind(             # Mousetrap

// Command palette
<CommandDialog              # cmdk
<KBarProvider               # kbar
useKBar(                    # kbar hook

// Centralized dispatch
dispatch(                   # Redux dispatch
.execute(                   # Generic execute pattern
```

### Step 6: Classify Each Candidate

For each item found in steps 2-5, create a `CommandCandidate` entry:

1. **Assign a proposed ID** following `{prefix}.{domain}.{action}` convention:
   - `prefix`: from config or default `app`
   - `domain`: inferred from the file path or store name (e.g., `camera`, `data`, `ui`, `selection`)
   - `action`: the function/method name in camelCase

2. **Assign a category** based on domain grouping.

3. **Estimate complexity**:
   - `simple`: Synchronous, no params or primitive params, single store call
   - `moderate`: Has params that need a Zod schema, or calls an API
   - `complex`: Async with multiple steps, error handling, or multiple side effects

4. **Extract parameter candidates** from the TypeScript signature.

5. **Identify invocation surfaces** — where is this currently triggered from?

6. **Assign priority** (1-5):
   - 5: User-facing action triggered from ≥3 surfaces, or core to the app's purpose
   - 4: User-facing action triggered from 2 surfaces
   - 3: User-facing action triggered from 1 surface
   - 2: Internal action that would benefit from telemetry/testing
   - 1: Utility function unlikely to need multiple invocation surfaces

### Step 7: Compile the Report

Assemble all findings into a `DiagnosisReport`:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "rootDir": "/path/to/project",
  "summary": {
    "totalCandidates": 47,
    "byPattern": { "zustand-action": 28, "event-handler": 12, "api-call": 7 },
    "byCategory": { "Camera": 6, "Data": 15, "UI": 10, "Selection": 8, "Export": 8 },
    "byComplexity": { "simple": 20, "moderate": 18, "complex": 9 },
    "storeCount": 4,
    "stateManagement": ["zustand"]
  },
  "stores": [ ... ],
  "candidates": [ ... ],
  "filesScanned": 142,
  "warnings": []
}
```

Write the report to `wrapex-output/diagnosis-report.json`.

### Step 8: Generate Human-Readable Summary

Also write a markdown summary to `wrapex-output/diagnosis-summary.md` containing:
- Overview table of candidates by category and complexity
- Top 20 highest-priority candidates with notes
- Detected stores and their action counts
- Recommendations for Phase 1 wrapping targets

---

## Validation Checklist

Before completing, verify:

- [ ] All store files were found and their actions listed
- [ ] Event handlers that call store actions were captured
- [ ] API calls were identified
- [ ] Each candidate has a valid proposed ID following naming conventions
- [ ] No existing files were modified
- [ ] Output files are written to `wrapex-output/`
- [ ] The JSON report parses against the DiagnosisReport schema
