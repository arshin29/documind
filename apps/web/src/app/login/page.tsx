'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { DocuMindLogo } from '@/components/layout/Sidebar';
import { loginApi, checkSessionApi } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/';
  const customMessage = searchParams.get('message');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  // If already authenticated, redirect to destination
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: ensure verification state always resolves within 4 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsVerifying(false);
      }
    }, 4000);

    checkSessionApi()
      .then((session) => {
        if (isMounted) {
          clearTimeout(safetyTimer);
          if (session?.user) {
            router.replace(redirectUrl);
          } else {
            setIsVerifying(false);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setIsVerifying(false);
          if (
            err?.isApiConnectionError ||
            err?.name === 'ApiConnectionError' ||
            err?.message?.includes('unreachable') ||
            err?.message?.includes('Failed to fetch')
          ) {
            setErrorMessage(
              'Notice: DocuMind API service is currently unreachable (http://localhost:4000). Please check that the server is running.',
            );
          }
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [redirectUrl, router]);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please provide a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginApi({
        email: email.trim().toLowerCase(),
        password,
      });
      // Redirect to dashboard or intended page
      router.replace(redirectUrl);
    } catch (err) {
      setErrorMessage(
        (err as Error).message || 'Invalid email or password. Please try again.',
      );
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <DocuMindLogo className="w-10 h-10 text-[#7185E8] animate-pulse" />
        <p className="text-xs text-[#858A99] font-medium mt-3">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl border border-[#E9EAF0] shadow-card p-6 sm:p-8 animate-in fade-in duration-200">
      {/* Brand Logo & Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-3">
          <DocuMindLogo className="w-7 h-7 text-[#7185E8]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#242633] tracking-tight">
          Welcome back
        </h1>
        <p className="text-xs sm:text-sm text-[#858A99] mt-1">
          Sign in to your DocuMind workspace to continue
        </p>
      </div>

      {/* Explanatory Notice if redirected because of unauthenticated action */}
      {customMessage && (
        <div className="mb-5 p-3 rounded-xl bg-[#EEF0FF] border border-[#DCE2FC] flex items-start gap-2.5 text-xs text-[#4F63D3] animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-[#7185E8] shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{customMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Sign In Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-[#242633] mb-1.5">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#858A99]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="name@company.com"
              disabled={isLoading}
              className={`w-full h-10 pl-10 pr-3.5 rounded-xl bg-white border text-xs text-[#242633] placeholder:text-[#A2A7B5] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                errors.email ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[#242633]">
              Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#858A99]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full h-10 pl-10 pr-10 rounded-xl bg-white border text-xs text-[#242633] placeholder:text-[#A2A7B5] focus:outline-none focus:border-[#7185E8] focus:ring-2 focus:ring-[#7185E8]/10 transition-all ${
                errors.password ? 'border-red-400 bg-red-50/20' : 'border-[#E9EAF0]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#858A99] hover:text-[#242633] cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 mt-2 rounded-xl bg-[#7185E8] hover:bg-[#5F73DD] text-xs font-semibold text-white shadow-subtle shadow-[#7185E8]/20 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Register link */}
      <div className="mt-6 pt-5 border-t border-[#E9EAF0] text-center">
        <p className="text-xs text-[#858A99]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-[#7185E8] hover:text-[#5F73DD] hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center p-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <DocuMindLogo className="w-10 h-10 text-[#7185E8] animate-pulse" />
            <p className="text-xs text-[#858A99] font-medium mt-3">Loading DocuMind...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

