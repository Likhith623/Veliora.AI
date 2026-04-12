"use client";
import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

const NavLink = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  const { theme } = useTheme();

  console.log("NavLink theme:", theme); // Debug log

  return (
    <Link
      href={href}
      className={`text-base font-bold sm:text-lg ${
        theme === "dark"
          ? isActive
            ? "text-red-400"
            : "text-gray-300"
          : isActive
          ? "text-[#1D2939]"
          : "text-black/50"
      }`}
    >
      {children}
    </Link>
  );
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme } = useTheme();

  console.log("Header theme:", theme); // Debug log

  const handleScroll = () => {
    const currentScrollPos = window.scrollY;
    setIsScrolled(currentScrollPos > 0);
    setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
    setPrevScrollPos(currentScrollPos);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [prevScrollPos, visible]);

  return (
    <div
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      } ${
        isScrolled
          ? theme === "dark"
            ? "bg-gray-900/80 backdrop-blur-md shadow-md"
            : "bg-gradient-to-r from-orange-200 to-pink-200 shadow-md"
          : "bg-transparent"
      }`}
    >
      <div className="flex justify-between max-w-5xl mx-auto px-6 sm:px-10 py-4">
        {/* Center - Logo */}
        <div>
          <Link
            href="/"
            className={`text-xl md:text-2xl font-bold ${
              theme === "dark" ? "text-gray-300" : "text-black/50"
            }`}
          >
            CultureVo
          </Link>
        </div>

        {/* Right Side - Navigation Links */}
        <div className="text-xl hidden sm:flex justify-end gap-8">
          <NavLink href="/join-us">Join Us</NavLink>
          <NavLink href="/about">About</NavLink>
          <NavLink href='#'>Blogs</NavLink>
          <NavLink
            href="https://discord.com/invite/mNmwYdmsPz"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </NavLink>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="sm:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <X
              className={`w-6 h-6 ${
                theme === "dark" ? "text-gray-300" : "text-black/50"
              }`}
            />
          ) : (
            <Menu
              className={`w-6 h-6 ${
                theme === "dark" ? "text-gray-300" : "text-black/50"
              }`}
            />
          )}
        </button>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div
            className={`sm:hidden absolute top-full left-0 right-0 mt-2 border ${
              theme === "dark"
                ? "border-gray-700/50 bg-gray-900/80"
                : "border-white/10 bg-white/30"
            } backdrop-blur-2xl z-10 rounded-2xl shadow-lg p-4 mx-6`}
          >
            <div className="flex flex-col gap-4">
              <NavLink href="/join-us">Join Us</NavLink>
              <NavLink href="/about">About</NavLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
