import MainLayout from "@/components/layout/MainLayout";

const Careers = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6">Join Our Team</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Help us connect travelers with authentic local experiences.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Open Positions</h2>
            <p className="text-muted-foreground">
              We're currently building our team. Check back soon for opportunities.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Why Join Us?</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>Work with a passionate team</li>
              <li>Make a real impact</li>
              <li>Grow professionally</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Careers;