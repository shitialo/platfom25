import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ className = "w-6 h-6" }: { className?: string }) => (
  <Loader2 className={`animate-spin ${className}`} />
);

export const MapLoading = () => (
  <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
    <LoadingSpinner className="w-8 h-8 text-primary" />
  </div>
); 