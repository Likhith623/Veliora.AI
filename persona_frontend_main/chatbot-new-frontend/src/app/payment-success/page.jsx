"use client";
import { useEffect } from "react";
import { useUser } from "@/support/UserContext";
import Head from "next/head";

export default function PaymentSuccess() {
  const { refreshUserDetails } = useUser(); // Make sure this exists

  useEffect(() => {
    refreshUserDetails && refreshUserDetails();
  }, []);

  return (
    <>
      <Head>
        <title>Culturevo | Payment Success – Unlock NOVI</title>
        <meta
          name="description"
          content="Payment successful! Unlock full access to your AI girlfriend/boyfriend app and explore the AI relationship simulator. Enjoy our AI companion with memory and an AI with emotional intelligence, now with voice-enabled AI companion features."
        />
        <meta
          name="keywords"
          content="AI girlfriend/boyfriend app, AI relationship simulator, AI companion with memory, AI with emotional intelligence, Voice-enabled AI companion, AI with personality traits"
        />
        <meta
          property="og:title"
          content="Payment Success – Unlock NOVI | Culturevo"
        />
        <meta
          property="og:description"
          content="Congratulations! You now have complete access to NOVI’s full suite—memory, emotional intelligence, and voice personality customization."
        />
        <meta
          property="og:url"
          content="http://localhost:3000/payment-success"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50">
        <h1 className="text-3xl font-bold text-green-700 mb-4">
          Payment Successful!
        </h1>
        <p className="text-lg text-green-800 mb-2">
          Thank you for upgrading to Premium.
        </p>
        <p className="text-green-700">
          You now have access to all premium features.
        </p>
      </div>
    </>
  );
}
