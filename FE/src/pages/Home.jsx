import React from 'react';
import HeroSection from '../components/landing/HeroSection';
import Features from '../components/landing/Features';
import Workflow from '../components/landing/Workflow';
import BenefitSection from '../components/landing/BenefitSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';

const Home = () => {
  return (
    <>
      <HeroSection />
      <Features />
      <Workflow />
      <BenefitSection />
      <CTASection />
      <Footer />
    </>
  );
};

export default Home;