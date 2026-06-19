import type { FrontendAgentApi } from "../main/preload";

declare global {
  interface Window {
    frontendAgent: FrontendAgentApi;
  }
}
