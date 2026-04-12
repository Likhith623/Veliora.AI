"use client";
import React from "react";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import {
    IconDeviceGamepad2,
    IconCamera,
    IconChefHatFilled,
    IconBook,
    IconMusic,
    IconLuggage
} from "@tabler/icons-react";
import { Input } from "./ui/input";
import Link from 'next/link'
import { RainbowButton } from "./ui/rainbow-button";


export default function DetailsForm() {
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Form submitted");
    };
    return (
        (<div
            className="max-w-md w-full mx-auto p-4 md:p-8 bg-white dark:bg-black dark:bg-opacity-60">
            <p className="text-center text-xl mb-8">
                Enter your details and Interests
            </p>
            <form className="my-8 border-none" onSubmit={handleSubmit}>
                <LabelInputContainer className="mb-4">
                    <Label htmlFor="email">Date of Birth</Label>
                    <Input id="email" placeholder="projectmayhem@fc.com" type="date" />
                </LabelInputContainer>
                <LabelInputContainer className="mb-4">
                    <Label htmlFor="password">Your Interests</Label>
                    <div className="flex flex-row gap-2 max-w-full">
                        <div>
                            <div className="bg-neutral-800 w-fit px-5 py-2 rounded-full flex items-center gap-2">
                                <IconDeviceGamepad2 className="w-5 h-5" />
                                <p className="text-sm">Gaming</p>
                            </div>
                        </div>
                        <div>
                            <div className="bg-neutral-800 w-fit px-5 py-2 rounded-full flex items-center gap-2">
                                <IconLuggage className="w-5 h-5" />
                                <p className="text-sm">Traveling</p>
                            </div>
                        </div>
                        <div>
                            <div className="bg-neutral-800 w-fit px-5 py-2 rounded-full flex items-center gap-2">
                                <IconCamera className="w-5 h-5" />
                                <p className="text-sm">Photography</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-row gap-2 max-w-full">
                        <div>
                            <div className="bg-neutral-800 w-fit px-5 py-2 rounded-full flex items-center gap-2">
                                <IconChefHatFilled className="w-5 h-5" />
                                <p className="text-sm">Cooking</p>
                            </div>
                        </div>
                        <div>
                            <div className="bg-neutral-800 w-fit px-5 py-2 rounded-full flex items-center gap-2">
                                <IconBook className="w-5 h-5" />
                                <p className="text-sm">Reading</p>
                            </div>
                        </div>
                        <div>
                            <div className="bg-neutral-800 w-fit px-5 py-2 rounded-full flex items-center gap-2">
                                <IconMusic className="w-5 h-5" />
                                <p className="text-sm">Music</p>
                            </div>
                        </div>
                    </div>
                </LabelInputContainer>


                <Link href="/chat">
                    <RainbowButton className="w-full mt-5">
                        Get Started
                    </RainbowButton>
                </Link>

            </form>
        </div>)
    );
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
