import React from "react";

interface WhatsAppShareProps {
  url: string;
  title: string;
}

export const WhatsAppShare: React.FC<WhatsAppShareProps> = ({ url, title }) => {
  const text = `🏝️ *AndamanBazaar Local Deal*\n\n*${title}*\n\nCheck details here 👇\n${url}\n\n#AndamanBazaar #PortBlair #AndamanIslands`;
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold transition-colors shadow-sm"
      aria-label="Share on WhatsApp"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="none"
      >
        <path d="M11.99 2C6.47 2 2 6.48 2 12c0 1.76.45 3.42 1.24 4.88L2 22l5.23-1.21A9.975 9.975 0 0 0 12 22c5.52 0 10-4.48 10-10S17.51 2 11.99 2zm5.78 14.36c-.25.71-1.42 1.34-1.95 1.41-.53.07-1.12.18-3.41-.77-2.75-1.13-4.52-4-4.66-4.18-.14-.19-1.11-1.48-1.11-2.82s.69-2.01.93-2.26c.24-.26.54-.31.72-.31.18 0 .36 0 .52.01.18.01.41-.07.63.46.23.55.8 1.95.87 2.1s.14.33.02.58c-.12.25-.19.4-.38.64-.19.23-.4.5-.58.68-.2.21-.4.43-.17.82.23.39 1.02 1.68 2.19 2.72 1.51 1.35 2.76 1.77 3.16 1.96.4.19.64.16.88-.11.24-.27 1.04-1.21 1.31-1.63.28-.42.56-.35.93-.21.36.14 2.3.109 2.69 1.28.4.19.65.29.75.45.1.17.1.98-.15 1.69z" />
      </svg>
      Share via WhatsApp
    </a>
  );
};
