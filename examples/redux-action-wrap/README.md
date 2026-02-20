# Example: Wrapping Redux Actions

This example shows how to wrap Redux Toolkit actions and thunks as commands.

## Before: Original Redux Slice

```typescript
// src/store/slices/dataSlice.ts (EXISTING — do not modify)
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface DataState {
  items: Item[];
  filters: Filter[];
  isLoading: boolean;
  error: string | null;
}

export const fetchItems = createAsyncThunk(
  'data/fetchItems',
  async (params: { page: number; pageSize: number }) => {
    const response = await fetch(`/api/items?page=${params.page}&pageSize=${params.pageSize}`);
    return response.json();
  },
);

export const dataSlice = createSlice({
  name: 'data',
  initialState: { items: [], filters: [], isLoading: false, error: null } as DataState,
  reducers: {
    addFilter(state, action: PayloadAction<Filter>) {
      state.filters.push(action.payload);
    },
    removeFilter(state, action: PayloadAction<string>) {
      state.filters = state.filters.filter(f => f.id !== action.payload);
    },
    clearFilters(state) {
      state.filters = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItems.pending, (state) => { state.isLoading = true; })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed';
        state.isLoading = false;
      });
  },
});

export const { addFilter, removeFilter, clearFilters } = dataSlice.actions;
```

```typescript
// src/store/index.ts (EXISTING — do not modify)
import { configureStore } from '@reduxjs/toolkit';
import { dataSlice } from './slices/dataSlice';

export const store = configureStore({
  reducer: { data: dataSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## After: Command Wrappers (new files only)

### Wrapping a sync reducer action

```typescript
// wrapex-output/commands/definitions/data/addFilter.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { store } from '../../../../src/store';
import { addFilter } from '../../../../src/store/slices/dataSlice';

const schema = z.object({
  id: z.string().describe('Unique filter identifier'),
  column: z.string().describe('Column to filter on'),
  operator: z.enum(['=', '!=', '>', '<', '>=', '<=']),
  value: z.union([z.string(), z.number()]).describe('Filter value'),
});

export const addFilterCommand = defineCommand({
  id: 'app.data.addFilter',
  label: 'Add Filter',
  category: 'Data',
  description: 'Add a data filter to the active dataset',
  schema,
  when: 'app.dataLoaded',

  execute: async (params) => {
    store.dispatch(addFilter(params));
    return { success: true, message: `Filter added on ${params.column}.` };
  },
});
```

### Wrapping an async thunk

```typescript
// wrapex-output/commands/definitions/data/fetchItems.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { store } from '../../../../src/store';
import { fetchItems } from '../../../../src/store/slices/dataSlice';

const schema = z.object({
  page: z.number().int().min(1).default(1).describe('Page number'),
  pageSize: z.number().int().min(1).max(100).default(20).describe('Items per page'),
});

export const fetchItemsCommand = defineCommand({
  id: 'app.data.fetchItems',
  label: 'Fetch Items',
  category: 'Data',
  description: 'Load a page of items from the server',
  schema,

  execute: async (params) => {
    const result = await store.dispatch(fetchItems(params));

    if (fetchItems.rejected.match(result)) {
      return {
        success: false,
        message: result.error.message ?? 'Failed to fetch items.',
      };
    }

    return {
      success: true,
      message: `Loaded ${(result.payload as any[]).length} items.`,
      data: result.payload,
    };
  },
});
```

### Wrapping a simple action (no params)

```typescript
// wrapex-output/commands/definitions/data/clearFilters.ts (NEW FILE)
import { defineCommand } from '../../core/define-command';
import { store } from '../../../../src/store';
import { clearFilters } from '../../../../src/store/slices/dataSlice';

export const clearFiltersCommand = defineCommand({
  id: 'app.data.clearFilters',
  label: 'Clear All Filters',
  category: 'Data',
  description: 'Remove all active data filters',
  keybinding: { key: 'Escape' },
  when: 'app.dataLoaded',

  execute: async () => {
    store.dispatch(clearFilters());
    return { success: true, message: 'All filters cleared.' };
  },
});
```

## Key Points

1. **Import `store` directly**, not via hooks. Commands run outside React components.
2. **Use `store.dispatch()`** for both sync actions and async thunks.
3. **Handle thunk rejection**: Check `actionCreator.rejected.match(result)` for async thunks.
4. **Import action creators** from the slice — they're already typed.
5. **Same zero-touch principle**: The Redux slice is untouched. Commands are new files.
