"use client";

import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import PhoneInput from "@/features/auth/components/signup/PhoneInput";

import FormField from "@/features/parent/components/onboarding/FormField";
import FormErrorBanner from "@/features/parent/components/onboarding/FormErrorBanner";
import OnboardingSubmitButton from "@/features/parent/components/onboarding/OnboardingSubmitButton";
import AutofilledBadge from "@/features/parent/components/onboarding/AutofilledBadge";
import { useParentStep1Form } from "@/features/parent/hooks/useParentStep1Form";
import { NRI_OR_INDIAN_OPTIONS } from "@/features/parent/constants/onboardingOptions";

export default function Step1() {
  const {
    formData,
    errors,
    submitting,
    error,
    autofilled,
    handleChange,
    handleWhatsappChange,
    handleSubmit,
  } = useParentStep1Form();

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Learnie</h1>
        <p className="text-sm text-gray-500 mt-1">
          Just the basics to get started — you can add your child and other
          details later from your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 gap-5">
          <FormField
            label="Display Name"
            htmlFor="visibleName"
            required
            fullWidth
            error={errors.visibleName}
            badge={autofilled.visibleName ? <AutofilledBadge /> : undefined}
          >
            <Input
              id="visibleName"
              name="visibleName"
              placeholder="e.g. Priya Sharma"
              value={formData.visibleName}
              onChange={handleChange}
              aria-invalid={!!errors.visibleName}
              required
            />
          </FormField>

          <FormField
            label="WhatsApp Number"
            required
            fullWidth
            badge={autofilled.whatsappNumber ? <AutofilledBadge /> : undefined}
          >
            <div
              className="onboarding-phone-input"
              data-invalid={!!errors.whatsappNumber}
            >
              <PhoneInput
                value={formData.whatsappNumber}
                onChange={handleWhatsappChange}
                error={errors.whatsappNumber}
              />
            </div>
          </FormField>

          <FormField
            label="Indian or NRI"
            htmlFor="nriOrIndian"
            required
            fullWidth
            error={errors.nriOrIndian}
          >
            <SelectField
              id="nriOrIndian"
              name="nriOrIndian"
              value={formData.nriOrIndian}
              placeholder="Select one"
              options={NRI_OR_INDIAN_OPTIONS}
              onChange={handleChange}
              aria-invalid={!!errors.nriOrIndian}
            />
          </FormField>

          <FormField
            label="City"
            htmlFor="city"
            required
            fullWidth
            error={errors.city}
          >
            <Input
              id="city"
              name="city"
              placeholder="e.g. Mumbai"
              value={formData.city}
              onChange={handleChange}
              aria-invalid={!!errors.city}
              required
            />
          </FormField>

          <FormField label="Referral Code" htmlFor="referredByCode" fullWidth>
            <Input
              id="referredByCode"
              name="referredByCode"
              placeholder="Have a code from a friend? Enter it here (optional)"
              value={formData.referredByCode}
              onChange={handleChange}
            />
          </FormField>
        </div>

        {error && <FormErrorBanner message={error} />}

        <OnboardingSubmitButton submitting={submitting} label="Get started" submittingLabel="Saving..." />
      </form>
    </>
  );
}
