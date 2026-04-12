import Head from "next/head";
export default function PaymentCancel() {
  return (
    <>
      <Head>
        <title>Culturevo | Payment Canceled – NOVI Still Here</title>
        <meta
          name="description"
          content="Your payment has been canceled, but your AI chatbot companion is still waiting. Return to your digital companion and virtual AI friend. We provide the best AI companion for loneliness and a personal AI assistant who remembers you."
        />
        <meta
          name="keywords"
          content="AI chatbot companion, Digital companion, Virtual AI friend, Best AI companion for loneliness, Personal AI assistant, AI that remembers me"
        />
        <meta
          property="og:title"
          content="Payment Canceled – NOVI Still Here | Culturevo"
        />
        <meta
          property="og:description"
          content="Even if payment failed, your NOVI companion remains—ready to reconnect and support you whenever you're ready."
        />
        <meta
          property="og:url"
          content="http://localhost:3000/payment-cancel"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
        <h1 className="text-3xl font-bold text-red-700 mb-4">
          Payment Cancelled
        </h1>
        <p className="text-lg text-red-800 mb-2">
          Your payment was not completed.
        </p>
        <p className="text-red-700">
          You can try again anytime from the sidebar.
        </p>
      </div>
    </>
  );
}