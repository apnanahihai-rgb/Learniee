"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

import {
  initialCourseFormData,
  type CourseFormData,
} from "@/features/courses/types/course";

import {
  CATEGORY_OPTIONS,
  SUBJECT_OPTIONS,
  GRADE_OPTIONS,
  BOARD_OPTIONS,
  EXPERIENCE_OPTIONS,
  DURATION_OPTIONS,
  TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  FREQUENCY_OPTIONS,
  MODULE_OPTIONS,
} from "@/features/courses/constants/courseOptions";

interface Props {
  onChange: (data: CourseFormData) => void;
}

export default function CreateCourseForm({ onChange }: Props) {
  const [formData, setFormData] =
    useState<CourseFormData>(initialCourseFormData);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = e.target;

    const updatedData = {
      ...formData,
      [name]: value,
    };

    setFormData(updatedData);
    onChange(updatedData);
  }

  return (
    <div className="space-y-6">
      {/* Category + Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="Category"
          options={CATEGORY_OPTIONS}
        />

        <SelectField
          name="timeSlot"
          value={formData.timeSlot}
          onChange={handleChange}
          placeholder="Time Slot"
          options={[
            "Morning",
            "Afternoon",
            "Evening",
          ]}
        />
      </div>

      {/* Course Configuration */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">
          Course Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SelectField
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Subject"
            options={SUBJECT_OPTIONS}
          />

          <SelectField
            name="grade"
            value={formData.grade}
            onChange={handleChange}
            placeholder="Grade"
            options={GRADE_OPTIONS}
          />

          <SelectField
            name="board"
            value={formData.board}
            onChange={handleChange}
            placeholder="Board"
            options={BOARD_OPTIONS}
          />

          <SelectField
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            placeholder="Experience"
            options={EXPERIENCE_OPTIONS}
          />
        </div>
      </div>

      {/* Course Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SelectField
          name="duration"
          value={formData.duration}
          onChange={handleChange}
          placeholder="Duration"
          options={DURATION_OPTIONS}
        />

        <SelectField
          name="type"
          value={formData.type}
          onChange={handleChange}
          placeholder="Type"
          options={TYPE_OPTIONS}
        />

        <SelectField
          name="language"
          value={formData.language}
          onChange={handleChange}
          placeholder="Language"
          options={LANGUAGE_OPTIONS}
        />

        <SelectField
          name="frequency"
          value={formData.frequency}
          onChange={handleChange}
          placeholder="Frequency"
          options={FREQUENCY_OPTIONS}
        />
      </div>

      {/* Title + Rating */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3">
          <Input
            name="courseTitle"
            placeholder="Course Title"
            value={formData.courseTitle}
            onChange={handleChange}
          />
        </div>

        <Input
          name="rating"
          placeholder="Rating"
          value={formData.rating}
          onChange={handleChange}
        />
      </div>

      {/* Objective */}
      <Input
        name="objective"
        placeholder="Objective"
        value={formData.objective}
        onChange={handleChange}
      />

      {/* Description */}
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        rows={5}
        className="w-full border rounded-md px-3 py-3 text-sm resize-none"
      />

      {/* Modules + Tags + Price */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SelectField
          name="modules"
          value={formData.modules}
          onChange={handleChange}
          placeholder="Modules"
          options={MODULE_OPTIONS}
        />

        <Input
          name="courseTags"
          placeholder="Course Tags"
          value={formData.courseTags}
          onChange={handleChange}
        />

        <Input
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

interface SelectFieldProps {
  name: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
}

function SelectField({
  name,
  value,
  placeholder,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border rounded-md px-3 py-2 text-sm text-gray-600 bg-white"
    >
      <option value="">
        {placeholder}
      </option>

      {options.map((option) => (
        <option
          key={option}
          value={option}
        >
          {option}
        </option>
      ))}
    </select>
  );
}