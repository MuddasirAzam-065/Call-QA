/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        console: {
          bg: '#F4F6FA',
          surface: '#FFFFFF',
          raised: '#F1F4F9',
          border: '#E2E7F0',
          text: '#111827',
          muted: '#5B6478',
          faint: '#94A0B8',
        },
        signal: {
          DEFAULT: '#4F46E5',
          dim: '#3730A3',
          light: '#6366F1',
        },
        good: {
          DEFAULT: '#0F8A45',
        },
        amber: {
          DEFAULT: '#B45309',
        },
        alert: {
          DEFAULT: '#C0293D',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(79,70,229,0.35), 0 0 0 4px rgba(79,70,229,0.10)',
        panel: '0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -14px rgba(15,23,42,0.14)',
        brand: '0 8px 20px -6px rgba(79,70,229,0.45)',
      },
      keyframes: {
        pulseBar: {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        sweep: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        toastIn: {
          '0%': { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        pulseBar: 'pulseBar 1.1s ease-in-out infinite',
        sweep: 'sweep 3s linear infinite',
        fadeInUp: 'fadeInUp 0.4s ease-out',
        toastIn: 'toastIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
