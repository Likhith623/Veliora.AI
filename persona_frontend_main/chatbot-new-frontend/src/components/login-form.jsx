"use client";
import React from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import {
  IconBrandGoogle,
  IconBrandDiscord,
} from "@tabler/icons-react";
import { Input } from "./ui/input";
import Link from 'next/link';
import {supabase} from "../../supabaseClient";
import { useRouter } from "next/navigation";


export default function LoginFormDemo() {
  
const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
  
    try {
      let response;
      response = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      router.push('/user-details');
    } catch (error) {
      // Check if the user exists and what provider they used
      const { data: existingUser } = await supabase
        .from("user_details")
        .select("auth_provider")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.auth_provider === "discord") {
          alert("Please log in with Discord.");
        } else if (existingUser.auth_provider === "google") {
          alert("Please log in with Google.");
        } else {
          alert(error.message);
        }
      } else {
        alert(error.message);
      }
    }
  };

const googleAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/user-details`, // Redirect after login
      },
    });


  const discordAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/user-details`,
      },
    });
  };

  return (
    (<div
      className="max-w-md w-full mx-auto p-4 md:p-8 bg-white dark:bg-black dark:bg-opacity-60">
      <p className="text-center text-xl mb-8">
       Welcome back to Novi
      </p>
      <form className="my-8 border-none" onSubmit={handleSubmit}>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" placeholder="projectmayhem@fc.com" type="email" required={true}/>
        </LabelInputContainer>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Password</Label>
          <Input id="password" placeholder="••••••••" type="password" required={true}/>
        </LabelInputContainer>
       
          <button
            className="bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset]"
            type="submit">
            Log In &rarr;
            <BottomGradient />
          </button> 
      

      </form>
        <div
          className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />

        <div className="flex flex-col space-y-4">
          <button
            className=" relative group/btn flex space-x-2 items-center justify-start px-4 w-full text-black rounded-md h-10 font-medium shadow-input bg-gray-50 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_var(--neutral-800)]"
            type="submit" onClick={googleAuth}>
            <IconBrandGoogle className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-neutral-700 dark:text-neutral-300 text-sm">
              Google
            </span>
            <BottomGradient />
          </button>
          <button
            className=" relative group/btn flex space-x-2 items-center justify-start px-4 w-full text-black rounded-md h-10 font-medium shadow-input bg-gray-50 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_var(--neutral-800)]"
            type="submit" onClick={discordAuth}>
            <IconBrandDiscord className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-neutral-700 dark:text-neutral-300 text-sm">
              Discord
            </span>
            <BottomGradient />
          </button>
        </div>
      <span>Create an account ? <Link href="/signup">SignUp</Link></span>
    </div>)
  );
}
}

const BottomGradient = () => {
  return (<>
    <span
      className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
    <span
      className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
  </>);
};

const LabelInputContainer = ({
  children,
  className
}) => {
  return (
    (<div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>)
  );
};
