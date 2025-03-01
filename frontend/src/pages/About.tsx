import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">About Us</h1>
          <p className="text-lg mb-8">
            We connect travelers with authentic local experiences, from unique stays to memorable food adventures.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-gray-600">
                To create meaningful connections between travelers and local hosts, fostering cultural exchange and authentic experiences around the world.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
              <p className="text-gray-600">
                A world where every journey becomes an opportunity to experience local culture, cuisine, and hospitality firsthand.
              </p>
            </div>
          </div>

          <div className="bg-sage-50 rounded-xl p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-6">Why Choose Us?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xl font-medium mb-2">Authentic Experiences</h3>
                <p className="text-gray-600">
                  Connect with local hosts who share their passion and culture.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">Quality Assurance</h3>
                <p className="text-gray-600">
                  Every experience and stay is verified for quality and safety.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-medium mb-2">24/7 Support</h3>
                <p className="text-gray-600">
                  Our team is always here to help with any questions or concerns.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to Start Your Journey?</h2>
            <div className="flex gap-4 justify-center">
              <Button variant="default" size="lg">
                Find a Stay
              </Button>
              <Button variant="outline" size="lg">
                Book an Experience
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default About;