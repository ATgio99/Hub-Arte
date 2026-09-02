import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hubart.atlante',
  appName: 'HUB Arte',
  webDir: 'dist',
  server: {
    // No external server needed - everything is bundled
    androidScheme: 'https'
  },
  ios: {
    allowsLinkPreview: false,
    contentInset: 'automatic',
    // Carta chiara, come il sito. Prima era #1a1a1a, di quando il tema era
    // scuro: all'avvio si vedeva un lampo nero prima della pagina.
    backgroundColor: '#f6f1e8',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#f6f1e8',
      showSpinner: false,
    },
    StatusBar: {
      // «DARK» qui vuol dire contenuto scuro su fondo chiaro: e' il verso
      // giusto per un'app con lo sfondo color carta, e con quello nero le
      // icone di sistema sparivano.
      style: 'DARK',
      backgroundColor: '#f6f1e8',
    },
  },
};

export default config;
