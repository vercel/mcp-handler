// Re-export the Next.js adapter
export { default as createMcpHandler } from "./next";

export { withMcpAuth as experimental_withMcpAuth } from "./next/auth-wrapper";
export type { AuthInfo } from "./next/auth-wrapper";
