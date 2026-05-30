import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/5", className)}
      {...props}
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="h-screen w-full snap-start relative flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent opacity-60" />
      
      {/* Sidebar Skeletons */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>

      {/* Content Info Skeletons */}
      <div className="absolute left-4 bottom-20 right-20 z-10 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-24 h-6 rounded-lg" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="w-full h-4 rounded-lg" />
        <Skeleton className="w-3/4 h-4 rounded-lg" />
        <Skeleton className="w-20 h-4 rounded-lg" />
        <Skeleton className="w-32 h-6 rounded-full" />
      </div>

      {/* Main Content Stage Skeleton */}
      <div className="w-full max-w-[85%] aspect-[9/16] bg-white/5 rounded-3xl border border-white/5 flex items-center justify-center overflow-hidden">
        <div className="space-y-4 w-full px-12">
          <Skeleton className="w-20 h-1 mx-auto rounded-full" />
          <Skeleton className="w-48 h-10 mx-auto rounded-xl" />
          <Skeleton className="w-32 h-3 mx-auto rounded-full opacity-30" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="p-4 pt-10 pb-24 h-full space-y-8">
      <div className="flex flex-col items-center mb-10">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="w-48 h-8 rounded-lg mt-4" />
        <Skeleton className="w-32 h-4 rounded-md mt-2" />
        
        <div className="flex gap-8 mt-6">
          <div className="space-y-1 flex flex-col items-center">
            <Skeleton className="w-10 h-6" />
            <Skeleton className="w-12 h-3" />
          </div>
          <div className="space-y-1 flex flex-col items-center">
            <Skeleton className="w-10 h-6" />
            <Skeleton className="w-12 h-3" />
          </div>
          <div className="space-y-1 flex flex-col items-center">
            <Skeleton className="w-10 h-6" />
            <Skeleton className="w-12 h-3" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="w-24 h-4 ml-1" />
        <Skeleton className="w-full h-16 rounded-2xl" />
        <Skeleton className="w-full h-16 rounded-2xl" />
        <Skeleton className="w-full h-24 rounded-[2rem] mt-4" />
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 space-y-8 relative overflow-hidden">
      {/* Matching atmospheric background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-500 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500 rounded-full blur-[120px]" />
      </div>

      <div className="absolute top-6 right-6">
        <Skeleton className="w-32 h-10 rounded-2xl" />
      </div>

      <div className="text-center space-y-4 z-10">
        <Skeleton className="w-56 h-12 mx-auto rounded-xl" />
        <Skeleton className="w-32 h-4 mx-auto rounded-full" />
      </div>

      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 z-10 backdrop-blur-sm">
        <div className="flex bg-black/40 p-1 rounded-xl h-10">
          <Skeleton className="flex-1 h-8 rounded-lg" />
          <Skeleton className="flex-1 h-8 rounded-lg mx-1" />
        </div>
        
        <Skeleton className="w-full h-14 rounded-2xl" />
        
        <div className="relative my-6">
          <Skeleton className="w-full h-[1px] absolute top-1/2" />
          <Skeleton className="w-20 h-4 mx-auto bg-black z-10 relative" />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="w-16 h-3 ml-1" />
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-16 h-3 ml-1" />
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
        </div>
        
        <Skeleton className="w-full h-14 rounded-xl mt-6" />
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-2 items-start">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-24 h-4 rounded-lg" />
            <Skeleton className="w-2/3 h-10 rounded-2xl" />
            <div className="flex gap-4 px-2">
              <Skeleton className="w-10 h-2" />
              <Skeleton className="w-10 h-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
