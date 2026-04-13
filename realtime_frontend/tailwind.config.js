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
        familia: { 50:'#FFF5F0',100:'#FFEAD9',200:'#FFD0B3',300:'#FFB088',400:'#FF8C5A',500:'#FF6B35',600:'#E5541F',700:'#BF3F12',800:'#993210',900:'#7A2A0F' },
        warm: { 50:'#FEF7EE',100:'#FCE8D3',200:'#F8CDA5',300:'#F4AC6D',400:'#EF8133',500:'#EC6510',600:'#DD4B09',700:'#B7350B',800:'#922B10',900:'#762610' },
        bond: { 50:'#F0F9FF',100:'#E0F2FE',200:'#BAE6FD',300:'#7DD3FC',400:'#38BDF8',500:'#0EA5E9',600:'#0284C7',700:'#0369A1',800:'#075985',900:'#0C4A6E' },
        heart: { 50:'#FFF1F2',100:'#FFE4E6',200:'#FECDD3',300:'#FDA4AF',400:'#FB7185',500:'#F43F5E',600:'#E11D48',700:'#BE123C',800:'#9F1239',900:'#881337' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      animation: {
        'float':'float 6s ease-in-out infinite',
        'glow':'glow 2s ease-in-out infinite alternate',
        'slide-up':'slideUp 0.5s ease-out',
        'pulse-slow':'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':'spin 8s linear infinite',
        'gradient':'gradient 8s ease infinite',
        'shimmer':'shimmer 2s linear infinite',
        'heartbeat':'heartbeat 1.5s ease-in-out infinite',
        'aurora':'aurora 15s ease-in-out infinite alternate',
        'morph':'morph 8s ease-in-out infinite',
        'meteor':'meteor 5s linear infinite',
        'spotlight':'spotlight 8s ease infinite',
      },
      keyframes: {
        float: { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-20px)' } },
        glow: { '0%':{ boxShadow:'0 0 5px rgba(255,107,53,0.2)' }, '100%':{ boxShadow:'0 0 30px rgba(255,107,53,0.6)' } },
        slideUp: { '0%':{ transform:'translateY(30px)',opacity:'0' }, '100%':{ transform:'translateY(0)',opacity:'1' } },
        gradient: { '0%,100%':{ backgroundPosition:'0% 50%' }, '50%':{ backgroundPosition:'100% 50%' } },
        shimmer: { '0%':{ backgroundPosition:'-200% 0' }, '100%':{ backgroundPosition:'200% 0' } },
        heartbeat: { '0%,100%':{ transform:'scale(1)' }, '14%':{ transform:'scale(1.3)' }, '28%':{ transform:'scale(1)' }, '42%':{ transform:'scale(1.3)' }, '70%':{ transform:'scale(1)' } },
        aurora: { '0%':{ backgroundPosition:'0% 50%',transform:'rotate(0deg) scale(1)' }, '50%':{ backgroundPosition:'100% 50%',transform:'rotate(0deg) scale(1.06)' }, '100%':{ backgroundPosition:'0% 50%',transform:'rotate(0deg) scale(1)' } },
        morph: { '0%,100%':{ borderRadius:'60% 40% 30% 70%/60% 30% 70% 40%' }, '50%':{ borderRadius:'30% 60% 70% 40%/50% 60% 30% 60%' } },
        meteor: { '0%':{ transform:'rotate(215deg) translateX(0)',opacity:'1' }, '70%':{ opacity:'1' }, '100%':{ transform:'rotate(215deg) translateX(-500px)',opacity:'0' } },
        spotlight: { '0%':{ opacity:'0',transform:'translate(-72%,-62%) scale(0.5)' }, '50%':{ opacity:'0.1',transform:'translate(-50%,-40%) scale(1)' }, '100%':{ opacity:'0',transform:'translate(-36%,-62%) scale(0.5)' } },
      },
      backgroundImage: {
        'gradient-radial':'radial-gradient(var(--tw-gradient-stops))',
        'gradient-familia':'linear-gradient(135deg,#FF6B35 0%,#F43F5E 50%,#8B5CF6 100%)',
        'gradient-bond':'linear-gradient(135deg,#0EA5E9 0%,#8B5CF6 100%)',
      },
      boxShadow: {
        'glow-sm':'0 0 15px rgba(255,107,53,0.15)',
        'glow-md':'0 0 30px rgba(255,107,53,0.2)',
        'glow-lg':'0 0 60px rgba(255,107,53,0.25)',
        'glow-bond':'0 0 30px rgba(6,182,212,0.2)',
        'glow-heart':'0 0 30px rgba(244,63,94,0.2)',
      },
    },
  },
  plugins: [],
};
