import React from "react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";

function FooterLayout() {
  const { theme } = useTheme();

  return (
    <footer
      className={`py-10 pt-16 sm:pt-20 text-center px-6 ${
        theme === "dark"
          ? "bg-gray-900/50 backdrop-blur-sm border-t border-gray-800 text-white/90"
          : "bg-[#FFFBF7]/80 backdrop-blur-sm border-t border-gray-200 text-[#242124]"
      }`}
    >
      <p className="text-lg sm:text-xl font-semibold">Veliora</p>
      <p className="text-sm sm:text-base mt-2">
        Your AI companion who understands you culturally and emotionally.
      </p>
      <div className="flex justify-center space-x-6 mt-6">
        <a
          href="https://www.linkedin.com/company/veliora/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <svg
            className="w-6 h-6 fill-[#0077B5] hover:scale-110 transition-transform"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.3h.05c.53-1 1.83-2.3 3.75-2.3 4 0 4.74 2.63 4.74 6.05V24h-4v-8.3c0-2-.04-4.55-2.77-4.55-2.78 0-3.2 2.17-3.2 4.4V24h-4V8z" />
          </svg>
        </a>

        <a
          href="https://youtube.com/@culture_vo?feature=shared"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
        >
          <svg
            className="w-6 h-6 fill-[#FF0000] hover:scale-110 transition-transform"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M19.615 3.184A3.006 3.006 0 0 0 17.72 2.66C15.29 2.5 12 2.5 12 2.5s-3.29 0-5.72.16a3.005 3.005 0 0 0-1.895.524 3.128 3.128 0 0 0-1.07 1.24A31.69 31.69 0 0 0 2.5 8.54v6.91a31.69 31.69 0 0 0 .815 3.626 3.128 3.128 0 0 0 1.07 1.24 3.006 3.006 0 0 0 1.895.524c2.43.16 5.72.16 5.72.16s3.29 0 5.72-.16a3.006 3.006 0 0 0 1.895-.524 3.128 3.128 0 0 0 1.07-1.24A31.69 31.69 0 0 0 21.5 15.45V8.54a31.69 31.69 0 0 0-.815-3.626 3.128 3.128 0 0 0-1.07-1.24zM10 15.5V8.5l6 3.5-6 3.5z" />
          </svg>
        </a>

        <a
          href="https://www.instagram.com/veliora_official?igsh=ZnBuenZlZTd5cDl3&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <svg
            className="w-6 h-6 fill-[#E1306C] hover:scale-110 transition-transform"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.3.1 2.2.3 2.7.5.6.2 1.1.6 1.6 1.1.5.5.9 1 1.1 1.6.2.5.4 1.4.5 2.7.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.3-.3 2.2-.5 2.7-.2.6-.6 1.1-1.1 1.6-.5.5-1 .9-1.6 1.1-.5.2-1.4.4-2.7.5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.3-.1-2.2-.3-2.7-.5-.6-.2-1.1-.6-1.6-1.1-.5-.5-.9-1-1.1-1.6-.2-.5-.4-1.4-.5-2.7C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.3.3-2.2.5-2.7.2-.6.6-1.1 1.1-1.6.5-.5 1-.9 1.6-1.1.5-.2 1.4-.4 2.7-.5C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7 .1 5.7.2 4.6.4 3.8.7 3 .9 2.3 1.3 1.6 2 .9 2.7.4 3.4.2 4.2 0 5 .2 6.1.1 7.4 0 8.7 0 9.1 0 12s0 3.3.1 4.6c.1 1.3.3 2.4.6 3.2.2.8.7 1.5 1.4 2.2.7.7 1.4 1.2 2.2 1.4.8.3 1.9.5 3.2.6C8.7 24 9.1 24 12 24s3.3 0 4.6-.1c1.3-.1 2.4-.3 3.2-.6.8-.2 1.5-.7 2.2-1.4.7-.7 1.2-1.4 1.4-2.2.3-.8.5-1.9.6-3.2.1-1.3.1-1.7.1-4.6s0-3.3-.1-4.6c-.1-1.3-.3-2.4-.6-3.2-.2-.8-.7-1.5-1.4-2.2-.7-.7-1.4-1.2-2.2-1.4-.8-.3-1.9-.5-3.2-.6C15.3 0 14.9 0 12 0z" />
            <path d="M12 5.8A6.2 6.2 0 1 0 18.2 12 6.21 6.21 0 0 0 12 5.8zm0 10.2A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.4-10.8a1.44 1.44 0 1 1-1.44-1.44A1.44 1.44 0 0 1 18.4 5.2z" />
          </svg>
        </a>

      </div>
      {/* Footer tagline */}
      <hr
        className={`w-3/4 border-t-2 mx-auto my-4 ${
          theme === "dark" ? "border-gray-700" : "border-gray-300"
        }`}
      />
      <Link
        href="/privacy-policy"
        className="underline hover:opacity-80 transition-opacity"
      >
        Privacy Policy
      </Link>{" "}
      &nbsp;&nbsp;&nbsp;&nbsp;
      <Link
        href="/terms-and-conditions"
        className="underline hover:opacity-80 transition-opacity"
      >
        Terms and Conditions
      </Link>
      <p className="text-xs sm:text-sm mt-4">
        ©2025 Veliora.AI. All rights reserved.
      </p>
    </footer>
  );
}

export default FooterLayout;
