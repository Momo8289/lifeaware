import React from 'react';

export const MicrosoftLogo = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 23 23" 
      width="16" 
      height="16" 
      {...props}
    >
      <path fill="#f1511b" d="M11.5 0h11.5v11.5h-11.5z"/>
      <path fill="#80cc28" d="M0 0h11.5v11.5h-11.5z"/>
      <path fill="#00adef" d="M0 11.5h11.5v11.5h-11.5z"/>
      <path fill="#fbbc09" d="M11.5 11.5h11.5v11.5h-11.5z"/>
    </svg>
  );
};

export default MicrosoftLogo; 