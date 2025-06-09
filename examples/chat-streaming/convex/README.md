# Convex Backend Architecture

This document explains the cleaned up and organized structure of the Convex backend.

## 🧹 Cleanup Summary

### What Was Removed
- **Migration Code**: Removed `migrateThreadsWithUuids` function from `threads.ts` - no longer needed
- **Duplicate Model Definitions**: Consolidated scattered model definitions from multiple files
- **Hardcoded Values**: Removed hardcoded model IDs like `gpt-4o-mini` that didn't exist in config
- **Provider Import Duplication**: Eliminated duplicate AI SDK imports across files
- **Legacy Files**: Removed old `models.ts`, `agents.ts`, and `providers.ts` files

### Schema Changes
- Made `uuid` field required in threads table (removed backward compatibility)
- Cleaned up comments and optional fields that were no longer needed

## 📁 New Structure

### `/config` - Centralized Configuration
All configuration is now centralized in the `config/` folder:

#### `config/models.ts`
- **Single source of truth** for all model definitions
- Centralized default model constants (`DEFAULT_CHAT_MODEL`, `DEFAULT_EMBEDDING_MODEL`)
- Model validation schemas and utility functions
- Supports: OpenAI, Anthropic, Google, Groq, Perplexity

#### `config/providers.ts`
- Centralized AI provider management
- Factory functions for creating model instances
- Handles provider-specific configurations and API keys

#### `config/agents.ts`
- Agent configurations using centralized model definitions
- Tool definitions and validation schemas
- Agent recommendation logic

### Core Files

#### `chatStreaming.ts`
- **Cleaned up**: Now uses centralized configurations
- **Consistent**: All model references use the same default values
- **No hardcoding**: Removed scattered model IDs and provider imports

#### `threads.ts`
- **Migration-free**: Removed legacy migration code
- **Simplified**: Core thread management functions only

#### `types.ts`
- **Re-exports**: Now just re-exports types from config files
- **No duplication**: Eliminated redundant type definitions

#### `tools.ts`
- **Updated**: Uses centralized ToolId enum from config
- **Consistent**: Tool validation aligned with config structure

## 🎯 Benefits

### 1. **Single Source of Truth**
- All model definitions in one place (`config/models.ts`)
- Easy to add/remove models
- Consistent model IDs across the entire application

### 2. **No More Duplication**
- Model IDs defined once, used everywhere
- Provider imports centralized
- Agent configurations use shared definitions

### 3. **Easy Maintenance**
- Want to change default model? Update one constant
- Want to add a new provider? Add it to providers config
- Clear separation of concerns

### 4. **Type Safety**
- Zod validation throughout
- TypeScript enums prevent typos
- Compile-time checks for model/agent configurations

## 🔧 Usage Examples

### Adding a New Model
```typescript
// In config/models.ts
export const ModelId = z.enum([
  // ... existing models
  "new-model-id"
]);

export const modelConfigs: Record<ModelId, ModelConfig> = {
  // ... existing configs
  "new-model-id": {
    id: "new-model-id",
    name: "New Model",
    provider: "openai",
    // ... other config
  }
};
```

### Using Models in Functions
```typescript
import { DEFAULT_CHAT_MODEL, ModelId } from "./config/models";
import { createModelInstance } from "./config/providers";

// Use default model
const model = createModelInstance(DEFAULT_CHAT_MODEL);

// Use specific model with validation
const specificModel = createModelInstance(ModelId.parse("gpt-4.1"));
```

### Changing Default Model
```typescript
// In config/models.ts - ONE place to change it
export const DEFAULT_CHAT_MODEL: ModelId = "claude-4-sonnet-20250514";
```

## 🚀 Next Steps

1. **Add new models** easily by updating the config files
2. **Extend agent capabilities** by modifying agent configurations
3. **Add new providers** by extending the provider factory
4. **Monitor usage** with centralized model tracking

The backend is now much cleaner, more maintainable, and follows the DRY principle throughout. 