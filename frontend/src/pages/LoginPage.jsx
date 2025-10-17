import React from 'react'
import { LoginForm } from "@/components/login/login-form"
import bgTools from "@/assets/bg_tools.jpg"
import ltoMidLogo from "@/assets/lto_mid_logo_white_small.png"

const LoginPage = () => {
  return (
    <div className="min-h-screen relative">
      {/* Header Bar */}
      <div className="bg-[#1e3a8a] h-16 flex items-center justify-between px-6 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/lto.svg" alt="LTO Logo" className="h-8 w-8" />
          <span className="text-white text-lg font-semibold">LTO SYSTEM</span>
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
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <LoginForm />
      </div>
      
      {/* MID Logo in bottom right */}
      <div className="absolute bottom-6 right-6 z-10">
        <img src={ltoMidLogo} alt="MID Logo" className="h-16 w-auto object-contain opacity-70" />
      </div>
    </div>
  )
}

export default LoginPage
