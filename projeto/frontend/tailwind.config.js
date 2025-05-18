/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',    // azul médio – confiança e tecnologia
        secondary: '#10B981',  // verde – sucesso e melhoria
        background: '#F9FAFB', // cinza muito claro
        textDark: '#111827',   // cinza escuro
        textMedium: '#6B7280', // cinza médio
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
