import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tessou.verdant.atelier',
  appName: 'Verdant Atelier',
  webDir: 'dist-app',
  server: {
    androidScheme: 'https',
  },
};

export default config;
