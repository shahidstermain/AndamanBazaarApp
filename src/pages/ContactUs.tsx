import React, { useState } from "react";
import {
  Mail,
  MapPin,
  Clock,
  Send,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";

export const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body =
      "Name: " +
      formData.name +
      "\nEmail: " +
      formData.email +
      "\n\n" +
      formData.message;
    const mailto = `mailto:support@andamanbazaar.in?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_blank");
    setSubmitted(true);
  };

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
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <MessageSquare size={52} className="mb-6 text-white" />
            <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">
              Contact Us
            </h1>
            <p className="mt-4 text-white/90 font-bold text-base uppercase tracking-widest">
              We're Here to Help
            </p>
          </div>

          <div className="p-8 md:p-16 space-y-12">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 bg-warm-50 rounded-3xl border border-warm-200 space-y-3 text-center">
                <Mail size={32} className="text-teal-600 mx-auto" />
                <h3 className="font-black text-midnight-700 uppercase text-lg">
                  Email
                </h3>
                <a
                  href="mailto:support@andamanbazaar.in"
                  className="text-teal-600 font-bold underline hover:text-teal-700 transition-colors block"
                >
                  support@andamanbazaar.in
                </a>
              </div>

              <div className="p-8 bg-warm-50 rounded-3xl border border-warm-200 space-y-3 text-center">
                <MapPin size={32} className="text-teal-600 mx-auto" />
                <h3 className="font-black text-midnight-700 uppercase text-lg">
                  Address
                </h3>
                <p className="text-warm-600 font-bold text-sm leading-relaxed">
                  Andaman &amp; Nicobar Islands,
                  <br />
                  India — 744101
                </p>
              </div>

              <div className="p-8 bg-warm-50 rounded-3xl border border-warm-200 space-y-3 text-center">
                <Clock size={32} className="text-teal-600 mx-auto" />
                <h3 className="font-black text-midnight-700 uppercase text-lg">
                  Response Time
                </h3>
                <p className="text-warm-600 font-bold text-sm leading-relaxed">
                  We typically respond
                  <br />
                  within 24–48 hours
                </p>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <Send size={28} className="text-teal-600" />
                <h2 className="text-3xl font-black text-midnight-700 uppercase tracking-tight">
                  Send Us a Message
                </h2>
              </div>

              {submitted ? (
                <div className="p-8 bg-teal-50 rounded-3xl border-2 border-teal-200 text-center space-y-3">
                  <p className="text-2xl font-black text-teal-700">
                    Thank You!
                  </p>
                  <p className="text-teal-600 font-medium text-lg">
                    Your email client should have opened with the message. If
                    not, please email us directly at{" "}
                    <a
                      href="mailto:support@andamanbazaar.in"
                      className="underline font-bold"
                    >
                      support@andamanbazaar.in
                    </a>
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-teal-700 transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="contact-name"
                        className="text-xs font-black uppercase tracking-widest text-warm-400"
                      >
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full p-4 rounded-2xl border-2 border-warm-200 bg-white font-bold text-midnight-700 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="contact-email"
                        className="text-xs font-black uppercase tracking-widest text-warm-400"
                      >
                        Your Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full p-4 rounded-2xl border-2 border-warm-200 bg-white font-bold text-midnight-700 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="contact-subject"
                      className="text-xs font-black uppercase tracking-widest text-warm-400"
                    >
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="w-full p-4 rounded-2xl border-2 border-warm-200 bg-white font-bold text-midnight-700 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-colors"
                      placeholder="Payment enquiry, account issue, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="contact-message"
                      className="text-xs font-black uppercase tracking-widest text-warm-400"
                    >
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full p-4 rounded-2xl border-2 border-warm-200 bg-white font-bold text-midnight-700 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-colors resize-none"
                      placeholder="Describe your question or concern..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-teal-700 transition-all flex items-center gap-3"
                  >
                    <Send size={18} />
                    Send Message
                  </button>
                </form>
              )}
            </section>

            <div className="pt-12 border-t border-warm-200 text-center space-y-2">
              <p className="text-warm-600 font-medium text-sm">
                Independently built by{" "}
                <a
                  href="https://shahidster.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 font-black hover:text-teal-700 transition-colors"
                >
                  Shahid Moosa
                </a>{" "}
                &middot; Sole Proprietor
              </p>
              <p className="text-warm-400 font-medium text-xs">
                Andaman &amp; Nicobar Islands, India
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
