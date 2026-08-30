import { Input } from "@/components/ui/input";
import SelectField from "@/features/shared/components/SelectField";
import {
  DURATION_OPTIONS,
  TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  MODULE_OPTIONS,
} from "@/features/courses/constants/courseOptions";
import type { CourseFormData } from "@/features/courses/types/course";

interface Props {
  formData: CourseFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
}

export default function CourseDetailFields({ formData, onChange }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SelectField
          name="duration"
          value={formData.duration}
          onChange={onChange}
          placeholder="Duration"
          options={DURATION_OPTIONS}
        />
        <SelectField
          name="type"
          value={formData.type}
          onChange={onChange}
          placeholder="Type"
          options={TYPE_OPTIONS}
        />
        <SelectField
          name="language"
          value={formData.language}
          onChange={onChange}
          placeholder="Language"
          options={LANGUAGE_OPTIONS}
        />
        <SelectField
          name="frequency"
          value={formData.frequency}
          onChange={onChange}
          placeholder="Frequency"
          options={FREQUENCY_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3">
          <Input
            name="courseTitle"
            placeholder="Course Title"
            value={formData.courseTitle}
            onChange={onChange}
          />
        </div>

        <Input
          name="rating"
          placeholder="Rating"
          value={formData.rating}
          onChange={onChange}
        />
      </div>

      <Input
        name="objective"
        placeholder="Objective"
        value={formData.objective}
        onChange={onChange}
      />

      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={onChange}
        rows={5}
        className="w-full border rounded-md px-3 py-3 text-sm resize-none"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SelectField
          name="modules"
          value={formData.modules}
          onChange={onChange}
          placeholder="Modules"
          options={MODULE_OPTIONS}
        />
        <Input
          name="courseTags"
          placeholder="Course Tags"
          value={formData.courseTags}
          onChange={onChange}
        />
        <Input name="price" placeholder="Price" value={formData.price} onChange={onChange} />
      </div>
    </>
  );
}
