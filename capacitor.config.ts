import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.frontwice.app',
  appName: 'Frontwice',
  webDir: 'build_output',
  server: {
    androidScheme: 'https'
  }
};

export default config;
