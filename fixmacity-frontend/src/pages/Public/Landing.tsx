import React from 'react'
import Navbar       from '../../components/landing/Navbar'
import Hero         from '../../components/landing/Hero'
import HowItWorks   from '../../components/landing/HowItWorks'
import ServicesGrid from '../../components/landing/ServicesGrid'
import ChatbotSection from '../../components/landing/ChatbotSection'
import MapSection   from '../../components/landing/MapSection'
import Testimonials from '../../components/landing/Testimonials'
import Footer       from '../../components/landing/Footer'

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <ServicesGrid />
        <ChatbotSection />
        <MapSection />
        <Testimonials />
      </main>
      <Footer />
    </div>
  )
}

export default Landing
