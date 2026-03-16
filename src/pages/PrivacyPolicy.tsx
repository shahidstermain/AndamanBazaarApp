import React from 'react';
import { Shield, Lock, Eye, Database, Globe, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-slide-up bg-neutral text-primary">
      <Link to="/" className="inline-flex items-center space-x-2 text-secondary hover:text-accent mb-8 transition-colors font-black uppercase text-sm tracking-widest">
        <ArrowLeft size={18} />
        <span>Back to Home</span>
      </Link>

      <div className="bg-base-100 rounded-[48px] shadow-2xl border-2 border-secondary/10 overflow-hidden">
        <div className="bg-primary p-12 text-base-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <Shield size={52} className="mb-6 text-accent" />
          <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">Privacy Policy</h1>
          <p className="mt-4 text-secondary font-bold text-base uppercase tracking-widest">Last Updated: February 2026</p>
        </div>

        <div className="p-8 md:p-16 space-y-12">
          <section className="space-y-4">
            <div className="flex items-center space-x-4">
              <Eye size={28} className="text-accent" />
              <h2 className="text-3xl font-black uppercase tracking-tight">Our Commitment to Your Privacy</h2>
            </div>
            <p className="text-secondary font-medium leading-relaxed text-lg">
              AndamanBazaar is a platform built on trust. This policy explains what information we collect, how we use it, and how we protect it. Our goal is to be transparent and to keep your data safe while you use our marketplace for the Andaman & Nicobar Islands.
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center space-x-4">
              <Database size={28} className="text-accent" />
              <h2 className="text-3xl font-black uppercase tracking-tight">Information We Collect</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-secondary/5 rounded-3xl space-y-3 border-2 border-secondary/10">
                <h3 className="font-black text-primary uppercase text-lg">Personal Details</h3>
                <p className="text-secondary font-bold leading-relaxed text-base">To create your account, we ask for your name, email, and optional phone number. This helps other users know who they are trading with.</p>
              </div>
              <div className="p-8 bg-secondary/5 rounded-3xl space-y-3 border-2 border-secondary/10">
                <h3 className="font-black text-primary uppercase text-lg">Location Information</h3>
                <p className="text-secondary font-bold leading-relaxed text-base">We use your device's GPS to confirm you are on the islands. This is for the 'Verified Resident' badge, which builds trust in our local community.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-4">
              <Lock size={28} className="text-accent" />
              <h2 className="text-3xl font-black uppercase tracking-tight">How We Protect Your Data</h2>
            </div>
            <p className="text-secondary font-medium leading-relaxed text-lg">
              Your data is stored securely on Google Cloud through Firebase services, including Firebase Authentication, Cloud Firestore, and Firebase Storage. All communication is encrypted with SSL/TLS, and access is enforced through authenticated server-side and security-rule checks.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-4">
              <Globe size={28} className="text-accent" />
              <h2 className="text-3xl font-black uppercase tracking-tight">Data Storage and Jurisdiction</h2>
            </div>
            <p className="text-secondary font-medium leading-relaxed text-lg">
              We comply with Indian IT laws. While we use global infrastructure for reliability, our services and data management are focused exclusively on users within the Andaman & Nicobar Islands, under Indian jurisdiction.
            </p>
          </section>

          <div className="pt-12 border-t-2 border-secondary/10 flex flex-col items-center space-y-4 text-center">
            <p className="text-secondary text-lg font-bold uppercase tracking-widest">Have questions about your data?</p>
            <a href="mailto:privacy@andamanbazaar.com" className="bg-primary text-base-100 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-secondary transition-all">Contact Our Privacy Team</a>
          </div>
        </div>
      </div>
    </div>
  );
};
