// sign page.jsx
"use client";
import { useEffect, Suspense } from "react";
import SignupFormDemo from "@/components/signup-form-demo";
import React from "react";
import { useUser } from "@/support/UserContext";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import Head from "next/head";
const SignPage = () => {
  const { userDetails } = useUser();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  return (
    <>
      <Head>
        <title>Veliora | Sign Up – Meet VELIORA Your AI Friend</title>
        <meta
          name="description"
          content="Sign up for a customizable AI chatbot experience and build a personal AI assistant. Our platform is an AI friend for seniors, AI friends for kids, and even an AI friend for gamers — made for everyone."
        />
        <meta
          name="keywords"
          content="Sign up, Customizable AI chatbot, Personal AI assistant, AI friend for seniors, AI friends for kids, AI friend for gamers"
        />
        <meta
          property="og:title"
          content="Sign Up – Meet VELIORA Your AI Friend | Veliora"
        />
        <meta
          property="og:description"
          content="Register to start your personalized journey with VELIORA—versatile companionship for every age."
        />
        <meta property="og:url" content="http://localhost:3000/signup" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        className={`relative w-full h-screen ${
          isDarkMode ? "bg-gray-900" : "bg-gray-100"
        } overflow-hidden transition-colors duration-200`}
      >
        <div className="fixed inset-0 z-0">
          <div
            className={`absolute w-[700px] h-[700px] ${
              isDarkMode ? "bg-pink-900/30" : "bg-pink-300"
            } rounded-full blur-[150px] top-10 left-1/4 opacity-50`}
          ></div>
          <div
            className={`absolute w-[500px] h-[500px] ${
              isDarkMode ? "bg-orange-900/30" : "bg-orange-300"
            } rounded-full blur-[150px] bottom-10 left-1/4 opacity-50`}
          ></div>
          <div
            className={`absolute w-[500px] h-[500px] ${
              isDarkMode ? "bg-pink-900/30" : "bg-pink-300"
            } rounded-full blur-[150px] top-10 right-1/4 opacity-50`}
          ></div>
          <div
            className={`absolute w-[500px] h-[500px] ${
              isDarkMode ? "bg-orange-900/30" : "bg-orange-300"
            } rounded-full blur-[150px] bottom-10 right-1/4 opacity-50`}
          ></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <Suspense>
            <FilteredComponent />
          </Suspense>
        </div>
        <style jsx global>{`
          .theme-toggle {
            z-index: 50 !important;
          }
        `}</style>
      </div>
    </>
  );
};

const FilteredComponent = ({ children }) => {
  const { userDetails } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");

  useEffect(() => {
    const storedUserDetails = localStorage.getItem("userDetails");
    if (storedUserDetails) {
      const { name, gender } = JSON.parse(storedUserDetails);
      if (name && gender) {
        // Redirect based on the filter parameter
        if (filter) {
          router.push(`/details?filter=${filter}`);
        } else {
          router.push("/chat-history");
        }
      }
    }
  }, [router, filter]);

  return <SignupFormDemo filter={filter} />;
};

export default SignPage;
