import { Info, Lock, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import FormField, { controlClass } from "@/features/courses/components/FormField";
import { getStandardPrice, getStandardSessionPrice } from "@/features/courses/utils/coursePricing";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { isGroupType } from "@/features/courses/utils/groupClass";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  /**
   * True only when the teacher's own profile is both self-declared
   * IITian (onboarding Step 1) AND Admin-approved ("verified"). A teacher
   * who isn't never sees the IITian option. The create-course API
   * re-derives this and is authoritative regardless of this prop.
   */
  iitianEligible?: boolean;
  /** Vacancy listing: the price is fixed by the request's grade and read-only. */
  priceLocked?: boolean;
}

/** "Pricing" section. Standard rates are per hour; the per-session price scales with lecture length. */
export default function CoursePricingFields({ formData, onChange, iitianEligible, priceLocked }: Props) {
  const lectureMinutes = sessionLengthForCourse(formData.duration);
  const hourlyRate = getStandardPrice(formData.grade || null, false);
  const standardPrice = getStandardSessionPrice(formData.grade || null, false, lectureMinutes);
  const readOnly = Boolean(priceLocked);

  if (isGroupType(formData.type)) {
    return (
      <>
        <FormField label="Price per cycle" htmlFor="field-groupPricePerCycle" required hint="What each student pays for one cycle (a month) of this group class.">
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-gray-500">
              ₹
            </span>
            <Input
              id="field-groupPricePerCycle"
              name="groupPricePerCycle"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder="Enter price"
              value={formData.groupPricePerCycle}
              onChange={onChange}
              className={`${controlClass} pl-7 font-semibold`}
            />
          </div>
        </FormField>

        <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>Admin approval is still required before the group class goes live.</p>
        </div>
      </>
    );
  }

  const tone = "bg-violet-50 text-violet-800 border-violet-100";
  let Icon = Info;
  let message = "Set the price per session you want to charge. Admin approval is still required before the course goes live.";

  if (priceLocked) {
    Icon = Lock;
    message = `This course is for a parent's class request, so the price is fixed by grade at ₹${hourlyRate ?? "-"}/hour — ₹${standardPrice ?? formData.price}/session for a ${lectureMinutes}-minute lecture. It can't be changed.`;
  } else if (iitianEligible) {
    Icon = ShieldCheck;
    message = "Your profile is marked as an IITian, so this course is listed as an IITian course. Set the price per session you want to charge.";
  }

  return (
    <>
      <FormField label="Price per session" htmlFor="field-price" required>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-gray-500">
            ₹
          </span>
          <Input
            id="field-price"
            name="price"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Enter price"
            value={formData.price}
            onChange={onChange}
            disabled={readOnly}
            className={`${controlClass} pl-7 font-semibold`}
          />
        </div>
      </FormField>

      <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${tone}`}>
        <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </>
  );
}
