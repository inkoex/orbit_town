/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      display: ['var(--font-display)', 'sans-serif'],
      body: ['var(--font-body)', 'monospace'],
    },
    extend: {
      colors: {
        brown: {
          100: '#e2e8f0',  // 강조 텍스트
          200: '#cbd5e1',  // 비활성/힌트 — Amendment D
          300: '#94a3b8',  // 보조 텍스트 — Amendment D
          500: '#2d3748',  // 강조 표면
          700: '#111827',  // 패널 배경 (어두운 흑연)
          800: '#0a0d14',  // 사이드바/메인 배경
          900: '#050709',  // 가장 어두운 테두리
        },
        clay: {
          100: '#a5f3fc',  // 밝은 cyan
          300: '#22d3ee',  // 중간 cyan (강조 텍스트)
          500: '#06b6d4',  // 기본 cyan (버튼·액센트)
          700: '#0e7490',  // 어두운 cyan
          900: '#164e63',  // 가장 어두운 cyan
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
