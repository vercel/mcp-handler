import {
    metadataCorsOptionsRequestHandler,
    protectedResourceHandlerClerk,
  } from '@clerk/mcp-tools/next'
  
  const handler = protectedResourceHandlerClerk({
    // Specify which OAuth scopes this protected resource supports
    scopes_supported: ['profile', 'email'],
  })
  
  export { handler as GET, metadataCorsOptionsRequestHandler as OPTIONS }