import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform active:scale-95`}
    >
      {/* Stylized Hexagonal Frame */}
      <path
        d="M50 10L85 30V70L50 90L15 70V30L50 10Z"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      {/* Compass / Arrow Interior */}
      <path d="M50 35L65 55H35L50 35Z" fill="#e11d48" />
      <path d="M50 75L35 55H65L50 75Z" fill="#0284c7" />
      {/* Center Detail */}
      <circle cx="50" cy="55" r="4" fill="white" />
    </svg>
  );
};
