import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        background: '#F7F8FA',
        workspace: '#F7F8FA',
        foreground: '#242633',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7F8FA',
          subtle: '#EEF0FF',
        },
        sidebar: '#FFFFFF',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#242633',
        },
        muted: {
          DEFAULT: '#F7F8FA',
          foreground: '#858A99',
          subtle: '#A2A7B5',
        },
        border: {
          DEFAULT: '#E9EAF0',
          hover: '#D8DAE5',
          subtle: '#F0F1F6',
        },
        accent: {
          DEFAULT: '#7185E8',
          hover: '#5F73DD',
          deep: '#4E62CC',
          subtle: '#EEF0FF',
          secondary: '#9A8AE8',
          foreground: '#FFFFFF',
        },
        status: {
          success: '#29A36A',
          'success-bg': '#EDF8F2',
          warning: '#E6A13A',
          'warning-bg': '#FEF7ED',
          info: '#7185E8',
          'info-bg': '#EEF0FF',
          danger: '#E55353',
          'danger-bg': '#FDF2F2',
        },
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '28px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(36, 38, 51, 0.04)',
        card: '0 2px 8px -2px rgba(36, 38, 51, 0.06), 0 1px 3px 0 rgba(36, 38, 51, 0.03)',
        floating: '0 25px 60px -15px rgba(50, 70, 140, 0.16), 0 8px 24px -6px rgba(50, 70, 140, 0.08)',
        dropdown: '0 10px 25px -5px rgba(36, 38, 51, 0.12), 0 4px 10px -2px rgba(36, 38, 51, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
    },
  },
  plugins: [],
};

export default config;
