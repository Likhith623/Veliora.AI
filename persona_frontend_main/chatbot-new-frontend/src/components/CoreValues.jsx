
import React from 'react';
import { Star, Heart, Target, Users } from 'lucide-react';

function CoreValues() {
  const values = [
    {
      title: "Technical Rigor & Innovation",
      description: "We're here to solve tough problems with clever, scalable solutions.",
      icon: Star
    },
    {
      title: "User Empathy",
      description: "Everything we build is about making the user feel seen, heard, and supported.",
      icon: Heart
    },
    {
      title: "Mission-Driven",
      description: "We're not just chasing the next shiny thing – we're here to combat loneliness and deepen human connections.",
      icon: Target
    },
    {
      title: "Collaboration & Ownership",
      description: "We're small, so everyone wears multiple hats, takes ownership, and contributes to building an inclusive, supportive culture.",
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen py-16 md:py-24 bg-gradient-to-r from-orange-200 to-pink-200 text-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto mb-16 md:mb-24">
          <h1 className="text-3xl md:text-5xl lg:text-5xl font-bold leading-tight mb-6">
            Our Values
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-[#475467]">
            We're building an AI that's meant to enhance human connection, so our values are all about balance:
          </p>
        </div>

        {/* Values Grid for Mobile */}
        <div className="md:hidden space-y-8">
          {values.map((value, index) => (
            <div key={index} className="bg-white/20 backdrop-blur-sm rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="bg-white/40 rounded-full p-2">
                  <value.icon className="w-6 h-6 text-gray-800" />
                </div>
                <h3 className="text-xl font-semibold">{value.title}</h3>
              </div>
              <p className="text-[#475467] pl-12">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Timeline Section for Tablet and Desktop */}
        <div className="hidden md:grid md:grid-cols-[300px,1fr] lg:grid-cols-[400px,1fr] gap-12 lg:gap-16">
          <div className="space-y-20">
            {values.map((value, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="bg-white/40 rounded-full p-2">
                  <value.icon className="w-5 h-5 text-gray-800" />
                </div>
                <div className="text-gray-800 text-xl font-semibold">{value.title}</div>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="absolute left-0 w-px h-full bg-gray-700/50" />
            
            <div className="space-y-20 text-xl">
              {values.map((value, index) => (
                <TimelineItem key={index}>
                  {value.description}
                </TimelineItem>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ children }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-[-4px] top-2 w-2 h-2 bg-gray-700 rounded-full" />
      <p className="text-gray-700 text-base md:text-xl lg:text-xl">{children}</p>
    </div>
  );
}

export default CoreValues;