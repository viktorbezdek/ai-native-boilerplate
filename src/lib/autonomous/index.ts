/**
 * Autonomous Development System
 *
 * A complete architecture for self-sustaining development workflows.
 * Provides state management, inter-agent communication, and workflow orchestration.
 *
 * @module autonomous
 */

// Types
export * from "./types";

// Core components
export * from "./core";

// Persistence
export {
  FileStorage,
  getStorage,
  resetStorage,
} from "./persistence/file-storage";
