import React from 'react';
import { MapPin, Award, Clock, Briefcase, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="bg-white min-h-screen">
      <div className="relative bg-slate-900 py-24 px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
            Proudly Made in Valenzuela
          </h1>
          <p className="text-xl text-slate-300 mb-8 font-light">
            Bringing sustainable Palochina wood furniture from our workshop to your home with AR technology.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-16">
           <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6 font-serif">Who We Are</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                ARFurniture is a homegrown e-commerce platform rooted in Valenzuela City, the industrial gateway of Metro Manila. 
                We specialize in crafting high-quality furniture from <strong>Palochina wood</strong>—upcycled, sustainable, and durable pine wood that brings a rustic charm to any space.
              </p>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                We combine traditional Filipino craftsmanship with modern Augmented Reality (AR) technology, allowing you to visualize our locally made pieces in your home before you buy.
              </p>
              <div className="space-y-6">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                          <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-900 text-lg">Workshop Location</h3>
                          <p className="text-slate-600">123 Gen. T. de Leon Street<br/>Valenzuela City, Metro Manila 1442</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                          <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-900 text-lg">Our Specialty</h3>
                          <p className="text-slate-600">
                            Custom Palochina and industrial-style furniture:
                            <ul className="list-disc list-inside mt-1 text-sm">
                                <li>Bed frames, dining sets, and multi-purpose racks</li>
                                <li>Eco-friendly upcycled wood materials</li>
                                <li>Affordable local pricing</li>
                            </ul>
                          </p>
                      </div>
                  </div>
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                          <Clock className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-900 text-lg">Established 2020</h3>
                          <p className="text-slate-600">
                             Starting as a small backyard workshop during the pandemic, we have grown to serve thousands of Filipino homes with sturdy, stylish, and sustainable furniture.
                          </p>
                      </div>
                  </div>
              </div>
           </div>
           <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl bg-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80"
                alt="Palochina Furniture"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm p-4 rounded-xl max-w-xs">
                  <p className="text-sm font-bold text-slate-900">"Matibay, Maganda, at Mura."</p>
                  <p className="text-xs text-slate-500 mt-1">- Tatak Valenzuela</p>
              </div>
           </div>
        </div>
        <div className="py-8 border-t border-slate-100">
            <div className="flex justify-between items-end mb-8 mt-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 font-serif">Our Palochina Collection</h2>
                    <p className="text-slate-500 mt-2">Real Pinoy homes transformed with ARFurniture pieces.</p>
                </div>
                <Link to="/" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
                    Explore Shop <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer">
                    <img src="https://i.ytimg.com/vi/hbsNo-u_pHg/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAklslzmtLeq8m1fGLiSoMpty36Mw" alt="Palochina Bed" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6">
                        <div>
                            <p className="text-white font-bold text-lg">Rustic Bed Frame</p>
                            <p className="text-white/80 text-sm">Solid Palochina</p>
                        </div>
                    </div>
                </div>
                <div className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80" alt="Plant Rack" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6">
                        <div>
                            <p className="text-white font-bold text-lg">Multi-Purpose Rack</p>
                            <p className="text-white/80 text-sm">Varnished Finish</p>
                        </div>
                    </div>
                </div>
                <div className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer">
                    <img src="https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=800&q=80" alt="Dining Set" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6">
                        <div>
                            <p className="text-white font-bold text-lg">Dining Set</p>
                            <p className="text-white/80 text-sm">4-Seater Custom</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
