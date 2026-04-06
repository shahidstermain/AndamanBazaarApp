import React, { useState } from 'react';
import {
    Zap, Rocket, Crown,
    CheckCircle, ArrowLeft,
    Sparkles, ShieldCheck,
    TrendingUp, Users,
    MessageCircle, PlusCircle,
    ChevronDown,
    LucideIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BOOST_TIERS, LEGAL_ENTITY } from '../lib/pricing';

// ============================================================
// Premium Pricing Landing Page
// Designed for visual excellence & high conversion
// Use: Glassmorphism, Mesh Gradients, Smooth Animations
// ============================================================

const TIER_ICONS: Record<string, { icon: LucideIcon; color: string; bgColor: string; borderColor: string; glow: string }> = {
    spark: {
        icon: Zap,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200/50',
        glow: 'shadow-amber-200/20'
    },
    boost: {
        icon: Rocket,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200/50',
        glow: 'shadow-teal-300/30'
    },
    power: {
        icon: Crown,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200/50',
        glow: 'shadow-purple-300/30'
    },
};

const BENEFITS = [
    {
        title: 'Massive Visibility',
        desc: 'Reach verified local buyers across the Andaman & Nicobar islands.',
        icon: Users,
        color: 'text-blue-500',
        bg: 'bg-blue-50'
    },
    {
        title: 'Priority Search',
        desc: 'Your listings stay at the top of search results and category views.',
        icon: TrendingUp,
        color: 'text-teal-600',
        bg: 'bg-teal-50'
    },
    {
        title: 'Fast & Secure',
        desc: 'Instant payments via UPI, Cards, and Netbanking. Secured by Cashfree.',
        icon: ShieldCheck,
        color: 'text-coral-500',
        bg: 'bg-coral-50'
    }
];

const FAQS = [
    {
        q: "How long does a boost last?",
        a: "Boosts vary from 3 to 30 days depending on the plan you choose. Your listing will be featured immediately after payment."
    },
    {
        q: "Can I boost multiple listings?",
        a: "Yes! You can boost as many listings as you like. Each boost is tied to a specific listing ID."
    },
    {
        q: "Is it really free to list?",
        a: "Absolutely. Standard listings are 100% free with no hidden charges. We only charge for optional visibility boosts."
    }
];

