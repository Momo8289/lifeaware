'use client'

import { themes } from '@/components/ui/theme-selector'

export function ThemeScript() {
  // Generate the theme application script as a string
  const script = `
(function() {
  try {
    // Theme definitions
    const themes = ${JSON.stringify(themes)};
    
    // Get stored settings from localStorage using the correct keys
    const fontSize = localStorage.getItem('selected-font-size') || 'default';
    const colorTheme = localStorage.getItem('selected-theme') || 'default';
    const displayMode = localStorage.getItem('theme') || 'system';
    
    // Get dark mode preference
    const isDarkMode = (() => {
      if (displayMode === 'dark') return true;
      if (displayMode === 'light') return false;
      // System preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    })();
    
    // Apply color theme immediately
    const applyTheme = (themeName, isDark) => {
      const theme = themes.find(t => t.name === themeName);
      if (!theme) return;
      
      const root = document.documentElement;
      const variables = isDark ? theme.cssVariables.dark : theme.cssVariables.light;
      
      Object.entries(variables).forEach(([key, value]) => {
        root.style.setProperty('--' + key, value);
      });
    };
    
    // Apply font size immediately
    const applyFontSize = (fontSize) => {
      const fontSizes = [
        { name: "default", size: "1rem" },
        { name: "medium", size: "1.125rem" },
        { name: "large", size: "1.25rem" }
      ];
      
      const fontSizeOption = fontSizes.find(fs => fs.name === fontSize);
      if (!fontSizeOption) return;
      
      const root = document.documentElement;
      const baseSize = parseFloat(fontSizeOption.size);
      
      root.style.fontSize = fontSizeOption.size;
      root.style.setProperty('--font-size-base', fontSizeOption.size);
      root.style.setProperty('--font-size-xs', baseSize * 0.75 + 'rem');
      root.style.setProperty('--font-size-sm', baseSize * 0.875 + 'rem');
      root.style.setProperty('--font-size-lg', baseSize * 1.125 + 'rem');
      root.style.setProperty('--font-size-xl', baseSize * 1.25 + 'rem');
      root.style.setProperty('--font-size-2xl', baseSize * 1.5 + 'rem');
      root.style.setProperty('--font-size-3xl', baseSize * 1.875 + 'rem');
      root.style.setProperty('--font-size-4xl', baseSize * 2.25 + 'rem');
    };
    
    // Apply the theme and font size immediately
    if (colorTheme && colorTheme !== 'default') {
      applyTheme(colorTheme, isDarkMode);
    }
    
    if (fontSize) {
      applyFontSize(fontSize);
    }
    
  } catch (error) {
    // Silently fail if there's any error
    console.warn('Theme script error:', error);
  }
})();
`;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: script,
      }}
    />
  );
} 