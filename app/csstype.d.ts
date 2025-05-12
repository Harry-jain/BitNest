// This file fixes CSS-related TypeScript errors for Tailwind directives
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Add CSS module declarations
declare module 'tailwindcss/plugin' {
  const plugin: any;
  export default plugin;
}

// Support for @apply and other Tailwind directives
declare namespace React {
  interface CSSProperties {
    [key: string]: any;
  }
} 