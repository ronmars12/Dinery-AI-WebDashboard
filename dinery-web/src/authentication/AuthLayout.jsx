import React from "react";

export default function AuthLayout({ children, imageUrl, title }) {
  return (
    <div className="min-h-screen flex font-montserrat">
      {/* Left side with background image, hidden on small screens */}
      <div
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      ></div>

      {/* Right side with form */}
      <div className="flex flex-col justify-center items-center md:w-1/2 px-8 sm:px-16">
        <h2 className="text-3xl font-semibold mb-8 text-gray-800">{title}</h2>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