const FAQItem = ({ faq }: { faq: typeof FAQS[0] }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="group bg-white/80 backdrop-blur-sm rounded-3xl border border-warm-200 p-8 hover:border-teal-300 transition-all duration-300">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="text-lg font-black text-midnight-700 uppercase tracking-tight">{faq.q}</h4>
                <ChevronDown className={`text-warm-400 group-hover:text-teal-500 transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <p className="mt-4 text-midnight-500 font-medium leading-relaxed animate-fade-in">
                    {faq.a}
                </p>
            )}
        </div>
    );
};

export const Pricing: React.FC = () => {
    return (
        <div className="min-h-screen bg-mesh font-sans selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">
            {/* Top Navigation Bar / Back button */}
            <div className="max-w-7xl mx-auto px-6 pt-8">
                <Link
                    to="/"
                    className="group inline-flex items-center space-x-2 text-midnight-600 hover:text-ocean transition-all duration-300 font-bold uppercase text-xs tracking-widest bg-white/50 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/50 shadow-sm"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Home</span>
                </Link>
            </div>

            {/* Hero Section */}
            <header className="max-w-7xl mx-auto px-6 pt-16 pb-24 relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-[120px] -z-10 animate-float"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-200/30 rounded-full blur-[100px] -z-10 animate-pulse-heart"></div>

                <div className="max-w-4xl space-y-6">
                    <div className="inline-flex items-center gap-2 bg-coral-50 px-4 py-1.5 rounded-full border border-coral-100/50 shadow-sm animate-fade-in">
                        <Sparkles size={14} className="text-coral-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-coral-600">Premium Seller Services</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-heading font-black text-midnight-700 tracking-tight leading-[0.95] reveal">
                        Maximize Reach. <br />
                        <span className="text-ocean">Sell Faster.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-midnight-500 font-medium leading-relaxed max-w-2xl reveal-delay-2">
                        Featured listings on AndamanBazaar get <strong className="text-midnight-700">10x more visibility</strong> from verified local buyers.
                        Reach more people, faster.
                    </p>

                    <div className="flex flex-wrap gap-4 pt-4 reveal-delay-3">
                        <Link to="/listings" className="btn-primary">
                            <PlusCircle size={20} />
                            Post a Listing for Free
                        </Link>
                        <a href="#plans" className="btn-secondary">
                            View Boost Plans
                        </a>
                    </div>
                </div>
            </header>

            {/* Benefits Bento Grid */}
            <section className="bg-white/40 backdrop-blur-md border-y border-white/50 py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {BENEFITS.map((benefit, idx) => {
                            const Icon = benefit.icon;
                            return (
                                <div key={idx} className="glass p-8 rounded-3xl space-y-4 hover:scale-[1.02] transition-transform duration-500">
                                    <div className={`w-14 h-14 ${benefit.bg} ${benefit.color} rounded-2xl flex items-center justify-center`}>
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="text-2xl font-black text-midnight-700 uppercase tracking-tight">{benefit.title}</h3>
                                    <p className="text-midnight-500 font-medium leading-relaxed">{benefit.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Pricing Tiers */}
            <section id="plans" className="max-w-7xl mx-auto px-6 py-32 space-y-16">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black text-midnight-700 uppercase tracking-tighter">Scale Your Sale</h2>
                    <p className="text-midnight-500 font-bold text-lg italic opacity-80 uppercase tracking-widest text-[10px]">
                        Simple pricing for maximum impact
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {BOOST_TIERS.map((tier) => {
                        const ui = TIER_ICONS[tier.key] || TIER_ICONS.spark;
                        const Icon = ui.icon;
                        return (
                            <div
                                key={tier.key}
                                className={`relative flex flex-col glass p-1 rounded-[40px] transition-all duration-500 hover:shadow-2xl ${tier.popular ? 'bg-gradient-to-br from-teal-500/10 to-ocean/5 border-teal-500/30' : 'border-white/60'}`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg shadow-teal-500/40 z-10 animate-glow-pulse">
                                        Most Popular
                                    </div>
                                )}

                                <div className="p-10 space-y-8 flex-1">
                                    <div className="space-y-4">
                                        <div className={`w-16 h-16 ${ui.bgColor} ${ui.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                                            <Icon size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-midnight-700 uppercase tracking-tight">{tier.name}</h3>
                                            <p className="text-midnight-400 font-bold uppercase text-[10px] tracking-widest">{tier.durationLabel} Visibility</p>
                                        </div>
                                    </div>

                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-6xl font-black text-midnight-700`}>₹{tier.priceInr}</span>
                                        <span className="text-midnight-400 font-bold text-sm tracking-wide">INR</span>
                                    </div>

                                    <ul className="space-y-4 pt-4">
                                        {tier.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3 group">
                                                <div className={`w-5 h-5 rounded-full ${ui.bgColor} ${ui.color} flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform`}>
                                                    <CheckCircle size={12} strokeWidth={3} />
                                                </div>
                                                <span className="text-midnight-600 font-medium text-sm leading-tight">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-8 pt-0">
                                    <Link
                                        to="/dashboard"
                                        className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm text-center transition-all duration-300 shadow-lg ${tier.popular
                                                ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20 hover:shadow-teal-600/40'
                                                : 'bg-midnight-700 text-white hover:bg-midnight-800'
                                            }`}
                                    >
                                        Select {tier.name}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Free Plan Footnote */}
                <div className="glass p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border-white/40">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-warm-100 text-midnight-400 rounded-2xl flex items-center justify-center">
                            <PlusCircle size={32} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-midnight-700 uppercase tracking-tight">Standard Listing</h4>
                            <p className="text-midnight-500 font-medium">No boost, valid for 30 days. Perfect for casual sellers.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                        <span className="text-3xl font-black text-midnight-700 block">₹0</span>
                        <span className="text-midnight-400 font-bold uppercase text-xs tracking-widest">Always Free</span>
                    </div>
                </div>
            </section>

            {/* In-app demo prompt section */}
            <section className="max-w-7xl mx-auto px-6 pb-32">
                <div className="bg-primary rounded-[48px] p-12 md:p-24 text-white relative overflow-hidden shadow-ocean-glow">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 text-center lg:text-left">
                            <h2 className="text-4xl md:text-6xl font-heading font-black tracking-tight leading-tight uppercase">
                                Ready to start <br />
                                <span className="text-accent underline decoration-8 underline-offset-8">making money?</span>
                            </h2>
                            <p className="text-secondary text-lg md:text-xl font-medium max-w-lg mx-auto lg:mx-0">
                                Buy and sell locally across the Andaman & Nicobar Islands.
                                Listing takes less than 60 seconds.
                            </p>
                            <div className="pt-4">
                                <Link to="/listings" className="btn-primary scale-125 origin-center lg:origin-left">
                                    Start Selling Now
                                </Link>
                            </div>
                        </div>

                        {/* Floating Trust stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-dark p-8 rounded-3xl space-y-2">
                                <Users size={32} className="text-white mb-3" />
                                <span className="text-xl font-black block leading-tight">Local<br/>Community</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2rem] opacity-70 mt-2 block">Islanders Only</span>
                            </div>
                            <div className="glass-dark p-8 rounded-3xl space-y-2">
                                <TrendingUp size={32} className="text-white mb-3" />
                                <span className="text-xl font-black block leading-tight">Island<br/>Trade</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2rem] opacity-70 mt-2 block">Buy & Sell</span>
                            </div>
                            <div className="glass-dark p-8 rounded-3xl space-y-2 col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck size={18} className="text-accent" />
                                    <span className="text-sm font-bold">Safe & Verified</span>
                                </div>
                                <p className="text-xs font-medium opacity-80 leading-relaxed">
                                    We verify every payment and moderate all listings to ensure you have a safe island experience.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="bg-warm-100/30 py-32">
                <div className="max-w-4xl mx-auto px-6 space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-midnight-700 uppercase tracking-tighter">Common Questions</h2>
                        <p className="text-midnight-500 font-bold uppercase tracking-widest text-xs">Everything you need to know about selling</p>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <FAQItem key={i} faq={faq} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Final Footer / Info */}
            <footer className="max-w-7xl mx-auto px-6 py-24 border-t border-warm-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="AndamanBazaar" className="w-10 h-10 rounded-xl shadow-sm" />
                            <span className="text-2xl font-black tracking-tighter text-midnight-700">AndamanBazaar.</span>
                        </div>
                        <p className="text-midnight-400 text-sm font-medium leading-relaxed max-w-sm">
                            Buy & Sell locally in Andaman — no mainland scams.
                            Built with love in Port Blair.
                        </p>
                    </div>

                    <div className="space-y-6 md:text-right">
                        <div className="flex flex-wrap md:justify-end gap-x-8 gap-y-3 font-black uppercase text-[10px] tracking-widest text-midnight-500">
                            <Link to="/about" className="hover:text-ocean transition-colors">About Us</Link>
                            <Link to="/contact" className="hover:text-ocean transition-colors">Contact</Link>
                            <a href="/terms" className="hover:text-ocean transition-colors">Terms</a>
                            <a href="/privacy" className="hover:text-ocean transition-colors">Privacy</a>
                        </div>

                        <div className="pt-6 border-t border-warm-100">
                            <p className="text-midnight-400 text-[10px] font-bold uppercase tracking-widest">
                                &copy; 2025 {LEGAL_ENTITY.name} · {LEGAL_ENTITY.type}
                            </p>
                            <p className="text-teal-600 font-black text-[10px] uppercase tracking-widest mt-1">
                                Payments Secured by Cashfree
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
