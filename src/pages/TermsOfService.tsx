import React from "react";
import {
  Gavel,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-warm-50">
      <div className="app-container py-12 animate-slide-up">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-warm-600 hover:text-teal-600 mb-8 transition-colors font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl border border-warm-200 overflow-hidden">
          <div className="bg-teal-gradient p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <Gavel size={52} className="mb-6 text-white" />
            <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">
              Terms of Service
            </h1>
            <p className="mt-4 text-white/90 font-bold text-base uppercase tracking-widest">
              Legal Framework for Our Island Community
            </p>
          </div>

          <div className="p-8 md:p-16 space-y-12">
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <Info size={28} className="text-teal-600" />
                <h2 className="text-3xl font-black text-midnight-700 uppercase tracking-tight">
                  1. Our Agreement
                </h2>
              </div>
              <p className="text-warm-600 font-medium leading-relaxed text-lg">
                By using AndamanBazaar, you agree to these terms. This platform
                is a community marketplace for the people of the Andaman &
                Nicobar Islands. While others can browse, some features are
                reserved for verified island residents to maintain local trust.
              </p>
            </section>

            <section className="p-8 bg-red-500/10 rounded-[32px] border-2 border-red-500/20 space-y-4">
              <div className="flex items-center space-x-4 text-red-700">
                <AlertTriangle size={28} />
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  2. Safety First: A Crucial Warning
                </h2>
              </div>
              <p className="text-red-800 font-bold text-base leading-relaxed">
                AndamanBazaar is a discovery platform, not a payment handler. We
                don't offer payment protection or delivery services.
                <strong>
                  Always meet sellers in person in safe, public locations
                </strong>{" "}
                (like a known shop or cafe).
                <strong>
                  Never transfer money online (UPI, bank transfer) before you
                  have inspected the item yourself.
                </strong>
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-4">
                <CheckCircle size={28} className="text-green-600" />
                <h2 className="text-3xl font-black text-midnight-700 uppercase tracking-tight">
                  3. Community Rules
                </h2>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4">
                {[
                  "No illegal goods or services as per Indian law.",
                  "Post honest and accurate descriptions of your items.",
                  "Be respectful and polite in all interactions.",
                  "Ensure your location is truthful for verification.",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start space-x-3 text-lg font-bold text-warm-600"
                  >
                    <CheckCircle
                      size={20}
                      className="text-green-500 mt-1 flex-shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <div className="flex items-center space-x-4">
                <Gavel size={28} className="text-teal-600" />
                <h2 className="text-3xl font-black text-midnight-700 uppercase tracking-tight">
                  4. Our Role and Limitations
                </h2>
              </div>
              <p className="text-warm-600 font-medium leading-relaxed text-lg">
                AndamanBazaar is simply a venue to connect buyers and sellers.
                We are not involved in the actual transaction and are not
                responsible for the quality, safety, or legality of items. All
                transactions are at your own risk.
              </p>
            </section>

            <div className="pt-8 border-t border-warm-200 text-center">
              <p className="text-sm font-black text-warm-400 uppercase tracking-widest">
                Last Updated: August 2024
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
