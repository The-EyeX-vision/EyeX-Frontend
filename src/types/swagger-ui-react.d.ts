// Type declaration shim for swagger-ui-react
// The actual package is declared in package.json but not yet installed in this environment.
// This shim prevents TypeScript from erroring on the dynamic import in /api/docs/page.tsx.
declare module 'swagger-ui-react' {
  import React from 'react'

  interface SwaggerUIProps {
    spec?: object
    url?: string
    [key: string]: unknown
  }

  const SwaggerUI: React.FC<SwaggerUIProps>
  export default SwaggerUI
}
