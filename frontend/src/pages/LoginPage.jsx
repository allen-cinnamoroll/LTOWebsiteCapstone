import React from 'react'
import { LoginForm } from "@/components/login/login-form"
import bgTools from "@/assets/bg_tools.jpg"
import ltoMidLogo from "@/assets/lto_mid_logo_white_small.png"

const LoginPage = () => {
  return (
    <div className="min-h-screen relative">
      {/* Header Bar */}
      <div className="bg-[#1e3a8a] h-14 md:h-16 flex items-center justify-between px-4 md:px-6 relative z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <img src="/lto.svg" alt="LTO Logo" className="h-6 w-6 md:h-8 md:w-8" />
          <span className="text-white text-base md:text-lg font-semibold">LTO SYSTEM</span>
        </div>
      </div>
      
      {/* Background with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgTools})` }}
      >
        <div className="absolute inset-0 bg-[#1e3a8a]/30"></div>
      </div>
      
      {/* Login Form Container */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] p-4 md:p-6">
        <LoginForm />
      </div>
      
      {/* MID Logo in bottom right */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10">
        <img src={ltoMidLogo} alt="MID Logo" className="h-12 w-auto md:h-16 object-contain opacity-70" />
      </div>
    </div>
  )
}

export default LoginPage
