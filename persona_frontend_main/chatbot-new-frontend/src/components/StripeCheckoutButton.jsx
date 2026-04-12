import React, { useState } from "react";

export default function StripeCheckoutButton({ amount = 99, email = "user@example.com" }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/payments/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          email,
          currency: "usd",
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert("Payment error: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Payment error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      {/* Button container */}
      <div className="relative">
        {/* Gold glow effect - multiple layers */}
        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-40 scale-125 animate-pulse"></div>
        <div className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-30 scale-115"></div>
        <div className="absolute inset-0 bg-yellow-200 rounded-full blur-lg opacity-20 scale-110"></div>
        
        {/* Gold shining outline */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 p-0.5 animate-pulse">
          <div className="w-full h-full rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600"></div>
        </div>
        
        {/* Main button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="relative text-white font-medium text-lg px-6 py-3 rounded-full flex items-center gap-3 transition-all duration-300 border-2 border-yellow-300 hover:border-yellow-200 hover:scale-105 hover:shadow-3xl shadow-2xl overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 25%, #f59e0b 50%, #d97706 75%, #f59e0b 100%)',
            boxShadow: '0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(245, 158, 11, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3), inset 0 -2px 0 rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Gold flowing animation inside button */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200 to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-300"
              style={{
                animation: 'flow 3s ease-in-out infinite',
                transform: 'translateX(-100%)'
              }}
            ></div>
          </div>
          
          {/* Hover glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          

          
          {/* Ultra-realistic glowing diamond */}
          <div className="w-8 h-8 flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300">
            {/* Diamond glow aura */}
            <div className="absolute inset-0 bg-gradient-radial from-white via-blue-200 to-transparent rounded-full blur-sm opacity-60 animate-pulse scale-150"></div>
            
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.6))'
              }}
            >
              {/* Main diamond body with prismatic effect */}
              <path
                d="M8 4H24L28 12L16 28L4 12L8 4Z"
                fill="url(#prismaticGradient)"
                stroke="url(#diamondBorder)"
                strokeWidth="0.5"
              />
              
              {/* Top facet - brightest */}
              <path
                d="M8 4L16 12L24 4"
                fill="url(#topFacet)"
                stroke="url(#facetStroke)"
                strokeWidth="0.3"
              />
              
              {/* Left facet */}
              <path
                d="M8 4L4 12L16 12Z"
                fill="url(#leftFacet)"
                opacity="0.9"
              />
              
              {/* Right facet */}
              <path
                d="M24 4L28 12L16 12Z"
                fill="url(#rightFacet)"
                opacity="0.8"
              />
              
              {/* Bottom left facet */}
              <path
                d="M4 12L16 28L16 12Z"
                fill="url(#bottomLeftFacet)"
                opacity="0.7"
              />
              
              {/* Bottom right facet */}
              <path
                d="M28 12L16 28L16 12Z"
                fill="url(#bottomRightFacet)"
                opacity="0.6"
              />
              
              {/* Brilliant sparkle lines */}
              <path
                d="M12 8L16 12L20 8"
                stroke="url(#sparkleStroke)"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path
                d="M8 10L16 12L24 10"
                stroke="url(#sparkleStroke)"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.7"
              />
              
              {/* Center brilliant point */}
              <circle cx="16" cy="10" r="1" fill="url(#brilliantPoint)" opacity="0.9" />
              
              <defs>
                {/* Prismatic gradient for main body */}
                <linearGradient id="prismaticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="20%" stopColor="#dbeafe" />
                  <stop offset="40%" stopColor="#bfdbfe" />
                  <stop offset="60%" stopColor="#93c5fd" />
                  <stop offset="80%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                
                {/* Top facet - brightest white */}
                <linearGradient id="topFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                
                {/* Left facet */}
                <linearGradient id="leftFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dbeafe" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
                
                {/* Right facet */}
                <linearGradient id="rightFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#bfdbfe" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                
                {/* Bottom facets */}
                <linearGradient id="bottomLeftFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
                
                <linearGradient id="bottomRightFacet" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
                
                {/* Strokes and highlights */}
                <linearGradient id="diamondBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                
                <linearGradient id="facetStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#dbeafe" />
                </linearGradient>
                
                <linearGradient id="sparkleStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
                
                <radialGradient id="brilliantPoint" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#dbeafe" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Button text with gold shadow */}
          <span className="text-white font-bold relative z-10" style={{
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(251, 191, 36, 0.3)'
          }}>
            {loading ? "Processing..." : "Get premium"}
          </span>
        </button>
      </div>

      <style jsx>{`
        @keyframes flow {
          0% { transform: translateX(-100%) skewX(-15deg); }
          50% { transform: translateX(0%) skewX(-15deg); }
          100% { transform: translateX(100%) skewX(-15deg); }
        }
        
        .group:hover .flow-faster {
          animation-duration: 1.5s;
        }
      `}</style>
    </div>
  );
}