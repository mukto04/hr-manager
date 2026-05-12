"use client";

import React from "react";
import { 
  ShieldAlert, 
  Building2, 
  Users, 
  ArrowRight, 
  Trophy,
  Activity,
  Zap,
  Lock
} from "lucide-react";
import Link from "next/link";

export function AccessHub() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-red-500/30 font-sans overflow-hidden py-12 px-4 relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
            <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">NextGen SaaS Infrastructure</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white">
            Unified <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500">Access Portal</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Select your destination entry-point. Each panel is secured with enterprise-grade encryption and isolated tenant environments.
          </p>
        </div>

        {/* Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Super Admin */}
          <Link href="/super-admin/tenants" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-rose-600 rounded-3xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 group-hover:translate-y-[-8px]">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform duration-500">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    Super Admin <Lock className="w-4 h-4 text-red-500/50" />
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    SaaS Master Controller. Manage tenants, database connections, and system-wide configurations.
                  </p>
                </div>
              </div>
              <div className="mt-10 flex items-center justify-between">
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Root Access Only</span>
                <div className="bg-red-600 p-2 rounded-xl group-hover:rotate-[-45deg] transition-all duration-500">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </Link>

          {/* Card 2: Business/HR Admin */}
          <Link href="/" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 group-hover:translate-y-[-8px]">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Business Center</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Corporate HR Portal. Manage employees, attendance, payroll, and company-specific modules.
                  </p>
                </div>
              </div>
              <div className="mt-10 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Company Login</span>
                <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-[-45deg] transition-all duration-500">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </Link>

          {/* Card 3: Employee Self Service */}
          <Link href="/employee-login" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl blur opacity-20 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 group-hover:translate-y-[-8px]">
              <div className="space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">Self-Service</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Employee Experience Portal. Access payslips, attendance reports, and leave applications.
                  </p>
                </div>
              </div>
              <div className="mt-10 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Employee Portal</span>
                <div className="bg-emerald-600 p-2 rounded-xl group-hover:rotate-[-45deg] transition-all duration-500">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </Link>

        </div>

        {/* Footer Stats / Trust Bar */}
        <div className="mt-20 pt-12 border-t border-white/5 flex flex-wrap justify-center gap-12 md:gap-24 opacity-60">
            <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-bold tracking-widest uppercase">Multi-Tenant Architecture</span>
            </div>
            <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold tracking-widest uppercase">99.9% Uptime SLA</span>
            </div>
            <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-bold tracking-widest uppercase">AES-256 Encryption</span>
            </div>
        </div>

        {/* Support Note */}
        <div className="text-center mt-16 pb-8">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.2em] leading-loose">
              System Environment: <span className="text-white">v1.0.4-production</span> <br/>
              Developed by <span className="text-red-500 font-bold">AppDevs</span>
            </p>
        </div>
      </div>
    </div>
  );
}
