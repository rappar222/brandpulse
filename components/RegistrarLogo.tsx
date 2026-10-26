"use client";

import React from "react";

interface RegistrarLogoProps {
  id: string;
  className?: string;
}

export function RegistrarLogo({ id, className = "w-6 h-6" }: RegistrarLogoProps) {
  switch (id) {
    case "cloudflare":
      return (
        <svg
          role="img"
          viewBox="48 5 52 18"
          className={className}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Official Cloudflare Two-Tone Cloud */}
          <path
            fill="#F48120"
            d="M84.2,20.4a2.85546,2.85546,0,0,0-.3-2.6,3.09428,3.09428,0,0,0-2.1-1.1l-17.4-.2c-.1,0-.2-.1-.3-.1a.1875.1875,0,0,1,0-.3c.1-.2.2-.3.4-.3L82,15.6a6.29223,6.29223,0,0,0,5.1-3.8l1-2.6c0-.1.1-.2,0-.3A11.39646,11.39646,0,0,0,66.2,7.7a5.45941,5.45941,0,0,0-3.6-1A5.20936,5.20936,0,0,0,58,11.3a5.46262,5.46262,0,0,0,.1,1.8A7.30177,7.30177,0,0,0,51,20.4a4.102,4.102,0,0,0,.1,1.1.3193.3193,0,0,0,.3.3H83.5c.2,0,.4-.1.4-.3Z"
          />
          <path
            fill="#FAAD3F"
            d="M89.7,9.2h-.5c-.1,0-.2.1-.3.2l-.7,2.4a2.85546,2.85546,0,0,0,.3,2.6,3.09428,3.09428,0,0,0,2.1,1.1l3.7.2c.1,0,.2.1.3.1a.1875.1875,0,0,1,0,.3c-.1.2-.2.3-.4.3l-3.8.2a6.29223,6.29223,0,0,0-5.1,3.8l-.2.9c-.1.1,0,.3.2.3H98.5a.26517.26517,0,0,0,.3-.3,10.87184,10.87184,0,0,0,.4-2.6,9.56045,9.56045,0,0,0-9.5-9.5"
          />
        </svg>
      );

    case "porkbun":
      return (
        <svg
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Porkbun friendly pig face */}
          <circle cx="50" cy="50" r="46" fill="#F472B6" />
          {/* Ears */}
          <path d="M26 22 C18 6 36 8 38 24 Z" fill="#E11D48" />
          <path d="M74 22 C82 6 64 8 62 24 Z" fill="#E11D48" />
          {/* Eyes */}
          <circle cx="37" cy="42" r="4.5" fill="#1E1B4B" />
          <circle cx="63" cy="42" r="4.5" fill="#1E1B4B" />
          {/* Snout */}
          <ellipse cx="50" cy="62" rx="18" ry="12" fill="#FBCFE8" />
          <ellipse cx="43" cy="62" rx="3.5" ry="5" fill="#BE185D" />
          <ellipse cx="57" cy="62" rx="3.5" ry="5" fill="#BE185D" />
        </svg>
      );

    case "namecheap":
      return (
        <svg
          role="img"
          viewBox="0 0 24 24"
          className={className}
          fill="#DE3723"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.295 17.484c.227.403.57.728.985.931-.309.15-.647.229-.99.232h-3.068a2.26 2.26 0 0 1-1.957-1.143L6.705 6.511a2.27 2.27 0 0 0-.974-.922c.309-.153.652-.233.997-.232h3.05c.81.003 1.558.438 1.959 1.143l5.558 10.984zm-9.329-7.392L6.269 6.755c-.209-.392-.582-.657-.984-.829-.204.165-.391.35-.522.581-.184.349-4.391 8.648-4.569 8.987a2.245 2.245 0 0 0 4.016 1.999l3.756-7.401zm15.846-1.593a2.245 2.245 0 0 0-1.162-2.955v-.001a2.243 2.243 0 0 0-.892-.187l-.003-.011c-.816 0-1.569.443-1.965 1.157l-3.749 7.414 1.689 3.323c.213.399.59.664.998.839.252-.2.473-.444.605-.742l4.479-8.837z" />
        </svg>
      );

    case "namesilo":
      return (
        <svg
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* NameSilo Official Shield */}
          <path
            d="M50 10 L82 24 V52 C82 72 68 86 50 92 C32 86 18 72 18 52 V24 L50 10 Z"
            fill="#0284C7"
          />
          <path
            d="M50 18 L76 29 V51 C76 68 64 80 50 85 C36 80 24 68 24 51 V29 L50 18 Z"
            fill="#0369A1"
          />
          {/* Lock / Crest Emblem */}
          <rect x="38" y="46" width="24" height="20" rx="4" fill="#FFFFFF" />
          <path
            d="M43 46 V38 C43 34 46 31 50 31 C54 31 57 34 57 38 V46"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );

    case "dynadot":
      return (
        <svg
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dynadot Faceted Diamond */}
          <polygon points="50,14 84,50 50,86 16,50" fill="#00AEEF" />
          <polygon points="50,14 84,50 50,50" fill="#38BDF8" />
          <polygon points="16,50 50,50 50,86" fill="#0284C7" />
          <polygon points="50,50 84,50 50,86" fill="#0369A1" />
          <polygon points="16,50 50,14 50,50" fill="#BAE6FD" />
        </svg>
      );

    case "godaddy":
      return (
        <svg
          role="img"
          viewBox="0 0 24 24"
          className={className}
          fill="#00A699"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M20.702 2.29c-2.494-1.554-5.778-1.187-8.706.654C9.076 1.104 5.79.736 3.3 2.29c-3.941 2.463-4.42 8.806-1.07 14.167 2.47 3.954 6.333 6.269 9.77 6.226 3.439.043 7.301-2.273 9.771-6.226 3.347-5.361 2.872-11.704-1.069-14.167zM4.042 15.328a12.838 12.838 0 01-1.546-3.541 10.12 10.12 0 01-.336-3.338c.15-1.98.956-3.524 2.27-4.345 1.315-.822 3.052-.87 4.903-.137.281.113.556.24.825.382A15.11 15.11 0 007.5 7.54c-2.035 3.255-2.655 6.878-1.945 9.765a13.247 13.247 0 01-1.514-1.98zm17.465-3.541a12.866 12.866 0 01-1.547 3.54 13.25 13.25 0 01-1.513 1.984c.635-2.589.203-5.76-1.353-8.734a.39.39 0 00-.563-.153l-4.852 3.032a.397.397 0 00-.126.546l.712 1.139a.395.395 0 00.547.126l3.145-1.965c.101.306.203.606.28.916.296 1.086.41 2.214.335 3.337-.15 1.982-.956 3.525-2.27 4.347a4.437 4.437 0 01-2.25.65h-.101a4.432 4.432 0 01-2.25-.65c-1.314-.822-2.121-2.365-2.27-4.347-.074-1.123.039-2.251.335-3.337a13.212 13.212 0 014.05-6.482 10.148 10.148 0 012.849-1.765c1.845-.733 3.586-.685 4.9.137 1.316.822 2.122 2.365 2.271 4.345a10.146 10.146 0 01-.33 3.334z" />
        </svg>
      );

    case "hostico":
      return (
        <svg
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hostico Romanian Accredited Host Shield */}
          <path
            d="M50 8 L84 22 V54 C84 74 68 88 50 94 C32 88 16 74 16 54 V22 L50 8 Z"
            fill="#1E3A8A"
          />
          {/* Romanian Tricolor stripe bar inside */}
          <path d="M30 42 H42 V62 H30 Z" fill="#002B7F" />
          <path d="M44 42 H56 V62 H44 Z" fill="#FCD116" />
          <path d="M58 42 H70 V62 H58 Z" fill="#CE1126" />
          <path
            d="M50 20 L74 31 V52 C74 66 62 77 50 82 C38 77 26 66 26 52 V31 L50 20 Z"
            stroke="#60A5FA"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      );

    case "rotld":
      return (
        <svg
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* ROTLD Official National Registry of Romania */}
          <circle cx="50" cy="50" r="44" fill="#0F172A" />
          {/* Dome & Columns */}
          <path d="M24 70 H76 V76 H24 Z" fill="#F59E0B" />
          <path d="M28 64 H72 V68 H28 Z" fill="#E2E8F0" />
          {/* Columns */}
          <rect x="32" y="44" width="6" height="20" rx="1" fill="#F8FAFC" />
          <rect x="42" y="44" width="6" height="20" rx="1" fill="#F8FAFC" />
          <rect x="52" y="44" width="6" height="20" rx="1" fill="#F8FAFC" />
          <rect x="62" y="44" width="6" height="20" rx="1" fill="#F8FAFC" />
          {/* Pediment / Dome */}
          <path d="M26 42 L50 24 L74 42 Z" fill="#F59E0B" />
        </svg>
      );

    case "ovhcloud":
      return (
        <svg
          viewBox="0 0 100 100"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* OVHcloud Monogram */}
          <circle cx="50" cy="50" r="44" fill="#0050D7" />
          <path
            d="M32 38 L50 68 L68 38 Z"
            fill="#FFFFFF"
          />
          <circle cx="50" cy="38" r="8" fill="#F8FAFC" />
        </svg>
      );

    default:
      return (
        <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
          {id.slice(0, 2).toUpperCase()}
        </div>
      );
  }
}
