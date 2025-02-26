import { Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Hero = () => {
  return (
    <div className="relative h-[600px] overflow-hidden">
      {/* Hero Background */}
      <div className="absolute inset-0">
      <img
          src="/images/african.jpg" // You'll need to add this image
          alt="Local food and stays"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
      </div>

      {/* Hero Content */}
      <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-center text-white">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeIn">
          Discover Local Flavors & 
          <span className="text-amber-400"> Authentic Stays</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl animate-fadeIn delay-100">
          Connect with local hosts offering unique dining experiences and cozy accommodations
        </p>

        {/* Search Bar */}
        
      </div>
    </div>
  );
};

export default Hero; 