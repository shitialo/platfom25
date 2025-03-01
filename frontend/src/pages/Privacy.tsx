import MainLayout from "@/components/layout/MainLayout";

const Privacy = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose max-w-none">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <h2>1. Information We Collect</h2>
          <p>We collect information that you provide directly to us...</p>
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Information Collection</h2>
              <p className="text-muted-foreground">
                We collect information to provide and improve our services.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Usage</h2>
              <p className="text-muted-foreground">
                Your data is used to enhance your experience and our services.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-muted-foreground">
                You have control over your personal information.
              </p>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Privacy;