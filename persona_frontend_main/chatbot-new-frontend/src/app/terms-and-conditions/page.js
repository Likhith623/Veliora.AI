import React from 'react'
import TermsAndConditions from '@/components/TermsAndConditions'
import Head from "next/head";

const terms_and_conditions = () => {
  return (
    <>
      <Head>
        <title>Culturevo | Terms & Conditions – Using NOVI</title>
        <meta
          name="description"
          content="Review the terms for using our AI therapy alternative and AI roleplay companion. Whether you're looking for an AI boyfriend simulator, AI girlfriend experience Gen Z, or an AI that sends voice notes, we’ve got you covered."
        />
        <meta
          name="keywords"
          content="AI therapy alternative, AI roleplay companion, AI boyfriend simulator, AI girlfriend experience Gen Z, AI that sends voice notes, Customize your AI’s personality"
        />
        <meta
          property="og:title"
          content="Terms & Conditions – Using NOVI | Culturevo"
        />
        <meta
          property="og:description"
          content="Understand how we provide emotional support, roleplay, and personality customization with NOVI while maintaining user safety and transparency."
        />
        <meta
          property="og:url"
          content="http://localhost:3000/terms-and-conditions"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div
        suppressHydrationWarning
        className="font-[family-name:var(--font-garamond)] relative bg-gray-100 w-full h-full overflow-scroll"
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-0 lg:left-1/4 w-[300px] lg:w-[600px] h-[600px] bg-pink-200 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute bottom-[20px] right-[20px] w-[600px] h-[600px] bg-pink-300 rounded-full blur-[120px] opacity-50"></div>
          <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-orange-300 rounded-full blur-[100px] opacity-60"></div>
          <div className="absolute top-[30px] left-[20px] w-[300px] lg:w-[450px] h-[450px] bg-red-300 rounded-full blur-[140px] opacity-50"></div>
        </div>
        <div className="z-10 p-4 lg:p-10 flex flex-col justify-center items-center">
          <TermsAndConditions />
        </div>
      </div>
    </>
  );
}

export default terms_and_conditions