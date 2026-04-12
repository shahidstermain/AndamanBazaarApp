import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

type LeadFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  availableActivities: string[];
  prefill?: {
    activity?: string;
    location?: string;
  };
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  preferred_date: string;
  location: string;
  activities: string[];
  adults: string;
  children: string;
  swimming_ability: string;
  budget: string;
  referral_source: string;
  special_requests: string;
  consent: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  name: "",
  phone: "",
  email: "",
  preferred_date: "",
  location: "",
  activities: [],
  adults: "1",
  children: "0",
  swimming_ability: "",
  budget: "",
  referral_source: "",
  special_requests: "",
  consent: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (values: FormState): FormErrors => {
  const errors: FormErrors = {};

  if (!values.name.trim()) errors.name = "Please enter your name.";
  if (!values.phone.trim()) errors.phone = "Please enter your phone number.";
  if (!values.preferred_date) errors.preferred_date = "Please select a preferred date.";
  if (!values.location.trim()) errors.location = "Please choose a location.";
  if (values.activities.length === 0) errors.activities = "Select at least one activity.";
  if (Number(values.adults) < 1) errors.adults = "At least one adult is required.";
  if (!values.swimming_ability.trim())
    errors.swimming_ability = "Please select your swimming ability.";
  if (!values.budget || Number(values.budget) <= 0) errors.budget = "Please enter your budget.";
  if (values.email && !emailRegex.test(values.email)) errors.email = "Please enter a valid email.";
  if (!values.consent) errors.consent = "Consent is required to continue.";

  return errors;
};

const today = new Date().toISOString().slice(0, 10);

export const LeadFormModal = ({
  isOpen,
  onClose,
  availableActivities,
  prefill,
}: LeadFormModalProps) => {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const uniqueActivities = useMemo(
    () => Array.from(new Set(availableActivities)).sort(),
    [availableActivities],
  );

  useEffect(() => {
    if (!isOpen) return;
    setFormState({
      ...initialState,
      location: prefill?.location ?? "",
      activities: prefill?.activity ? [prefill.activity] : [],
    });
    setErrors({});
    setSubmitError("");
    setIsSuccess(false);
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [isOpen, prefill?.activity, prefill?.location]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleActivity = (activity: string) => {
    setFormState((prev) => {
      const exists = prev.activities.includes(activity);
      const activities = exists
        ? prev.activities.filter((item) => item !== activity)
        : [...prev.activities, activity];
      return { ...prev, activities };
    });
    setErrors((prev) => ({ ...prev, activities: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(formState);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createLead({
        name: formState.name.trim(),
        phone: formState.phone.trim(),
        email: formState.email.trim() || undefined,
        preferred_date: formState.preferred_date,
        location: formState.location.trim(),
        activities: formState.activities,
        adults: Number(formState.adults),
        children: Number(formState.children || 0),
        swimming_ability: formState.swimming_ability.trim(),
        budget: Number(formState.budget),
        referral_source: formState.referral_source.trim() || undefined,
        special_requests: formState.special_requests.trim() || undefined,
        consent: formState.consent,
      });
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-title"
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 id="lead-form-title" className="text-xl font-bold">
            Request Booking
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {isSuccess ? (
          <p className="rounded-md bg-emerald-50 p-4 font-medium text-emerald-800">
            Thank you — we usually reach out within 12 hours of submission. Kindly wait.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Name *
                </label>
                <input
                  ref={firstInputRef}
                  id="name"
                  value={formState.name}
                  onChange={(event) => setField("name", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                  Phone *
                </label>
                <input
                  id="phone"
                  value={formState.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={formState.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="preferred_date" className="mb-1 block text-sm font-medium">
                  Preferred Date *
                </label>
                <input
                  id="preferred_date"
                  type="date"
                  min={today}
                  value={formState.preferred_date}
                  onChange={(event) => setField("preferred_date", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.preferred_date)}
                />
                {errors.preferred_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.preferred_date}</p>
                )}
              </div>
              <div>
                <label htmlFor="location" className="mb-1 block text-sm font-medium">
                  Location *
                </label>
                <input
                  id="location"
                  value={formState.location}
                  onChange={(event) => setField("location", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.location)}
                />
                {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
              </div>
              <div>
                <label htmlFor="swimming_ability" className="mb-1 block text-sm font-medium">
                  Swimming Ability *
                </label>
                <select
                  id="swimming_ability"
                  value={formState.swimming_ability}
                  onChange={(event) => setField("swimming_ability", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.swimming_ability)}
                >
                  <option value="">Select</option>
                  <option value="Non-swimmer">Non-swimmer</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                {errors.swimming_ability && (
                  <p className="mt-1 text-sm text-red-600">{errors.swimming_ability}</p>
                )}
              </div>
              <div>
                <label htmlFor="adults" className="mb-1 block text-sm font-medium">
                  Adults *
                </label>
                <input
                  id="adults"
                  type="number"
                  min={1}
                  value={formState.adults}
                  onChange={(event) => setField("adults", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.adults)}
                />
                {errors.adults && <p className="mt-1 text-sm text-red-600">{errors.adults}</p>}
              </div>
              <div>
                <label htmlFor="children" className="mb-1 block text-sm font-medium">
                  Children
                </label>
                <input
                  id="children"
                  type="number"
                  min={0}
                  value={formState.children}
                  onChange={(event) => setField("children", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="budget" className="mb-1 block text-sm font-medium">
                  Budget *
                </label>
                <input
                  id="budget"
                  type="number"
                  min={0}
                  value={formState.budget}
                  onChange={(event) => setField("budget", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                  aria-invalid={Boolean(errors.budget)}
                />
                {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
              </div>
              <div>
                <label htmlFor="referral_source" className="mb-1 block text-sm font-medium">
                  Referral Source
                </label>
                <input
                  id="referral_source"
                  value={formState.referral_source}
                  onChange={(event) => setField("referral_source", event.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                />
              </div>
            </div>

            <fieldset className="rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Activities * (multi-select)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {uniqueActivities.map((activity) => (
                  <label key={activity} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formState.activities.includes(activity)}
                      onChange={() => toggleActivity(activity)}
                    />
                    {activity}
                  </label>
                ))}
              </div>
              {errors.activities && (
                <p className="mt-1 text-sm text-red-600">{errors.activities}</p>
              )}
            </fieldset>

            <div>
              <label htmlFor="special_requests" className="mb-1 block text-sm font-medium">
                Special Requests
              </label>
              <textarea
                id="special_requests"
                rows={3}
                value={formState.special_requests}
                onChange={(event) => setField("special_requests", event.target.value)}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>

            <label className="inline-flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.consent}
                onChange={(event) => setField("consent", event.target.checked)}
                className="mt-1"
              />
              <span>
                I agree to be contacted by AndamanBazaar regarding this booking enquiry. *
              </span>
            </label>
            {errors.consent && <p className="text-sm text-red-600">{errors.consent}</p>}

            {submitError && (
              <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
