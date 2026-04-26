"use client";
import UserDetails from '@/components/user-details';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Head from "next/head";

const UserDetailsPage = () => {
  return (
    <>
      <Head>
        <title>Veliora | Profile – Your VELIORA Settings</title>
        <meta
          name="description"
          content="Manage user details for your AI companion experience. Whether you're using a digital companion, a virtual AI friend, or an AI chatbot companion, this page keeps your AI friend info up to date."
        />
        <meta
          name="keywords"
          content="Manage user details, Digital companion, Virtual AI friend, AI chatbot companion, Personal AI assistant, AI companion with memory"
        />
        <meta
          property="og:title"
          content="Profile – Your VELIORA Settings | Veliora"
        />
        <meta
          property="og:description"
          content="Update your personal settings and preferences to shape how VELIORA responds and remembers you."
        />
        <meta
          property="og:url"
          content="http://localhost:3000/user-details"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="relative w-full h-screen bg-gray-100 overflow-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute w-[500px] h-[500px] bg-pink-400 rounded-full blur-[150px] top-10 left-20 opacity-50"></div>
          <div className="absolute w-[500px] h-[500px] bg-orange-300 rounded-full blur-[150px] bottom-10 left-20 opacity-50"></div>

          <div className="absolute w-[500px] h-[500px] bg-pink-400 rounded-full blur-[150px] top-10 right-20 opacity-50"></div>
          <div className="absolute w-[500px] h-[500px] bg-orange-300 rounded-full blur-[150px] bottom-10 right-20 opacity-50"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <Suspense>
            <SearchParamsHandler>
              <UserDetails />
            </SearchParamsHandler>
          </Suspense>
        </div>
      </div>
    </>
  );
};

const SearchParamsHandler = ({ children }) => {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');

  // Pass the filter as a prop to the UserDetails component
  return <>{React.cloneElement(children, { filter: filter })}</>;
};

export default UserDetailsPage;