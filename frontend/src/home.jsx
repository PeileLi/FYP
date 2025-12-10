import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, 
  Search, 
  Menu, 
  X, 
  TrendingUp, 
  Users, 
  Globe, 
  ArrowRight,
  ShieldCheck,
  Clock,
  Target,
  Sprout 
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'medical', name: 'Medical Aid' },
  { id: 'education', name: 'Education' },
  { id: 'environment', name: 'Environment' },
  { id: 'emergency', name: 'Emergency Relief' },
];

const CAMPAIGNS = [];


const ProgressBar = ({ current, total }) => {
  const percentage = Math.min((current / total) * 100, 100);
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
      <div 
        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

const CampaignCard = ({ data }) => {
  const percent = Math.round((data.raised / data.goal) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={data.image} 
          alt={data.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-emerald-700 uppercase tracking-wide shadow-sm">
          {CATEGORIES.find(c => c.id === data.category)?.name}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2 text-gray-500 text-xs font-medium">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Organizer: {data.organizer}</span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">{data.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{data.description}</p>
        
        <div className="mt-auto">
          <div className="flex justify-between text-sm mb-1 font-medium">
            <span className="text-emerald-600">¥{data.raised.toLocaleString()}</span>
            <span className="text-gray-400">Goal ¥{data.goal.toLocaleString()}</span>
          </div>
          
          <ProgressBar current={data.raised} total={data.goal} />
          
          <div className="flex justify-between items-center text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{data.donors} supporters</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{data.daysLeft} days left</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ children, primary = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 ${
      primary 
        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300/50' 
        : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
    }`}
  >
    {children}
  </button>
);

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredCampaigns = activeCategory === 'all' 
    ? CAMPAIGNS 
    : CAMPAIGNS.filter(c => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform shadow-sm">
                <Sprout className="text-white" size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                CloudFund
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">Browse Projects</a>
              <a href="#" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">How It Works</a>
              <a href="#" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors">About Us</a>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search campaigns..." 
                  className="pl-9 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 transition-all hover:bg-gray-50 border border-transparent hover:border-emerald-100"
                />
              </div>
              <Link to="/login">
                <NavButton>Login</NavButton>
              </Link>
              <NavButton primary>Start Campaign</NavButton>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 animate-in slide-in-from-top-5">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600">Browse Projects</a>
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600">How It Works</a>
              <a href="#" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600">About Us</a>
              <div className="pt-4 flex flex-col gap-2">
                 <Link to="/login" className="w-full py-3 rounded-xl border border-gray-200 font-medium text-gray-700 text-center hover:bg-gray-50 transition-colors">Login</Link>
                 <button className="w-full py-3 rounded-xl bg-emerald-600 font-medium text-white shadow-lg shadow-emerald-200">Start Campaign</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 overflow-hidden">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/diagmonds.png')]"></div>
        
        {/* Sprout/Plant Decorative Elements */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-emerald-950/50 to-transparent"></div>
        
        {/* Animated Plant-like Blobs */}
        <div className="absolute top-0 right-0 -mt-32 -mr-32 w-[32rem] h-[32rem] bg-emerald-400 rounded-full mix-blend-overlay filter blur-[120px] opacity-25 animate-blob"></div>
        <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-[28rem] h-[28rem] bg-green-500 rounded-full mix-blend-overlay filter blur-[100px] opacity-25 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/3 right-1/4 w-[24rem] h-[24rem] bg-teal-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-blob"></div>
        
        {/* Sprout Icon Decorative Elements */}
        <div className="absolute top-20 left-10 opacity-10">
          <Sprout className="text-white" size={120} strokeWidth={1} />
        </div>
        <div className="absolute bottom-20 right-20 opacity-10 rotate-12">
          <Sprout className="text-white" size={100} strokeWidth={1} />
        </div>
        <div className="absolute top-1/2 right-10 opacity-10 -rotate-12">
          <Sprout className="text-white" size={80} strokeWidth={1} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6 drop-shadow-lg">
              Gather Every Spark,<br className="hidden sm:block" />
              <span className="text-emerald-400">Illuminate</span> Every Corner of the World
            </h1>
            <p className="text-emerald-100 text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
              Whether it's children with serious illnesses, homes in need of rebuilding, or endangered wildlife.
              Here, every act of kindness becomes a force for change.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full text-lg shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 flex items-center justify-center gap-2 border border-emerald-400/20">
                Start Donating <Heart size={20} fill="currentColor" />
              </button>
              <button className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold rounded-full text-lg border border-white/20 transition-all flex items-center justify-center gap-2">
                Start Campaign <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Bottom Wave Decoration */}
        <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Statistics Bar */}
      <div className="bg-white border-b border-gray-200 relative z-10 -mt-8 mx-4 md:mx-auto max-w-6xl rounded-2xl shadow-xl shadow-gray-200/50">
        <div className="px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
            <div className="text-center group">
              <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">¥120M</div>
              <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Total Raised</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">350K+</div>
              <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Donors</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">12K</div>
              <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Successful Projects</div>
            </div>
            <div className="text-center hidden md:block group">
              <div className="text-3xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">100%</div>
              <div className="text-sm text-gray-500 mt-1 uppercase tracking-wide">Transparency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Title and Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Featured Campaigns</h2>
            <p className="text-gray-500">Discover those in need and make a difference</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCampaigns.map(campaign => (
            <CampaignCard key={campaign.id} data={campaign} />
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No campaigns found</h3>
            <p className="text-gray-500">Try switching to another category</p>
          </div>
        )}

        <div className="mt-16 text-center">
          <button className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm hover:shadow">
            View More Projects <ArrowRight size={16} />
          </button>
        </div>
      </main>

      {/* Trust & Security Section */}
      <section className="bg-gradient-to-b from-emerald-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose CloudFund?</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">We are committed to building the most transparent and efficient crowdfunding platform, ensuring every donation makes a real impact.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-emerald-600">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Strict Verification</h3>
              <p className="text-gray-600">All campaign organizers and medical documents are verified through both manual and automated systems to prevent fraud.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                <TrendingUp size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Full Transparency</h3>
              <p className="text-gray-600">Using blockchain technology to record every donation flow, with full project execution transparency available at all times.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-emerald-100 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-orange-600">
                <Target size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Precise Support</h3>
              <p className="text-gray-600">Big data matching connects those in need with donors' intentions, ensuring help reaches where it's needed most.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-1.5 rounded-lg">
                  <Sprout className="text-white" size={18} strokeWidth={2.5} />
                </div>
                <span className="text-xl font-bold text-white">CloudFund</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Connecting every kind soul, making compassion know no distance.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">About Us</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Platform Overview</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Help Center</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 cursor-pointer transition-colors">
                  <Globe size={18} />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-emerald-600 cursor-pointer transition-colors">
                  <Users size={18} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2025 CloudFund Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}