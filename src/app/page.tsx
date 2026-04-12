import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import ServicesSection from '@/components/sections/ServicesSection';
import ContactSection from '@/components/sections/ContactSection';
import Footer from '@/components/layout/Footer';
import FloatingWhatsApp from '@/components/layout/FloatingWhatsApp';

export default function Home() {
  return (
    <div className="font-sans text-slate-800 bg-slate-50 min-h-screen selection:bg-orange-500 selection:text-white">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ServicesSection />
      <ContactSection />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
}
