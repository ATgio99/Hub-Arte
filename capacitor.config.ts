import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hubart.atlante',
  appName: 'HUB Art',
  webDir: 'dist',
  server: {
    // No external server needed - everything is bundled
    androidScheme: 'https'
  },
  ios: {
    // Allow mixed content for local data files
    allowsLinkPreview: false,
    // Use WKWebView configuration
    contentInset: 'automatic',
    // Preferred background color
    backgroundColor: '#1a1a1a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a1a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a1a',
    },
  },
};

export default config;
