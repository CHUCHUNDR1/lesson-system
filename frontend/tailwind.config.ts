import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        ordFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-14px) rotate(2deg)' },
        },
        ordFloatReverse: {
          '0%, 100%': { transform: 'translateY(0) rotate(2deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-3deg)' },
        },
        ordDrift: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(8px, -12px) scale(1.02)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        ordScan: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(120vh)' },
        },
        ordPulseGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.65' },
        },
      },
      animation: {
        'ord-float': 'ordFloat 7s ease-in-out infinite',
        'ord-float-slow': 'ordFloatReverse 9s ease-in-out infinite 0.5s',
        'ord-drift': 'ordDrift 18s ease-in-out infinite',
        'ord-scan': 'ordScan 10s linear infinite',
        'ord-pulse-glow': 'ordPulseGlow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

