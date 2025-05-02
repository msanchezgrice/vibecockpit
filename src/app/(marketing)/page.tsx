import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { HeroSection } from '@/components/marketing/HeroSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { ScreenshotsSection } from '@/components/marketing/ScreenshotsSection';
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection';
import { CTASection } from '@/components/marketing/CTASection';

export default async function MarketingHomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ScreenshotsSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
